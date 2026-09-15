# -*- coding: utf-8 -*-
"""How far must the year come down for the clouds to sit at its mid-height?

Measures, in stage coordinates: the year's glyph box, the artwork box, and the
clouds' own bbox (path 13), isolated on screen."""
import asyncio
import io
import sys

sys.path.insert(0, r"C:\Users\disturbance2333\Desktop\bilibili-crawler")
from playwright.async_api import async_playwright  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

PAGE = "file:///F:/work palce/liukanshan/liukanshan-loader.html"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page(viewport={"width": 1280, "height": 800},
                              device_scale_factor=2, reduced_motion="reduce")
        await pg.goto(PAGE, wait_until="load")
        await pg.wait_for_timeout(500)
        await pg.evaluate("() => { LiukanshanLoader.progress(1); }")
        await pg.wait_for_timeout(150)
        st = await pg.evaluate("""() => { const b =
          document.querySelector('.lk-stage').getBoundingClientRect();
          return [b.left, b.top, b.width, b.height]; }""")
        clip = {"x": st[0], "y": st[1], "width": st[2], "height": st[3]}

        async def shot():
            buf = await pg.screenshot(clip=clip)
            return np.asarray(Image.open(io.BytesIO(buf)).convert("RGB"), dtype=np.int16)

        async def shapes(keep):
            await pg.evaluate("""(k) => {
              document.querySelectorAll('.lk-fox-svg path, .lk-fox-svg ellipse')
                .forEach((el) => {
                  const id = el.dataset.p !== undefined ? 'p' + el.dataset.p
                                                        : 'e' + el.dataset.e;
                  el.style.visibility = (k === null || k.indexOf(id) >= 0) ? '' : 'hidden';
                });
            }""", keep)

        geo = await pg.evaluate("""() => {
          const st = document.querySelector('.lk-stage').getBoundingClientRect();
          const y = document.getElementById('lk-year');
          const n = y.firstChild, rg = document.createRange();
          rg.setStart(n, 0); rg.setEnd(n, y.textContent.length);
          const g = rg.getBoundingClientRect();
          const yb = y.getBoundingClientRect();
          const a = document.querySelector('.lk-art').getBoundingClientRect();
          const t = document.querySelector('.lk-text').getBoundingClientRect();
          const rel = (b) => [ +(b.left - st.left).toFixed(1), +(b.top - st.top).toFixed(1),
                               +(b.right - st.left).toFixed(1), +(b.bottom - st.top).toFixed(1) ];
          return { glyph: rel(g), yearBox: rel(yb), art: rel(a), text: rel(t) };
        }""")
        print("stage-relative boxes (CSS px):")
        for k, v in geo.items():
            print(f"    {k:<8} {v}")

        # clouds = path 13
        for sel in ("#lk-year", ".lk-rings", ".lk-glow"):
            await pg.evaluate(
                "([s,o]) => { document.querySelector(s).style.visibility = o ? 'hidden' : ''; }",
                [sel, True])
        await shapes(["p13"])
        base = await shot()
        await shapes([])
        empty = await shot()
        m = np.abs(base - empty).max(axis=2) > 12
        ys, xs = np.nonzero(m)
        top, bot = ys.min() / 2, ys.max() / 2
        print(f"\nclouds  stage-y {top:.1f} .. {bot:.1f}   centre {(top + bot) / 2:.1f}")
        gl, gt, gr, gb = geo["glyph"]
        print(f"year glyph  stage-y {gt:.1f} .. {gb:.1f}   centre {(gt + gb) / 2:.1f}")
        print(f"\n-> move the year down by "
              f"{(top + bot) / 2 - (gt + gb) / 2:+.1f}px to put the clouds at its mid-height")
        await b.close()


asyncio.run(main())
