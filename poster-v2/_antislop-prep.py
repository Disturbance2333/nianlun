# -*- coding: utf-8 -*-
"""反 AI-slop 整改的准备工作：
1) 取一个非系统默认的中文显示字体，并用 Google Fonts 的 text= 只子集化「观念年轮」
2) 按 WCAG 2.1 算封面里每个前景/背景配对的对比度，找出不合格的灰和蓝
"""
import json
import re
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        raw = r.read()
    return raw if binary else raw.decode("utf-8")


# ---------- 1. 字体 ----------
print("== 字体 ==")
for fam, file in (("Noto+Serif+SC:wght@900", "TitleSerif.woff2"),):
    css = get(f"https://fonts.googleapis.com/css2?family={fam}"
              f"&text=%E8%A7%82%E5%BF%B5%E5%B9%B4%E8%BD%AE&display=swap")
    urls = re.findall(r"url\((https://[^)]+)\)", css)
    print(f"  {fam}: {len(urls)} 个 @font-face 资源"); print("  CSS 片段:", css[:300].replace("\n", " "))
    if urls:
        data = get(urls[0], binary=True)
        open(f"F:/work palce/poster-v2/{file}", "wb").write(data)
        print(f"  下载 {file}: {len(data)} bytes ({len(data)/1024:.1f} KB)")
    # 打印字体族名，方便核对
    fams = set(re.findall(r"font-family:\s*'([^']+)'", css))
    print("  font-family:", fams)


# ---------- 2. 对比度 ----------
def lum(hexs):
    h = hexs.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + .05) / (lo + .05)


print("\n== 对比度（WCAG 2.1，正文需 >=4.5:1）==")
PAPER = "#FFFFFF"
for name, fg in (("--grey #8B9199（引语/年份/眉标）", "#8B9199"),
                 ("--grey 加深候选 #6B7280", "#6B7280"),
                 ("--grey 加深候选 #6F7681", "#6F7681"),
                 ("--accent #0084FF（2026 数字）", "#0084FF"),
                 ("--accent 候选 #0B5FD0", "#0B5FD0"),
                 ("--accent 候选 #1266E3", "#1266E3"),
                 ("--accent 候选 #0F62D6", "#0F62D6"),
                 ("--ink #17191C", "#17191C")):
    r = ratio(fg, PAPER)
    print(f"  {name:<34} vs #FFF = {r:5.2f}:1  {'PASS' if r >= 4.5 else 'FAIL'}")
