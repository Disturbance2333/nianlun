# 全局提示词（固定不变，每次都用这一整段）

> 用法：**全局提示词原样粘贴 + 只在最后追加一行姿势**。参考图每次都要一起传。

---

## 中文版 · 全局提示词

```
参考图里的白色北极狐（刘看山），画一张单色矢量线稿。

角色设定必须与参考图完全一致：全身纯白，无毛发纹理；吻部是一块灰蓝色实心色块（#82899C），不是黑点；眼睛是一个小灰点；没有嘴线、没有眉毛；两只尖三角耳朵；四肢细长、末端圆钝；一条蓬松粗尾巴、尾尖圆钝；头身比约 1:2.5；表情呆萌克制，不做夸张五官。

风格：均匀细描边，线宽约 2px（@1000px 画布）且全程粗细一致；纯白填充；描边色 #515B75；纯白或透明背景，没有任何背景元素。

禁止出现：3D 渲染、渐变、发光、霓虹、投影、体积光、写实毛发、水彩、厚涂、网点、高光、玻璃拟态。

构图：单角色居中，四周留白 15%，不裁切；画面里只有这一个角色；不要文字、不要水印、不要边框。
```

**然后追加一行：**

```
姿势：[从下面五条里选一条]
```

---

## English · global prompt

```
Single-colour vector line art of the white Arctic fox mascot shown in the reference images.

Character spec, must match the references exactly: pure white body with no fur texture; the muzzle is a solid grey-blue patch (#82899C), NOT a black dot; the eye is one small grey dot; NO mouth line, NO eyebrows; two pointed triangular ears; slender limbs with blunt rounded ends; one thick bushy tail with a blunt tip; head-to-body ratio about 1:2.5; calm deadpan expression, no exaggerated features.

Style: uniform thin outline, about 2px on a 1000px canvas and constant everywhere; flat white fill; stroke colour #515B75; plain white or transparent background with no scenery.

Do NOT use: 3D render, gradients, glow, neon, drop shadow, volumetric light, realistic fur, watercolour, painterly shading, halftone, glossy highlights, glassmorphism.

Composition: one character centred, 15% empty margin, nothing cropped, no text, no watermark, no border.
```

**Then append one line:**

```
Pose: [pick one from the five below]
```

---

## 姿势行（每次只改这一句）

| # | 中文 | English |
|---|---|---|
| 1 ★ | 它用两只前爪推着一个比自己还高的沙漏，沙漏上半部还有沙、下半部快漏完了 | it pushes an hourglass taller than itself with both front paws; sand still in the top half, nearly empty below |
| 2 | 它坐在地上，一只前爪举着放大镜，对着一团想法气泡在看 | it sits and holds a magnifying glass up to a cluster of idea bubbles |
| 3 | 它背着一个小包，沿一条手绘虚线向右走，步态轻快，头微微回望 | it walks right along a hand-drawn dashed line, light-footed, glancing back |
| 4 | 它站着抱住一个灯泡，灯泡亮着，用四五道短直线表示光 | it stands hugging a light bulb; the bulb is lit, drawn as four or five short straight rays |
| 5 | 它只露出上半身，从一堆大小不一的想法气泡里探头出来，它是气泡中最小的那个 | only its upper body shows, peeking out of a pile of idea bubbles of different sizes — it is the smallest one |

---

## 如果生成工具有 negative prompt 栏

```
3D, render, gradient, glow, neon, drop shadow, fur texture, watercolour, painterly, halftone, glossy highlight, text, watermark, border, multiple characters, cropped, off-model
```

---

## 每次都别忘的三件事

1. **参考图必传**：`ref-desert.png` + `ref-wire.png`（角色设定）；有风格参考位再传 `ref-style.png`
2. **一次只出一个姿势** —— 一条提示词要多个动作，角色比例必崩
3. **别把"吻部灰蓝色块"和"没有嘴线"删掉** —— 这两条是判断有没有脱官设的关键

---

## 拿到图先自查这五条

1. 线宽是不是全程一致（AI 最容易崩的地方）
2. 是不是纯白填充，有没有偷加渐变/投影
3. 吻部色块 + 小灰点眼 + **无嘴线** 是否都保住
4. 是否单角色居中、四周留白、没有裁切
5. 背景是否干净（透明或纯白）
