# -*- coding: utf-8 -*-
"""Shoot the loader as it actually renders in a real window -- full page, not a
tight crop -- at the size the user was looking at plus a phone and a laptop."""
import asyncio
import sys

sys.path.insert(0, r"C:\Users\disturbance2333\Desktop\bilibili-crawler")
from playwright.async_api import async_playwright  # noqa: E402

PAGE = "file:///F:/work palce/liukanshan/liukanshan-loader.html"
SIZES = [("desktop", 1591, 916), ("laptop", 1280, 800), ("phone", 390, 844)]


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        for name, w, h in SIZES:
            page = await b.new_page(viewport={"width": w, "height": h},
                                    device_scale_factor=1, reduced_motion="reduce")
            await page.goto(PAGE)
            await page.wait_for_timeout(600)
            await page.evaluate("() => { LiukanshanLoader.progress(1); }")
            await page.wait_for_timeout(200)
            await page.screenshot(path=f"F:/work palce/liukanshan/win-{name}.png")
            info = await page.evaluate("""() => {
              const r = (s) => { const e = document.querySelector(s);
                if (!e) return null; const b = e.getBoundingClientRect();
                return [Math.round(b.left), Math.round(b.top),
                        Math.round(b.right), Math.round(b.bottom)]; };
              const y = document.getElementById('lk-year');
              const n = y.firstChild, rg = document.createRange();
              rg.setStart(n, 0); rg.setEnd(n, 1);
              const d = rg.getBoundingClientRect();
              return { vw: innerWidth, vh: innerHeight,
                       wrap: r('.lk-wrap'), stage: r('.lk-stage'),
                       front: r('.lk-front'), text: r('.lk-text'),
                       digit0: [Math.round(d.left), Math.round(d.top),
                                Math.round(d.right), Math.round(d.bottom)],
                       overflowX: document.documentElement.scrollWidth > innerWidth,
                       overflowY: document.documentElement.scrollHeight > innerHeight };
            }""")
            print(f"--- {name} {info['vw']}x{info['vh']}")
            for k in ("wrap", "stage", "front", "text", "digit0"):
                print(f"    {k:<7} {info[k]}")
            print(f"    clipped? x={info['overflowX']} y={info['overflowY']}")
            await page.close()
        await b.close()


asyncio.run(main())
