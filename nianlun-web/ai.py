# -*- coding: utf-8 -*-
"""
观念年轮 · AI 层
──────────────────────────────────────────────────────────────────
独立部署用：不依赖任何本机 CLI / 本机环境，只走一个 OpenAI 兼容的
HTTP 端点。只用标准库（urllib），装到服务器上不需要 pip install。

配置优先级：环境变量 > 同项目根目录的密钥文件 > 内置默认值

    AI_BASE_URL   默认 https://api.openai-next.com/v1
    AI_MODEL      默认 deepseek-v4-flash
    AI_API_KEY    没有环境变量时，读 <项目根>/.ai_key 这个文件

两条硬规矩（沿用项目既有判据，不另起一套）：

 1. **模型只做「选择」和「判断」，不许「生成」要展示的内容。**
    挑句子时它返回的是候选句的**下标**，句子本体是知乎原文，
    模型碰不到，所以在架构上就不可能编造引语。
    只有「替用户改写的检索说法」是模型生成的 —— 那一栏在前端
    明确标成「我们替你改的说法」，不冒充原文。

 2. **任何一步失败都不许让整页垮掉。**
    所有函数失败时返回 None，调用方一律有启发式兜底。
"""
import json
import os
import re
import ssl
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)          # F:\work palce

DEFAULT_BASE = "https://api.openai-next.com/v1"
DEFAULT_MODEL = "deepseek-v4-flash"

_ctx = ssl.create_default_context()


# ── 配置 ────────────────────────────────────────────────────────
def _key_file():
    """密钥文件放在**项目根**，不在 nianlun-web/ 里。

    这不是洁癖：server.py 用 SimpleHTTPRequestHandler 把 nianlun-web/
    整个目录当静态根往外 serve，密钥文件要是放在那儿，
    任何人访问 http://站点/.ai_key 就能把 key 拿走。
    Handler 那边另外还有一道兜底拦截，见 server.py。"""
    return os.path.join(ROOT, ".ai_key")


def config():
    base = (os.environ.get("AI_BASE_URL") or DEFAULT_BASE).rstrip("/")
    model = os.environ.get("AI_MODEL") or DEFAULT_MODEL
    key = os.environ.get("AI_API_KEY") or ""
    if not key:
        try:
            with open(_key_file(), encoding="utf-8") as f:
                key = f.read().strip()
        except Exception:
            key = ""
    return base, key, model


def available():
    return bool(config()[1])


# ── 底层调用 ────────────────────────────────────────────────────
class AIError(Exception):
    pass


def chat(messages, max_tokens=800, temperature=0.2, timeout=75, tries=3):
    """跑一次对话补全。失败抛 AIError —— 调用方自己决定怎么兜底。"""
    base, key, model = config()
    if not key:
        raise AIError("没有配置 AI_API_KEY")

    body = json.dumps({
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }).encode("utf-8")
    headers = {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
        "User-Agent": "nianlun-web/1.0",
    }

    last = None
    for k in range(tries):
        req = urllib.request.Request(base + "/chat/completions", data=body,
                                     method="POST", headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=_ctx) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            return d["choices"][0]["message"]["content"].strip()
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:200]
            last = "HTTP %s %s" % (e.code, detail)
            # 4xx 是请求本身的问题（模型名写错、key 无效），重试没意义
            if 400 <= e.code < 500:
                break
        except Exception as e:
            last = "%s: %s" % (type(e).__name__, e)
        if k < tries - 1:
            time.sleep(1.5 * (k + 1))

    raise AIError(last or "未知错误")


_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.M)


def _json_out(text):
    """模型经常把 JSON 包在 ``` 里，或者前后带一句话。尽量捞出来。"""
    if not text:
        return None
    t = _FENCE.sub("", text).strip()
    try:
        return json.loads(t)
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", t)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None


# ── 用例一：判断用户输入属于哪一类 ──────────────────────────────
# **刻意不让模型改写、也不让它给候选说法。**
# 候选改用知乎语料里真实存在的标题（见 server.related_titles）：
# 模型凭旧知识猜出来的句子，跟这次实际捞回来的语料经常对不上
# （实测：对「张雪峰」它猜「张雪峰的观点有事实依据」，
#  而语料里高赞的全是「张雪峰到底靠不靠谱?」这类）。
# 真实标题不用生成、不用等模型、也不可能编造。
# 输出缩成一个词之后，延迟也跟着降下来。
PARSE_SYS = (
    "你在给一个「追踪某个说法的共识如何随时间变化」的工具做输入分流。"
    "用户输入可能是一句断言、一个话题、一个疑问句，也可能什么都不是。"
    "你只负责判断它属于哪一类，不做任何改写。"
)


def parse_input(q, timeout=30):
    """只判断输入属于哪一类。返回 {"kind": ...} 或 None（失败时）。"""
    prompt = (
        "用户输入：%s\n\n"
        "判断它属于哪一类，只输出 JSON，形如 {\"kind\":\"topic\"}\n\n"
        "  claim    —— 一个可判真假的断言，例如「买房是最好的投资」\n"
        "  topic    —— 只是话题 / 人名 / 名词，例如「张雪峰」「考研」\n"
        "  question —— 疑问句，例如「考研值得吗」\n"
        "  garbage  —— 没有可检索的主体，例如「哈哈哈哈」\n\n"
        "不要输出别的字段，不要解释，不要改写用户的话。"
    ) % q

    try:
        # max_tokens 只给 20：输出就是一个词。
        # tries=2：这个端点会偶发卡住，与其死等不如快速放弃 ——
        # 反正降级之后页面照常能用。
        out = chat([{"role": "system", "content": PARSE_SYS},
                    {"role": "user", "content": prompt}],
                   max_tokens=20, temperature=0, timeout=timeout, tries=2)
    except AIError:
        return None

    d = _json_out(out)
    if not isinstance(d, dict):
        # 模型偶尔只吐一个裸词，容错一下
        w = (out or "").strip().strip('"').lower()
        if w in ("claim", "topic", "question", "garbage"):
            return {"kind": w}
        return None
    kind = str(d.get("kind") or "").strip().lower()
    if kind not in ("claim", "topic", "question", "garbage"):
        return None
    return {"kind": kind}


# ── 用例二：从已有句子里挑出「那一年说得最直白的一句」 ──────────
PICK_SYS = (
    "你在给一条「按年份排列某个说法历年讨论」的时间轴挑句子。"
    "每年会给你几句候选（都是从当年知乎回答里切出来的整句）。"
    "你要为每一年挑出**最能代表当年讨论中对该说法所持立场、且最像一句观点**的那句。"
    "只按候选句的文字判断，不要补任何原文里没有的信息。"
)


def pick_summaries(query, per_year, timeout=60):
    """per_year: {"2016": ["句1","句2",...], ...}（已按重要性排好序）

    返回 {"2016": {"i": 1, "why": "..."}, ...} 或 None。
    i 是候选句下标；-1 表示这一年的候选全都没在谈这个说法。
    """
    years = list(per_year.keys())
    if not years:
        return None

    numbered = {}
    for y in years:
        numbered[y] = [{"i": i, "s": s} for i, s in enumerate(per_year[y])]

    prompt = (
        "用户查询的说法：「%s」\n\n"
        "下面是各年份的候选句。为每一年挑出最合适的那一句，"
        "只输出一个 JSON 对象，键是年份、值是选中的候选句下标：\n"
        '{"2016":0,"2017":2}\n\n'
        "规则：\n"
        "  下标从 0 开始。\n"
        "  优先挑**明确表了态**的句子（支持或反对都可以），"
        "个人感慨、家常话、客套话、纯叙述事实而不表态的都要往后排。\n"
        "  候选句本身是原文，你只返回下标，不要改写、不要拼接、不要新写句子。\n"
        "  若某年所有候选都完全没在谈这个说法，该年给 -1。\n"
        "  不要输出理由，不要 markdown 代码块。\n\n"
        "候选：\n%s"
    ) % (query, json.dumps(numbered, ensure_ascii=False))

    try:
        # max_tokens 只给 300：输出就是 11 个数字，给多了反而容易被带偏去写解释。
        # 实测带「理由」时这个请求能跑 240 秒以上，去掉后 5–8 秒。
        # 但端点偶发卡死（预热时见过一次 286 秒），所以 tries=2 快速放弃，
        # 失败就保持启发式结果 —— 别让一个后台任务烧掉五分钟。
        out = chat([{"role": "system", "content": PICK_SYS},
                    {"role": "user", "content": prompt}],
                   max_tokens=300, temperature=0.1, timeout=timeout, tries=2)
    except AIError:
        return None

    d = _json_out(out)
    if not isinstance(d, dict):
        return None

    res = {}
    for y in years:
        v = d.get(y)
        if isinstance(v, dict):          # 模型偶尔还是写成 {"i":0}
            v = v.get("i")
        try:
            i = int(v)
        except Exception:
            continue
        if -1 <= i < len(per_year[y]):
            res[y] = {"i": i}
    return res or None
