# -*- coding: utf-8 -*-
"""Full-size look at the delivered loader, clipped wide enough to include the
subject even though it now extends past the stage box."""
import asyncio
import sys

sys.path.insert(0, r"C:\Users\disturbance2333\Desktop\bilibili-crawler")
from playwright.async_api import async_playwright  # noqa: E402

PAGE = "file:///F:/work palce/liukanshan/liukanshan-loader.html"
OUT = "F:/work palce/liukanshan/loader-delivered.png"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await b.new_page(viewport={"width": 900, "height": 820},
                                device_scale_factor=2, reduced_motion="reduce")
        await page.goto(PAGE)
        await page.wait_for_timeout(600)
        await page.evaluate("() => { LiukanshanLoader.progress(1); }")
        await page.wait_for_timeout(200)
        box = await page.evaluate("""() => { const b =
          document.querySelector('.lk-wrap').getBoundingClientRect();
          return [b.left, b.top, b.width, b.height]; }""")
        await page.screenshot(path=OUT, clip={
            "x": box[0] - 110, "y": box[1] - 20,
            "width": box[2] + 220, "height": box[3] + 40})
        print("wrote", OUT)
        await b.close()


asyncio.run(main())
