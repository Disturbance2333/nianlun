# -*- coding: utf-8 -*-
"""Delivery contract, in the user's terms.

  1. 底部横线的中心 = 文案的中心 = 舞台中轴   (measured on screen, by isolating
     the ground-line path -- box centres are worthless here)
  2. 数字和插画是流里的兄弟节点，永不重叠 -> 逐位可见率必须是 100%
  3. 任何尺寸的设备都不裁切、不溢出
"""
import asyncio
import io
import sys

sys.path.insert(0, r"C:\Users\disturbance2333\Desktop\bilibili-crawler")
from playwright.async_api import async_playwright  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

PAGE = "file:///F:/work palce/liukanshan/liukanshan-loader.html"

# phones portrait, phone landscape, tablets, laptops, desktop
VIEWPORTS = [(320, 480), (360, 640), (390, 844), (414, 896), (667, 375),
             (768, 1024), (1024, 768), (1280, 800), (1440, 900), (1920, 1080)]

CENTRES = """() => {
  const st = document.querySelector('.lk-stage').getBoundingClientRect();
  const y = document.getElementById('lk-year');
  const n = y.firstChild, rg = document.createRange();
  rg.setStart(n, 0); rg.setEnd(n, y.textContent.length);
  const g = rg.getBoundingClientRect();
  const t = document.querySelector('.lk-text').getBoundingClientRect();
  const mid = (b) => +(((b.left + b.right) / 2) - st.left).toFixed(1);
  return { stageW: st.width, stageH: st.height,
           year: mid(g), text: mid(t),
           textTop: +(t.top - st.bottom).toFixed(1),
           overflowX: document.documentElement.scrollWidth > innerWidth + 1,
           overflowY: document.documentElement.scrollHeight > innerHeight + 1 };
}"""

RECTS = """() => {
  const y = document.getElementById('lk-year');
  const node = y.firstChild, s = y.textContent, out = [];
  for (let i = 0; i < s.length; i++) {
    const r = document.createRange();
    r.setStart(node, i); r.setEnd(node, i + 1);
    const b = r.getBoundingClientRect();
    out.push([s[i], b.left, b.top, b.right, b.bottom]);
  }
  return out;
}"""


def arr(im):
    return np.asarray(im, dtype=np.int16)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        print(f"{'viewport':<12}{'stage':<10}{'ground line':>12}{'text':>8}"
              f"{'Δ':>7}   digits")
        worst = 0.0
        for w, h in VIEWPORTS:
            pg = await browser.new_page(viewport={"width": w, "height": h},
                                        device_scale_factor=2,
                                        reduced_motion="reduce")
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(PAGE, wait_until="load")
            await pg.wait_for_timeout(450)
            await pg.evaluate("() => { LiukanshanLoader.progress(1); }")
            await pg.wait_for_timeout(120)
            c = await pg.evaluate(CENTRES)
            st = await pg.evaluate("""() => { const b =
              document.querySelector('.lk-stage').getBoundingClientRect();
              return [b.left, b.top, b.width, b.height]; }""")
            clip = {"x": st[0], "y": st[1], "width": st[2], "height": st[3]}

            async def shot():
                buf = await pg.screenshot(clip=clip)
                return arr(Image.open(io.BytesIO(buf)).convert("RGB"))

            async def vis(sel, on):
                await pg.evaluate(
                    "([s,o]) => { document.querySelector(s).style.visibility = o ? 'hidden' : ''; }",
                    [sel, on])

            async def shapes_only(keep):
                await pg.evaluate("""(k) => {
                  document.querySelectorAll('.lk-fox-svg path, .lk-fox-svg ellipse')
                    .forEach((el) => {
                      const id = el.dataset.p !== undefined ? 'p' + el.dataset.p
                                                            : 'e' + el.dataset.e;
                      el.style.visibility = (k === null || k.indexOf(id) >= 0)
                        ? '' : 'hidden'; });
                }""", keep)

            # --- the ground line, isolated -----------------------------------
            for sel in ("#lk-year", ".lk-rings", ".lk-glow"):
                await vis(sel, True)
            await shapes_only(["p10"])
            base = await shot()
            await shapes_only([])
            empty = await shot()
            m = np.abs(base - empty).max(axis=2) > 12
            ys, xs = np.nonzero(m)
            ground = ((xs.min() + xs.max()) / 2) / 2 if len(xs) else float("nan")
            await shapes_only(None)
            for sel in ("#lk-year", ".lk-rings", ".lk-glow"):
                await vis(sel, False)

            # --- digit visibility: full glyph ink vs what actually shows ------
            await vis(".lk-rings", True)
            await vis(".lk-glow", True)
            await vis(".lk-year", True)
            await vis(".lk-art", True)
            both_hidden = await shot()             # neither drawn
            await vis(".lk-year", False)           # year only
            year_only = await shot()
            await vis(".lk-year", True)
            await vis(".lk-art", False)            # art only
            art_only = await shot()
            await vis(".lk-art", False)
            await vis(".lk-year", False)           # everything
            everything = await shot()
            rects = await pg.evaluate(RECTS)
            full_ink = np.abs(year_only - both_hidden).max(axis=2) > 12
            shown = np.abs(everything - art_only).max(axis=2) > 12
            await vis(".lk-year", False)
            await vis(".lk-rings", False)
            await vis(".lk-glow", False)
            pct = []
            for (ch, l, t, r, b) in rects:
                # the glyph box can start slightly above the stage box (the font's
                # own leading), so clamp -- a negative index silently yields an
                # empty numpy slice and reports 0%.
                x0 = max(0, int(round((l - st[0]) * 2)))
                x1 = max(0, int(round((r - st[0]) * 2)))
                y0 = max(0, int(round((t - st[1]) * 2)))
                y1 = max(0, int(round((b - st[1]) * 2)))
                i = int(full_ink[y0:y1, x0:x1].sum())
                v = int(shown[y0:y1, x0:x1].sum())
                pct.append(100.0 * v / max(i, 1))

            delta = ground - c["text"]
            worst = max(worst, abs(delta))
            flag = "" if abs(delta) <= 1.5 else "  <-- OFF AXIS"
            print(f"{w}x{h:<7}{c['stageW']:.0f}x{c['stageH']:.0f}   "
                  f"{ground:>8.1f}  {c['text']:>6.1f}  {delta:>+6.2f}   "
                  + " ".join(f"{x:.0f}%" for x in pct)
                  + ("  CLIP!" if (c["overflowX"] or c["overflowY"]) else "")
                  + flag)
            if errs:
                print("    pageerror:", errs[:2])
            await pg.close()
        print(f"\nworst axis deviation: {worst:.2f} px")
        await browser.close()


asyncio.run(main())
