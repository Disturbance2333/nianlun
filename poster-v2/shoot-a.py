# -*- coding: utf-8 -*-
"""Shoot cover A at 1x/2x and prove nothing overflows its 315x175 box."""
import asyncio
import re
import sys

sys.path.insert(0, r"C:\Users\disturbance2333\Desktop\bilibili-crawler")
from playwright.async_api import async_playwright  # noqa: E402

DIR = "F:/work palce/poster-v2"
PAGE = f"file:///{DIR}/poster-a.html"

MEASURE = """() => {
  const p = document.querySelector('.poster');
  const pr = p.getBoundingClientRect();
  const kids = [...p.children].map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: el.className, top: +(r.top - pr.top).toFixed(1),
             bottom: +(r.bottom - pr.top).toFixed(1), h: +r.height.toFixed(1) };
  });
  const s = getComputedStyle(p);
  return { w: pr.width, h: pr.height,
           scrollH: p.scrollHeight, clientH: p.clientHeight,
           padT: s.paddingTop, padB: s.paddingBottom, kids };
}"""

CHECK = """() => {
  const h = document.documentElement.innerHTML;
  const rules = {};
  rules['无渐变'] = !/gradient/.test(h);
  rules['无 emoji 图标'] = !/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(h);
  rules['无 border-left accent'] = !/border-left/.test(h);
  rules['无 box-shadow'] = (h.match(/box-shadow/g) || []).length === 0;
  rules['无 border-radius'] = (h.match(/border-radius/g) || []).length === 0;
  rules['系统字'] = /system-ui/.test(getComputedStyle(document.querySelector('.poster')).fontFamily);
  const sheet = [...document.styleSheets[0].cssRules].map(r => r.cssText).join('\\n');
  const tokens = [...new Set((sheet.match(/--(bg|ink|muted|rule|accent):/g) || []))];
  rules['令牌 = 5'] = tokens.length === 5;
  const body = document.querySelector('style').textContent.replace(/:root\\{[^}]*\\}/, '');
  const stray = [...new Set((body.match(/#[0-9a-fA-F]{6}/g) || []))];
  rules['令牌块外无 hex'] = stray.length === 0;
  rules['有放大镜'] = /class="mag"/.test(h);
  rules['有光标'] = /class="cursor"/.test(h);
  rules['有输入插入符'] = /class="caret"/.test(h);
  const sizes = new Set([...sheet.matchAll(/font-size:\\s*(\\d+(?:\\.\\d+)?)px/g)].map(m => m[1]));
  rules['字阶 ' + sizes.size + ' 档'] = sizes.size >= 3 && sizes.size <= 6;
  return { rules, stray, sizes: [...sizes].sort((a, b) => b - a) };
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await b.new_page(viewport={"width": 700, "height": 400})
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(PAGE)
        await page.wait_for_timeout(300)

        m = await page.evaluate(MEASURE)
        print(f"poster {m['w']}x{m['h']}  scrollH={m['scrollH']} clientH={m['clientH']}  "
              f"pad {m['padT']}/{m['padB']}")
        worst = 0
        for k in m["kids"]:
            flag = "  <-- OVERFLOW" if k["bottom"] > m["h"] + 0.01 else ""
            worst = max(worst, k["bottom"])
            print(f"  {k['cls'][:12]:<12} top={k['top']:>6} bottom={k['bottom']:>6} h={k['h']:>5}{flag}")
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
            await pg.wait_for_timeout(250)
            el = await pg.query_selector(".poster")
            await el.screenshot(path=f"{DIR}/cover-a-{tag}.png")
            await pg.close()
        print("shot cover-a-1x.png / cover-a-2x.png")
        await b.close()


asyncio.run(main())
