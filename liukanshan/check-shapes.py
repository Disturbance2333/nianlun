# -*- coding: utf-8 -*-
"""Measure, ON SCREEN, where the ground line and the visual mass actually sit
relative to the stage centre. getBBox() is useless here: shapes live under
different <g transform> ancestors, so their local boxes aren't comparable."""
import asyncio
import io
import sys

sys.path.insert(0, r"C:\Users\disturbance2333\Desktop\bilibili-crawler")
from playwright.async_api import async_playwright  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

PAGE = "file:///F:/work palce/liukanshan/liukanshan-loader.html"

ONLY = """(keep) => {
  document.querySelectorAll('.lk-fox-svg path, .lk-fox-svg ellipse').forEach((el) => {
    const id = el.dataset.p !== undefined ? 'p' + el.dataset.p : 'e' + el.dataset.e;
    el.style.visibility = (keep === null || keep.indexOf(id) >= 0) ? '' : 'hidden';
  });
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await b.new_page(viewport={"width": 900, "height": 760},
                                device_scale_factor=2, reduced_motion="reduce")
        await page.goto(PAGE)
        await page.wait_for_timeout(600)
        await page.evaluate("() => { LiukanshanLoader.progress(1); }")
        await page.wait_for_timeout(150)
        st = await page.evaluate("""() => { const b =
          document.querySelector('.lk-stage').getBoundingClientRect();
          return [b.left, b.top, b.width, b.height]; }""")
        clip = {"x": st[0], "y": st[1], "width": st[2], "height": st[3]}

        async def ink(hide_year=True):
            async def shot():
                buf = await page.screenshot(clip=clip)
                return np.asarray(Image.open(io.BytesIO(buf)).convert("RGB"),
                                  dtype=np.int16)
            if hide_year:
                await page.evaluate("""() => {
                  document.getElementById('lk-year').style.visibility = 'hidden';
                  document.querySelector('.lk-rings').style.visibility = 'hidden';
                  document.querySelector('.lk-glow').style.visibility = 'hidden';
                }""")
            base = await shot()
            await page.evaluate("""() => {
              document.querySelectorAll('.lk-fox-svg path, .lk-fox-svg ellipse')
                .forEach((el) => { el.style.visibility = 'hidden'; });
            }""")
            empty = await shot()
            await page.evaluate("""() => {
              document.querySelectorAll('.lk-fox-svg path, .lk-fox-svg ellipse')
                .forEach((el) => { el.style.visibility = ''; });
              document.getElementById('lk-year').style.visibility = '';
              document.querySelector('.lk-rings').style.visibility = '';
              document.querySelector('.lk-glow').style.visibility = '';
            }""")
            return np.abs(base - empty).max(axis=2) > 12

        async def report(label, keep):
            await page.evaluate(ONLY, keep)
            m = await ink()
            ys, xs = np.nonzero(m)
            if len(xs) == 0:
                print(f"{label:<26} (nothing visible)")
                return
            cx, cy = xs.mean(), ys.mean()
            print(f"{label:<26} bbox x {xs.min():>4}..{xs.max():<4} "
                  f"centre x={cx:6.1f} ({cx - 360:+.1f})   "
                  f"y {ys.min():>4}..{ys.max():<4}")
            await page.evaluate(ONLY, None)

        print("stage image 720x720 device px (2x), stage centre x = 360")
        await report("ground line (path 10)", ["p10"])
        await report("cactus body (path 12)", ["p12"])
        await report("cactus arms (11+8)", ["p11", "p8"])
        await report("fox (paths 0-4, 9)", ["p0", "p1", "p2", "p3", "p4", "p9"])
        await report("clouds (path 13)", ["p13"])
        await report("sun (path 5 + e1)", ["p5", "e1"])
        await report("everything", None)
        await b.close()


asyncio.run(main())
