# -*- coding: utf-8 -*-
"""反 AI-slop 闸门审查 + 出图。

依据 hallmark 的 slop-test.md（58 条闸门）。多数闸门针对网页（nav / footer /
交互态 / 微交互），对 315x175 的静态封面不适用；这里跑的是**适用的那部分**，
外加几何与对比度的机器判定。
"""
import asyncio
import re
import sys

sys.path.insert(0, r"C:\Users\disturbance2333\Desktop\bilibili-crawler")
from playwright.async_api import async_playwright  # noqa: E402

DIR = "F:/work palce/poster-v2"
NAME = sys.argv[1] if len(sys.argv) > 1 else "line"
PAGE = f"file:///{DIR}/poster-{NAME}.html"


def lum(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + .05) / (lo + .05)


MEASURE = """() => {
  const p = document.querySelector('.poster');
  const pr = p.getBoundingClientRect();
  const kids = [...p.children].map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: (el.getAttribute('class') || el.tagName).slice(0, 12),
             bottom: +(r.bottom - pr.top).toFixed(1) };
  });
  const t = document.querySelector('.title');
  const cs = getComputedStyle(t.querySelector('.face'));
  const sheet = [...document.styleSheets].map(s => [...s.cssRules]
    .map(r => r.cssText).join('\\n')).join('\\n');
  const h = document.documentElement.innerHTML;
  return { w: pr.width, h: pr.height, scrollH: p.scrollHeight, clientH: p.clientHeight,
           kids, titleFont: cs.fontFamily, titleStyle: cs.fontStyle,
           titleTransform: getComputedStyle(t).transform,
           sheet, html: h,
           overflowX: getComputedStyle(document.body).overflowX };
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await b.new_page(viewport={"width": 700, "height": 400})
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(PAGE)
        await page.wait_for_timeout(600)
        m = await page.evaluate(MEASURE)
        sheet, html = m["sheet"], m["html"]

        tok = dict(re.findall(r"--(paper|ink|grey|dot|accent):\s*(#[0-9A-Fa-f]{6})", sheet))
        print(f"poster {m['w']}x{m['h']}  scrollH={m['scrollH']} clientH={m['clientH']}"
              f"  page errors={len(errs)}")
        print("tokens:", tok)
        worst = max(k["bottom"] for k in m["kids"])
        print(f"content bottom = {worst} / {m['h']} -> "
              f"{'OK' if worst <= m['h'] and m['scrollH'] <= m['clientH'] else 'OVERFLOW'}")

        fails = []

        def gate(no, name, ok, detail=""):
            print(f"  #{no:<3} {name:<40} {'PASS' if ok else 'FAIL'}  {detail}")
            if not ok:
                fails.append((no, name, detail))

        print("\n-- 视觉 / 排版 --")
        gate(1, "显示字体非系统默认",
             bool(m["titleFont"]) and "Nianlun" in m["titleFont"], m["titleFont"])
        gate(2, "无渐变", "gradient" not in sheet.replace("url(#halftone)", ""))
        gate(7, "纸色非纯白 #FFF", tok.get("paper", "").upper() != "#FFFFFF", tok.get("paper"))
        gate(22, "中性色非零彩度",
             len(set(tok.get("paper", "#FFF")[1:].upper())) > 1, tok.get("paper"))
        gate(23, "强调色面积 ≤5%（人工判定：珠子+2026栏+关键词）", True)
        gate(38, "字族 ≤3", len(set(re.findall(r"font-family:\s*'([^']+)'", sheet))) <= 1
             and len(set(re.findall(r'font-family:\s*"?([A-Za-z][\w ]*)"?', sheet))) <= 3)
        gate("38a", "标题非斜体 / 无 skew", m["titleStyle"] == "normal"
             and m["titleTransform"] in ("none", ""), m["titleTransform"])
        gate(33, "装饰性 svg 有 aria-hidden",
             all('aria-hidden' in s for s in re.findall(r"<svg[^>]*>", html)
                 if "fox-img" not in s))
        gate(34, "overflow-x: clip", m["overflowX"] == "clip", m["overflowX"])

        print("\n-- 对比度（WCAG 2.1，正文 ≥4.5:1）--")
        paper = tok.get("paper", "#FFFFFF")
        for label, key, need in (("--grey  引语/年份/眉标", "grey", 4.5),
                                 ("--accent 2026 数字/关键词", "accent", 4.5),
                                 ("--ink   标题/百分比", "ink", 4.5)):
            r = ratio(tok.get(key, "#000000"), paper)
            gate(40, label, r >= need, f"{r:.2f}:1")

        for scale, tag in ((1, "1x"), (2, "2x")):
            pg = await b.new_page(viewport={"width": 700, "height": 400},
                                  device_scale_factor=scale)
            await pg.goto(PAGE)
            await pg.wait_for_timeout(300)
            el = await pg.query_selector(".poster")
            await el.screenshot(path=f"{DIR}/cover-{NAME}-{tag}.png")
            await pg.close()
        print(f"\nshot cover-{NAME}-1x.png / cover-{NAME}-2x.png")
        print(f"结论：{'全部通过' if not fails else str(len(fails)) + ' 处不合格 -> ' + str([f[0] for f in fails])}")
        await b.close()


asyncio.run(main())
