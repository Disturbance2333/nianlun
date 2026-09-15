# -*- coding: utf-8 -*-
"""
观念年轮 · 服务端
------------------------------------------------------------------
职责：把一句「你信以为真的话」变成一圈按年份排开的知乎原文。

设计约束（沿用 poster-v2 的既有判据，不另起一套）：
  1. 不编造。总结句一律从原文里抽，不做生成式改写。
     依据：blader/humanizer「不许添加来源没有的事实或引语」是工作准则，
     高于「要具体」这条风格偏好。封面当初就是按这条把引语泛化掉的。
  2. 不只给说对的人。检索时同时投正反两向的查询词，
     让同一年里支持与质疑的回答都有机会进池子。
  3. 立场判断是启发式，前端必须标明，不许当统计结论卖。

AI（09-15 接的，见 ai.py）：接的是一个独立的 OpenAI 兼容端点，
**不再依赖本机任何东西**，所以这个目录可以整体拷到服务器上跑。
模型只做两件事，都不产出要展示的文本：
  /api/parse  判断用户输入是断言/话题/疑问/垃圾，非断言时给几句改写好的检索说法
  /api/picks  在各年的候选句里挑一句，**只返回下标**，句子本体仍是知乎原文

接口：
  GET /api/health          部署自检（AI 通不通、CLI 在不在、缓存几条）
  GET /api/rings?q=        年轮数据（启发式抽句，秒回）
  GET /api/parse?q=        AI 判断输入形态
  GET /api/picks?q=        AI 挑句，前端拿到后原地替换摘要

部署（环境变量，都有默认值）：
  HOST / PORT              绑定地址与端口（默认 127.0.0.1:8765）
  ZHIHU_CLI                知乎 CLI 的路径
  AI_BASE_URL / AI_MODEL / AI_API_KEY
     密钥优先读环境变量；没有则读**项目根**的 .ai_key 文件
     （放在项目根而不是 nianlun-web/，因为这个目录是被静态 serve 出去的）
"""
import json
import subprocess
import datetime
import collections
import re
import os
import sys
import time
import hashlib
import threading
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

import ai

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "cache")
AICACHE = os.path.join(CACHE, "_ai")
os.makedirs(CACHE, exist_ok=True)
os.makedirs(AICACHE, exist_ok=True)

# 独立部署时这些都从环境变量来，不写死在代码里
CLI = os.environ.get("ZHIHU_CLI") or \
    r"F:\zhhu\kanshan-workbench\resources\cli-bundle\zhihu\current\zhihu-cli.exe"
HOST = os.environ.get("HOST") or "127.0.0.1"
PORT = int(os.environ.get("PORT") or 8765)

# ── 0. 节流 ─────────────────────────────────────────────────────
# 09-15 重新量过，结论跟当初不一样，这里改掉：
#
#   当初踩的坑是「15 条查询**并发**打出去 → Code 30001」，于是加了 1.2s 间隔。
#   但限流卡的是**并发**，不是串行速率。实测 15 条一条接一条打出去：
#       间隔 0.0s → 11.9s，15/15 成功，零 30001
#       间隔 0.3s → 15.5s，15/15
#       间隔 1.2s → 28.1s，15/15
#   也就是说 1.2s 是白白 sleep 掉的 —— 占整条扇出 60% 的时间。
#
#   配合下面几点，并发仍然是安全的：
#     - _pace() 的锁是**全局**的，连多个用户同时查也只会有 1 条 CLI 调用在飞；
#     - 真的撞上 30001 仍然立刻收手、不重试
#       （知乎 Skill 的错误处理明确要求：配额受限时停止重复调用）。
GAP = 0.15         # 两次调用之间的最小间隔，只作兜底
_last = [0.0]
_lock = threading.Lock()


class RateLimited(Exception):
    """撞到配额上限。调用方应当立刻停止扇出，改用缓存。"""


def _pace():
    with _lock:
        wait = GAP - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()


# ── 1. 检索层 ────────────────────────────────────────────────────
# 知乎搜索单次上限 10 条，且默认强烈偏向近期内容（实测 49 条里 40 条落在当年）。
# 所以不能只发一条查询就画时间轴 —— 那画出来的是「今年的横截面」，不是年轮。
# 做法：把一句话扇出成多条查询，分三组投出去再合并去重。

YEAR_PROBES = ["2015年", "2016年", "2018年", "2020年", "2022年", "2024年"]

# 反向词：逼出「唱反调的那一半」。没有这组词，池子会一边倒。
CONTRA = [
    "{q} 是错的",
    "不认同 {q}",
    "{q} 有什么问题",
    "为什么 {q} 不成立",
]

# 正向与回顾词：找源头和当年的拥护者
PRO = [
    "{q}",
    "{q} 为什么",
    "当年 {q}",
    "十年前 {q} 现在",
    "最早提出 {q}",
]


def run_cli(query, count=10, timeout=90):
    """调一次知乎搜索。

    返回 items 列表；撞到配额上限时抛 RateLimited，让上层整体降级。
    其余异常一律吞掉返回空 —— 扇出里挂一条不该拖垮整次请求。
    """
    _pace()
    try:
        r = subprocess.run(
            [CLI, "search", "zhihu", "--query", query, "--count", str(count)],
            capture_output=True, text=True, encoding="utf-8",
            timeout=timeout,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        data = json.loads(r.stdout)
        code = data.get("Code")
        if code == 30001:
            raise RateLimited(data.get("Message") or "rate limit exceeded")
        if code != 0:
            return []
        return (data.get("Data") or {}).get("Items") or []
    except RateLimited:
        raise
    except Exception:
        return []


def build_queries(q):
    qs = [t.format(q=q) for t in PRO]
    qs += [t.format(q=q) for t in CONTRA]
    qs += ["{} {}".format(y, q) for y in YEAR_PROBES]
    # 去重但保序
    seen, out = set(), []
    for x in qs:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def cache_path(q):
    safe = re.sub(r'[\\/:*?"<>|]', "_", q)[:60]
    return os.path.join(CACHE, safe + ".json")


def load_cache(q):
    p = cache_path(q)
    if os.path.exists(p):
        try:
            with open(p, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def save_cache(q, items):
    try:
        with open(cache_path(q), "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False)
    except Exception:
        pass


def gather(q, prefer_cache=True):
    """扇出检索，按 ContentID 去重。

    先看缓存：这个页面是给人当场用的，让人干等几十秒去凑一次
    可能还撞限流的实时检索，不如直接拿此前真查回来的结果。
    缓存里的每一条都是知乎原始返回，不是编的。

    四种结果：
      ("cache",  items)  命中缓存，直接给
      ("live",   items)  全查完了
      ("partial",items)  中途撞限流，手里这些是真的，就用这些
      ("limited"/"empty", [])
    """
    cached = load_cache(q)
    if cached and prefer_cache:
        return "cache", cached

    pool = {}
    limited = False
    for query in build_queries(q):
        try:
            items = run_cli(query)
        except RateLimited:
            limited = True
            break
        for it in items:
            cid = it.get("ContentID")
            if cid and cid not in pool:
                pool[cid] = it

    if pool:
        merged = pool
        # 缓存里的旧结果一并并进来，越积越全
        if cached:
            for it in cached:
                cid = it.get("ContentID")
                if cid and cid not in merged:
                    merged[cid] = it
        items = list(merged.values())
        save_cache(q, items)
        return ("partial" if limited else "live"), items

    if cached:
        return "cache", cached
    return ("limited" if limited else "empty"), []


# ── 2. 立场判断（启发式，前端会标明） ────────────────────────────
# 不做情感模型。只数关键词，并且把判定依据一并返回，让人能自己复核。
NEG = ["不值得", "后悔", "泡沫", "别买", "不要买", "是错的", "骗局", "崩", "跌",
       "不建议", "陷阱", "韭菜", "神话", "幻觉", "不成立", "没必要", "不应该", "警惕"]
POS = ["值得", "趁早", "果断", "一定要", "最好的", "受益", "庆幸", "幸亏",
       "建议买", "刚需", "保值", "稳赚", "该买", "抓紧"]


def stance(text):
    t = text or ""
    n = sum(t.count(w) for w in NEG)
    p = sum(t.count(w) for w in POS)
    if n > p * 1.4 and n >= 2:
        return "doubt"
    if p > n * 1.4 and p >= 2:
        return "believe"
    return "mixed"


# ── 3. 抽句：50 字以内，取自原文 ─────────────────────────────────
# 不生成、不改写、不拼接。整句抽取，抽不到合规长度就退回截断并标记。
SPLIT = re.compile(r"[。！？!?\n]")

# 哪些字不算实词 —— 用来把「买房是最好的投资」切成
# 买房 / 最好 / 投资 这种真正有信息量的 2-gram
_STOP = set("的了吗呢吧啊是不我你他她它这那有就都也很和与及在会要能对把被让给从到个种些么什怎为以于之其")

# 明显的正文骨架句 / 场面话，不配当摘要
_BONES = ("第一", "第二", "第三", "首先", "其次", "最后", "如上", "综上",
          "大家好", "谢邀", "以下是", "更新")


def query_terms(q):
    """把查询切成关键词：英文数字按词，中文按 2-gram 去掉含虚词的。

    这是**启发式兜底**。AI 可用时由 AI 挑得更准（见 ai.pick_summaries），
    AI 不可用就靠它 —— 实测它已经能挡掉「希望表哥……」那种句子，
    因为那类句子跟查询零命中（这正是原来抽歪的根因）。"""
    q = (q or "").strip()
    out = set()
    for w in re.findall(r"[A-Za-z0-9]+", q):
        if len(w) >= 2:
            out.add(w.lower())
    han = re.sub(r"[^\u4e00-\u9fff]", "", q)
    for i in range(len(han) - 1):
        g = han[i:i + 2]
        if g[0] in _STOP or g[1] in _STOP:
            continue
        out.add(g)
    return out


def score_sentence(s, terms):
    return sum(1 for t in terms if t in s) if terms else 0


def pick_sentence(text, limit=50):
    """只按长度抽一句。用在文章列表的摘录那种次要位置。"""
    if not text:
        return "", False
    for raw in SPLIT.split(text):
        s = raw.strip().strip("　 \t")
        if not s:
            continue
        # 太短的多半是小标题或残句；太长的放不进卡片
        if 12 <= len(s) <= limit:
            if s.startswith(_BONES):
                continue
            return s, True
    # 没有恰好合规的整句：截断最长的那句，并告诉前端这是截断
    cand = max((x.strip() for x in SPLIT.split(text)), key=len, default="")
    return cand[:limit], False


def year_candidates(group, terms, limit=5):
    """把这一年切成一池候选句，按「命中查询词数 → 点赞数」排。

    返回 [(句子, 回答对象), ...]，最多 limit 条。排在 0 位的就是启发式
    认为最该被摘出来的那句。AI 可用时再由 AI 在这个池子里挑（只返回下标），
    所以在架构上模型碰不到句子本体，不可能编造引语。"""
    rows = []
    for g in group[:12]:                      # 只看当年最靠前的若干条
        text = g.get("ContentText") or ""
        for raw in SPLIT.split(text):
            s = raw.strip().strip("　 \t")
            if not (12 <= len(s) <= 60):
                continue
            if s.startswith(_BONES):
                continue
            rows.append((score_sentence(s, terms), g.get("VoteUpCount") or 0, s, g))

    seen, uniq = set(), []
    for r in rows:
        if r[2] in seen:
            continue
        seen.add(r[2])
        uniq.append(r)
    uniq.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return [(r[2], r[3]) for r in uniq[:limit]]


def year_of(item):
    ts = item.get("EditTime") or 0
    if not ts:
        return None
    try:
        return datetime.datetime.fromtimestamp(ts).year
    except Exception:
        return None


# 「跟查询本身太像」的标题没意义 —— 点了还是同一个搜索
_TITLE_NOISE = re.compile(r"[\s,，。.！!？?、·「」“”\"'‘’()（）]")


def related_titles(items, q, limit=6):
    """从这一批结果里挑几条高赞标题，当「换个说法再查」的候选。

    **这是不靠 AI 的做法**：标题是知乎上真实存在的说法，原样摆出来，
    不改写、不生成 —— 也就不可能编造。而且它比让模型凭旧知识猜更贴语料：
    模型不知道这次到底捞回来了什么，语料知道。

    零新增请求：用的就是 ring 搜索已经拿回来的那批条目。"""
    qkey = _TITLE_NOISE.sub("", (q or "").strip())
    seen, out = set(), []
    for it in sorted(items, key=lambda x: x.get("VoteUpCount") or 0, reverse=True):
        t = (it.get("Title") or "").replace(" - 知乎", "").strip()
        if len(t) < 6:
            continue
        key = _TITLE_NOISE.sub("", t)
        if not key or key == qkey or key in seen:
            continue
        seen.add(key)
        out.append({
            "title": t,
            "votes": it.get("VoteUpCount") or 0,
            "url": it.get("Url"),
        })
        if len(out) >= limit:
            break
    return out


def analyze(q):
    """聚合 + 抽句。返回 (给前端的 payload, {年份: [(句, 回答), ...]})。

    候选池一并返回，是因为 /api/picks 要拿它给 AI 编号挑句 ——
    分开算的话同一套切句逻辑要跑两遍。"""
    source, items = gather(q)
    terms = query_terms(q)
    buckets = collections.defaultdict(list)
    for it in items:
        y = year_of(it)
        if y:
            buckets[y].append(it)

    rings, cands = [], {}
    for y in sorted(buckets):
        group = sorted(buckets[y], key=lambda x: x.get("VoteUpCount") or 0, reverse=True)
        pool = year_candidates(group, terms)
        cands[y] = pool

        if pool:
            line, top = pool[0]
            exact = True
        else:
            # 这一年切不出任何像样的句子：退回老办法，并照实标记
            top = group[0]
            line, exact = pick_sentence(top.get("ContentText"))

        counts = collections.Counter(stance(g.get("ContentText")) for g in group)
        answers = []
        for g in group[:8]:
            excerpt, _ = pick_sentence(g.get("ContentText"), 80)
            answers.append({
                "title": g.get("Title", "").replace(" - 知乎", ""),
                "author": g.get("AuthorName") or "匿名",
                "votes": g.get("VoteUpCount") or 0,
                "comments": g.get("CommentCount") or 0,
                "url": g.get("Url"),
                "excerpt": excerpt,
                "stance": stance(g.get("ContentText")),
                "type": "回答" if g.get("ContentType") == "Answer" else "文章",
            })
        rings.append({
            "year": y,
            "count": len(group),
            "summary": line,
            "summary_is_quote": exact,
            "summary_is_ai": False,      # /api/picks 回来后前端改这个标记
            "summary_from": top.get("AuthorName") or "匿名",
            "summary_url": top.get("Url"),
            "believe": counts.get("believe", 0),
            "doubt": counts.get("doubt", 0),
            "mixed": counts.get("mixed", 0),
            "answers": answers,
        })

    return {
        "query": q,
        "total": len(items),
        "source": source,
        "span": [rings[0]["year"], rings[-1]["year"]] if rings else None,
        # 「换个说法再查」的候选：语料里真实存在的高赞标题，不是生成的
        "related": related_titles(items, q),
        "rings": rings,
    }, cands


def build_rings(q):
    return analyze(q)[0]


# ── 3b. AI 层：挑句（只返回下标）与输入归一化 ────────────────────
# 两边都落盘缓存。AI 一次调用要 5–40 秒，不缓存的话每次刷新都白等一遍。
def _ai_cache_path(kind, q):
    key = hashlib.sha1((kind + "|" + q).encode("utf-8")).hexdigest()[:16]
    return os.path.join(AICACHE, kind + "-" + key + ".json")


def _ai_cache_get(kind, q):
    p = _ai_cache_path(kind, q)
    if os.path.exists(p):
        try:
            with open(p, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def _ai_cache_put(kind, q, obj):
    try:
        with open(_ai_cache_path(kind, q), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False)
    except Exception:
        pass


# AI 请求**不在 HTTP 线程里等**。实测这个端点能从 5 秒抖到 4 分钟，
# 挂在请求上等的话：反代/浏览器把连接掐断、服务线程被占住、用户白等一场。
# 改成：起后台任务 → 立刻返回 pending → 前端轮询 → 结果落盘缓存。
# 同一个 (kind, q) 只会有一份在跑；一分钟内失败过就不重复试。
_jobs = set()
_recent = {}
_jobs_lock = threading.Lock()
PENDING = {"ok": False, "pending": True}


def _bg(key, work):
    """起一个后台任务。已经在跑、或一分钟内刚试过，就什么都不做。"""
    now = time.time()
    with _jobs_lock:
        if key in _jobs or now - _recent.get(key, 0) < 60:
            return False
        _jobs.add(key)
        _recent[key] = now

    def run():
        try:
            work()
        except Exception:
            pass
        finally:
            with _jobs_lock:
                _jobs.discard(key)

    threading.Thread(target=run, daemon=True).start()
    return True


def _do_parse(q):
    d = ai.parse_input(q)
    if d:
        # 只存分类结果。候选说法不在这儿生成 —— 用的是语料里的真实标题
        # （analyze() 里的 related），见 ai.parse_input 上面的说明。
        _ai_cache_put("parse", q, {"ok": True, "kind": d["kind"]})


# ── 3c. 输入推荐：只发一条搜索 ───────────────────────────────────
# 「输入关键词 → 几秒内出推荐」之所以能做到，是因为它**只发一条**搜索
# 调用（0.76s），而不是 /api/rings 那 15 条扇出（13s）。
# 返回的候选就是知乎给出的真实标题，原样照搬、不改写、不生成 ——
# 跟 /api/rings 的 related、/api/picks 的下标是同一条判据。
SUGDIR = os.path.join(CACHE, "_sug")
os.makedirs(SUGDIR, exist_ok=True)


def _sug_path(q):
    return os.path.join(SUGDIR, hashlib.sha1(q.encode("utf-8")).hexdigest()[:16] + ".json")


def build_suggest(q, limit=8):
    p = _sug_path(q)
    if os.path.exists(p):
        try:
            with open(p, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    # 这个词要是整条搜过，直接用语料，一次调用都不用发
    cached = load_cache(q)
    if cached:
        res = {"ok": True, "q": q, "from": "cache",
               "items": related_titles(cached, q, limit)}
        _write_json(p, res)
        return res

    try:
        items = run_cli(q, count=10)
    except RateLimited:
        return {"ok": False, "reason": "limited", "items": []}

    res = {"ok": True, "q": q, "from": "live",
           "items": related_titles(items, q, limit)}
    if res["items"]:                      # 空结果不落盘，免得把一次抖动固化下来
        _write_json(p, res)
    return res


def _write_json(path, obj):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False)
    except Exception:
        pass


def build_parse(q):
    """判断用户输入是什么，必要时给几句可检索的改写。

    首次调用返回 {pending:true}，结果好之后由前端再来取（那时走缓存，秒回）。"""
    hit = _ai_cache_get("parse", q)
    if hit is not None:
        return hit
    if not ai.available():
        return {"ok": False, "reason": "no_key"}
    _bg(("parse", q), lambda: _do_parse(q))
    return dict(PENDING)


def _do_picks(q):
    _payload, cands = analyze(q)
    per_year = {str(y): [s for s, _ in pool] for y, pool in (cands or {}).items() if pool}
    if not per_year:
        return
    picked = ai.pick_summaries(q, per_year)
    if not picked:
        return
    out = {}
    for y, info in picked.items():
        pool = cands.get(int(y))
        if not pool or info["i"] < 0:
            continue
        s, item = pool[info["i"]]
        out[y] = {
            "summary": s,                       # 句子仍是知乎原文，只是换了一句
            "summary_from": item.get("AuthorName") or "匿名",
            "summary_url": item.get("Url"),
        }
    _ai_cache_put("picks", q, {"ok": True, "ai": True, "picks": out})


def build_picks(q):
    """让 AI 在各年的候选池里挑一句。同样先 pending、后走缓存。"""
    hit = _ai_cache_get("picks", q)
    if hit is not None:
        return hit
    if not ai.available():
        return {"ok": False, "reason": "no_key", "picks": {}}
    _bg(("picks", q), lambda: _do_picks(q))
    return dict(PENDING)


def warm(q):
    """同步把 AI 两步跑完并落盘。给 warm_ai.py 用。

    为什么要预热：这个端点实测能从 7 秒抖到 120 秒，后台跑不挡人，
    但第一次访问终究拿不到 AI 结果。演示前把要用的那几句话跑一遍，
    之后每次都是 0.01 秒命中缓存。"""
    if not ai.available():
        return "no_key"
    out = []
    for kind, do in (("picks", _do_picks), ("parse", _do_parse)):
        if _ai_cache_get(kind, q) is None:
            do(q)
        out.append("%s=%s" % (kind, "hit" if _ai_cache_get(kind, q) else "miss"))
    return " ".join(out)


# ── 4. HTTP ─────────────────────────────────────────────────────
# 静态根是 nianlun-web/。这个目录里有不该被外面拿到的东西：
#   cache/       知乎原始返回（作者、链接、正文都在里面）
#   __pycache__  编译产物
#   任何 . 开头的文件
# 密钥已经放在**项目根**（不在静态根里）了，这里再拦一道兜底：万一以后
# 有人把密钥挪回来，也不至于能直接 http://站点/.ai_key 取走。
_BLOCKED_SEG = ("cache", "__pycache__")
_BLOCKED_SUFFIX = (".py", ".pyc", ".mjs", ".md")   # 服务端源码不用给外面看


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    def _blocked(self, path):
        if path.rstrip("/").endswith(_BLOCKED_SUFFIX):
            return True
        for seg in (p for p in path.split("/") if p):
            if seg.startswith(".") or seg in _BLOCKED_SEG:
                return True
        return False

    def _q(self, parsed):
        return (urllib.parse.parse_qs(parsed.query).get("q") or [""])[0].strip()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 部署自检：一眼看出 AI 通没通、知乎 CLI 在不在、缓存有几条
        if path == "/api/health":
            base, key, model = ai.config()
            self.send_json({
                "ok": True,
                "ai": bool(key),
                "model": model,
                "base": base,
                "zhihu_cli": os.path.exists(CLI),
                "cached": len([f for f in os.listdir(CACHE) if f.endswith(".json")]),
            })
            return

        if path in ("/api/rings", "/api/parse", "/api/picks", "/api/suggest"):
            q = self._q(parsed)
            if not q:
                self.send_json({"error": "empty query"}, 400)
                return
            fn = {"/api/rings": build_rings,
                  "/api/parse": build_parse,
                  "/api/picks": build_picks,
                  "/api/suggest": build_suggest}[path]
            try:
                self.send_json(fn(q))
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
            return

        if self._blocked(path):
            self.send_error(404)
            return
        return super().do_GET()

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    if len(sys.argv) > 1:          # 命令行参数优先
        PORT = int(sys.argv[1])
    print("观念年轮 · http://%s:%d" % (HOST, PORT))
    if ai.available():
        print("  AI: %s @ %s" % (ai.config()[2], ai.config()[0]))
    else:
        print("  [!] 没读到 AI_API_KEY —— /api/parse 与 /api/picks 会降级，"
              "启发式兜底照常工作")
    if not os.path.exists(CLI):
        print("  [!] 找不到知乎 CLI：%s" % CLI)
        print("      实时检索会失败，但 cache/ 里的存档照常可用")
    # 用 ThreadingHTTPServer：一次实时检索要串行跑十几条知乎查询、几十秒，
    # 单线程的 HTTPServer 会把整个站点堵住，连静态文件都发不出去。
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
