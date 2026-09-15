# -*- coding: utf-8 -*-
"""Measure + anti-slop check for the line-art cover (315x175)."""
import asyncio
import sys

sys.path.insert(0, r"C:\Users\disturbance2333\Desktop\bilibili-crawler")
from playwright.async_api import async_playwright  # noqa: E402

DIR = "F:/work palce/poster-v2"
NAME = sys.argv[1] if len(sys.argv) > 1 else "line"
PAGE = f"file:///{DIR}/poster-{NAME}.html"

MEASURE = """() => {
  const p = document.querySelector('.poster');
  const pr = p.getBoundingClientRect();
  const kids = [...p.children].map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: (el.getAttribute('class') || el.tagName).slice(0, 14),
             top: +(r.top - pr.top).toFixed(1),
             bottom: +(r.bottom - pr.top).toFixed(1), h: +r.height.toFixed(1) };
  });
  const top = document.querySelector('.top');
  const tr = top.getBoundingClientRect();
  const sub = [...top.children].map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: (el.getAttribute('class') || el.tagName).slice(0, 14),
             h: +r.height.toFixed(1) };
  });
  return { w: pr.width, h: pr.height,
           scrollH: p.scrollHeight, clientH: p.clientHeight,
           topH: +tr.height.toFixed(1), kids, sub };
}"""

CHECK = """() => {
  const h = document.documentElement.innerHTML;
  const sheet = [...document.styleSheets].map(s => [...s.cssRules]
    .map(r => r.cssText).join('\\n')).join('\\n');
  const rules = {};
  rules['无 CSS 渐变'] = !/gradient/.test(sheet.replace(/url\\(#halftone\\)/g, ''));
  rules['无 emoji/符号当图标'] =
    !/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}]/u.test(h);
  rules['无 box-shadow'] = (h.match(/box-shadow/g) || []).length === 0;
  const tokens = [...new Set((sheet.match(/--(paper|ink|grey|dot|accent):/g) || []))];
  rules['令牌 = 5'] = tokens.length === 5;
  const body = sheet.replace(/:root\\s*\\{[^}]*\\}/, '');
  const stray = [...new Set((body.match(/#[0-9a-fA-F]{6}\\b/g) || []))];
  rules['令牌块外零 hex'] = stray.length === 0;
  rules['有放大镜'] = /class="mag"/.test(h);
  rules['有光标'] = /class="cursor"/.test(h);
  rules['有插入符'] = /class="caret"/.test(h);
  rules['有刘看山主体'] = /class="fox-(svg|img)"/.test(h);
  rules['有手绘虚线'] = /stroke-dasharray/.test(h);
  rules['有半调网点'] = /pattern id="halftone"/.test(h);
  rules['有沙漏矢量(MIT)'] = /class="hg"/.test(h);
  const sizes = new Set([...sheet.matchAll(/font-size:\\s*([\\d.]+)px/g)].map(m => m[1]));
  rules['字阶 ' + sizes.size + ' 档'] = sizes.size >= 4 && sizes.size <= 7;
  return { rules, stray, sizes: [...sizes].sort((a, b) => b - a) };
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await b.new_page(viewport={"width": 700, "height": 400})
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(PAGE)
        await page.wait_for_timeout(400)

        m = await page.evaluate(MEASURE)
        print(f"poster {m['w']}x{m['h']}  scrollH={m['scrollH']} clientH={m['clientH']}")
        worst = 0
        for k in m["kids"]:
            flag = "  <-- OVERFLOW" if k["bottom"] > m["h"] + 0.01 else ""
            worst = max(worst, k["bottom"])
            print(f"  {k['cls']:<14} top={k['top']:>6} bottom={k['bottom']:>6} h={k['h']:>6}{flag}")
        print(f"  .top 内部: " + ", ".join(f"{s['cls']}={s['h']}" for s in m["sub"]))
        print(f"content bottom = {worst:.1f} / {m['h']}  -> "
              f"{'OK' if worst <= m['h'] and m['scrollH'] <= m['clientH'] else 'OVERFLOW'}")
        print("page errors:", errs or 0)

        c = await page.evaluate(CHECK)
        for k, v in c["rules"].items():
            print(f"  {k:<22} {'PASS' if v else 'FAIL'}")
        print("  stray hex:", c["stray"] or "none", "| type scale:", c["sizes"])

        for scale, tag in ((1, "1x"), (2, "2x")):
            pg = await b.new_page(viewport={"width": 700, "height": 400},
                                  device_scale_factor=scale)
            await pg.goto(PAGE)
            await pg.wait_for_timeout(300)
            el = await pg.query_selector(".poster")
            await el.screenshot(path=f"{DIR}/cover-{NAME}-{tag}.png")
            await pg.close()
        print(f"shot cover-{NAME}-1x.png / cover-{NAME}-2x.png")
        await b.close()


asyncio.run(main())
