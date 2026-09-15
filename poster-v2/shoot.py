# -*- coding: utf-8 -*-
"""Screenshot the three poster directions at 315x175 (1x) and 630x350 (2x)."""
import asyncio
import sys

sys.path.insert(0, r"C:\Users\disturbance2333\Desktop\bilibili-crawler")
from playwright.async_api import async_playwright  # noqa: E402

DIR = "F:/work palce/poster-v2"
PAGE = f"file:///{DIR}/directions.html"
NAMES = ["a", "b", "c"]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for scale, tag in ((1, "1x"), (2, "2x")):
            page = await browser.new_page(
                viewport={"width": 760, "height": 620}, device_scale_factor=scale)
            await page.goto(PAGE)
            await page.wait_for_timeout(700)
            for i, name in enumerate(NAMES):
                el = (await page.query_selector_all(".poster"))[i]
                await el.screenshot(path=f"{DIR}/dir-{name}-{tag}.png")
            await page.close()
            print("shot", tag)
        await browser.close()


asyncio.run(main())
