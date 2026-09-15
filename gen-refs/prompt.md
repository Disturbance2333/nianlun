# 刘看山线稿生成 · 参考图与提示词

## 一、三张参考图怎么用

| 文件 | 作用 | 用法 |
|---|---|---|
| `ref-desert.png` | **角色设定**（官方原图） | 作为角色参考 / image reference 上传 |
| `ref-wire.png` | **角色设定**（官方原图，另一个姿势） | 同上，一起传，让模型锁定设定 |
| `ref-style.png` | **风格参考**（我已做好的封面） | 支持风格参考的模型就传；不支持则忽略，靠文字描述 |

**一次只让它出一个姿势**，不要在一条提示词里要五个动作 —— 多动作必然导致角色比例崩坏。

---

## 二、角色设定（必须保持，改动即判废）

- 白色北极狐，**全身纯白**，没有毛发纹理、没有渐变、没有阴影
- **吻部是一块灰蓝色实心色块**（`#82899C`），在头部前端 —— 注意：不是黑色圆点
- **眼睛是一个小灰点**；**没有嘴线，没有眉毛**
- 两只尖三角形耳朵，头顶两侧
- 身体与四肢细长，末端圆钝；一条蓬松粗尾巴，尾尖圆钝
- 头身比约 1 : 2.5，表情**呆萌克制**，不做夸张五官
- 描边颜色：墨蓝灰 `#515B75`（官方原图就是这个色）

---

## 三、画面风格（决定能不能用）

单色矢量线稿。**均匀细描边**（约 2px @ 1000px 画布，粗细全程一致），白色填充，最多一处浅灰用于极小面积结构线。纯白或透明背景，**不要任何背景元素**。

**禁止出现**：3D 渲染、渐变、发光、霓虹、投影、体积光、写实毛发、水彩、厚涂、网点、贴纸阴影、玻璃拟态、高光光泽。

构图：单角色居中，四周留 15% 空白，不裁切。

---

## 四、中文提示词（复制粘贴）

### 姿势 1 · 推沙漏（时间/保质期）★ 最贴合选题

```
参考图中的白色北极狐角色，画一张单色矢量线稿：它用两只前爪推着一个比自己还高的沙漏，沙漏上半部还有沙、下半部快漏完了。

角色设定必须完全一致：全身纯白、吻部是一块灰蓝色实心色块、眼睛是一个小灰点、没有嘴线没有眉毛、两只尖三角耳朵、细长四肢末端圆钝、一条蓬松粗尾巴、头身比约 1:2.5、表情呆萌克制。

风格：均匀细描边约 2px 且全程粗细一致，纯白填充，描边色 #515B75，纯白背景。
严禁：3D 渲染、渐变、发光、霓虹、投影、写实毛发、水彩、厚涂、网点、高光。
构图：单角色居中，四周留白 15%，不裁切。画面里只有这一个角色，不要文字、不要水印、不要边框。
```

### 姿势 2 · 举放大镜（查证/追溯源头）

```
参考图中的白色北极狐角色，画一张单色矢量线稿：它坐在地上，一只前爪举着放大镜，对着一团想法气泡在看。
（角色设定、风格、禁止项、构图 = 同上，可整段复用）
```

### 姿势 3 · 沿虚线走（时间轴）

```
参考图中的白色北极狐角色，画一张单色矢量线稿：它背着一个小包，沿一条手绘虚线向右走，步态轻快，头微微回望。
（角色设定、风格、禁止项、构图 = 同上）
```

### 姿势 4 · 抱灯泡（想法/知识）

```
参考图中的白色北极狐角色，画一张单色矢量线稿：它站着抱住一个灯泡，灯泡是亮着的，用四五道短直线表示光。
（角色设定、风格、禁止项、构图 = 同上）
```

### 姿势 5 · 从气泡堆里探头（少数派）

```
参考图中的白色北极狐角色，画一张单色矢量线稿：它只露出上半身，从一堆大小不一的想法气泡里探头出来，它是气泡中最小的那个。
（角色设定、风格、禁止项、构图 = 同上）
```

---

## 五、English prompt（给只吃英文的模型）

```
Single-colour vector line art of the white Arctic fox mascot shown in the reference images.
Pose: [it pushes an hourglass taller than itself with both front paws; sand still in the top half, nearly empty below].

Character spec, must match exactly: pure white body with no fur texture; the muzzle is a solid grey-blue patch (#82899C), NOT a black dot; the eye is a single small grey dot; NO mouth line, NO eyebrows; two pointed triangular ears; slender limbs with blunt rounded ends; one thick bushy tail with a blunt tip; head-to-body ratio about 1:2.5; calm deadpan expression.

Style: uniform thin outline, about 2px on a 1000px canvas and constant everywhere; flat white fill; stroke colour #515B75; plain white or transparent background; no scenery.
Do NOT use: 3D render, gradients, glow, neon, drop shadow, volumetric light, realistic fur, watercolour, painterly shading, halftone, glossy highlights, glassmorphism.
Composition: one character centred, 15% empty margin, nothing cropped, no text, no watermark, no border.
```

---

## 六、我自己会怎么验收

拿到图先看这五条，任一不合格就要重出：

1. **线宽是否全程一致** —— 这是唯一最硬的判据，AI 最容易在这里崩
2. 是否**纯白填充**、有没有偷偷加渐变/投影
3. **吻部色块 + 小圆眼 + 无嘴线** 三个特征是否都保住（最容易丢的是"无嘴线"）
4. 是否单角色居中、四周有留白、没有裁切
5. 背景是否干净（透明或纯白）

## 七、给我的格式

- **优先 SVG**（我能直接改色、改线宽、嵌进封面）
- 否则 **PNG，透明背景，长边 ≥ 1200px**
- 放到任意文件夹，把路径发我即可
