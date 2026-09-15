# -*- coding: utf-8 -*-
"""反 AI 味文案审查（判据来自 blader/humanizer + 维基百科《Signs of AI writing》）。

只检查可机器判定的结构 tell：
  §6 强制排比     句尾虚词重复 / 句首重复 / 句长几乎相等 / 句式单一
  Work 准则       不许出现需要出处的断言（数字、人名、日期、机构）
  §8 破折号       中文破折号 / 省略号 / 直引号
  §12 高频 AI 词  中文对应词表
  §16 销售语言    营销动词表

注意一处**有据的取舍**：用户的决定是不举具体事例，因此放弃 §6 的"具体性"偏好，
改为落实优先级更高的 Work 准则"不许添加来源没有的事实/引语"。风格上的反 AI 味
从"句式多样"补回来（四种言语行为），而不是从细节补。
"""
import re
import sys

# 与 poster-line.mjs 的 ROWS 一致
LINES = [
    ("2010", "“买了才安心”", 92),
    ("2016", "“一定要买吗？”", 58),
    ("2020", "“没有人说得准”", 41),
    ("2026", "“不买也行”", 23),
]

PARTICLES = "吗吧呢了呀嘛"
BANNED_WORDS = ["值得注意", "总而言之", "总的来说", "不仅", "而是", "标志着", "见证",
                "彰显", "赋能", "打造", "助力", "深耕", "闭环", "抓手", "生态位",
                "深刻的", "至关重要", "不可或缺", "焕发", "焕新", "诠释"]
SALES_WORDS = ["颠覆", "革新", "极致", "无缝", "一站式", "全方位", "赋能", "引领",
               "重塑", "解锁", "释放", "打造", "升级"]
# 需要出处的断言：数字 / 年份 / 人名或机构（用常见指代近似判定）
CLAIM_PAT = [r"\d", r"年|月|日", r"第[一二三四五六七八九十]", r"元|万|块"]

fails = []


def gate(name, ok, detail=""):
    print(f"  {name:<36} {'PASS' if ok else 'FAIL'}  {detail}")
    if not ok:
        fails.append(name)


texts = [t for _, t, _ in LINES]
bare = [re.sub(r"[“”「」，,。.？?！!]", "", t) for t in texts]

print("四句：")
for y, t, p in LINES:
    print(f"  {y}  {t:<14} {p}%   （{len(re.sub('“|”', '', t))} 字）")

print("\n-- §6 强制排比 --")
tails = [b[-1] for b in bare]
gate("句尾不重复（虚词≤1 句）",
     len([x for x in tails if x in PARTICLES]) <= 1, f"句尾: {tails}")
heads = [b[0] for b in bare]
gate("句首不重复", len(set(heads)) == len(heads), f"句首: {heads}")
lens = [len(b) for b in bare]
gate("句长有长短差（≥2）", max(lens) - min(lens) >= 2, f"长度: {lens}  [73px 栏宽@8px 把字数封在 4~6]")
varied = sum(1 for t in texts if ("，" in t or "？" in t or "?" in t))
gate("句式有变化（逗号/问号混合）", 0 < varied < len(texts),
     f"含逗号或问号: {varied}/{len(texts)}")

print("\n-- Work 准则：不含需出处的断言 --")
claim = [t for t in texts if any(re.search(p, t) for p in CLAIM_PAT)]
gate("无数字/年代/人名/金额", not claim, str(claim))

print("\n-- §8 标点 --")
gate("无破折号 / 省略号", not any(("——" in t or "…" in t or "..." in t) for t in texts))
gate("引号是中文弯引号", all(("“" in t and "”" in t) for t in texts))

print("\n-- §12 / §16 词表 --")
bw = [w for w in BANNED_WORDS if any(w in t for t in texts)]
gate("无高频 AI 词", not bw, str(bw))
sw = [w for w in SALES_WORDS if any(w in t for t in texts)]
gate("无销售语言", not sw, str(sw))

print(f"\n结论：{'全部通过' if not fails else str(len(fails)) + ' 处不合格 -> ' + str(fails)}")
sys.exit(0 if not fails else 1)
