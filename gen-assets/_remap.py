# -*- coding: utf-8 -*-
"""把生成图重映射到封面的调色板，并裁成封面用的素材。

源图是原图（2732x1535），水印在**右下角**「豆包AI生成」—— 跟上一张缩略图不同。
步骤：避开右下角水印裁切 -> 镜像 -> 灰度线性映射到 --ink/--paper（不是硬阈值，
保留抗锯齿）-> 裁到内容 -> 降采样（封面槽位 96px，4x 超采样足够）。
"""
import numpy as np
from PIL import Image

SRC = "F:/work palce/gen-assets/fox-hourglass-hi.jpg"
OUT = "F:/work palce/gen-assets/fox-hourglass.png"
TARGET_W = 420

INK = (0x17, 0x19, 0x1C)
# 反 AI-slop 闸门 #7/#22：纸色不再用纯白，改用和封面一致的暖纸色
PAPER = (0xFB, 0xF9, 0xF4)

im = Image.open(SRC).convert("RGB")
w, h = im.size
print(f"raw {w}x{h}")

# 水印在右下角，所以裁 x 10%~80%、y 5%~92%：避开它，同时保留主体与留白
im = im.crop((int(w * 0.10), int(h * 0.05), int(w * 0.80), int(h * 0.92)))
# 原图狐狸朝右推沙漏，而它摆在封面右侧会朝画面外推 —— 翻过来面向画面内
im = im.transpose(Image.FLIP_LEFT_RIGHT)

g = np.asarray(im.convert("L"), dtype=np.float32)
DARK, LIGHT = 95.0, 205.0
t = np.clip((LIGHT - g) / (LIGHT - DARK), 0.0, 1.0)      # 1 = 墨, 0 = 纸

out = np.zeros(g.shape + (3,), dtype=np.float32)
for i in range(3):
    out[..., i] = PAPER[i] * (1 - t) + INK[i] * t
img = Image.fromarray(out.astype("uint8"))

a = np.asarray(img.convert("L"))
ys, xs = np.nonzero(a < 245)
pad = 6
box = (max(0, xs.min() - pad), max(0, ys.min() - pad),
       min(a.shape[1], xs.max() + pad), min(a.shape[0], ys.max() + pad))
img = img.crop(box)

if img.width > TARGET_W:
    img = img.resize((TARGET_W, round(img.height * TARGET_W / img.width)),
                     Image.LANCZOS)
img.save(OUT)
print(f"-> {OUT}  {img.size}")
