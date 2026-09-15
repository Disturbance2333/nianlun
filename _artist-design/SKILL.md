---
name: artist-design
description: 艺术家模式·设计内核——反 AI slop 铁律 11 条、CSS 变量令牌契约、12+40 风格库、品牌资产协议、设计方向顾问三套逻辑、5 维评审。使用时机：任何设计任务的第一步（做原型/deck/动画/信息图前必先定风格方向）；需求模糊时触发三套顾问流程出 3 版真实视觉；涉及品牌时走资产协议取官方 logo。触发词：做个好看的、帮我设计、设计风格、配色方案、推荐风格、品牌色、反 AI slop、设计评审、好不好看。
---

# artist-design · 艺术家模式设计内核

> 这是艺术家模式**主 skill**——所有设计任务的入口。做任何设计（原型/deck/动画/信息图）前，**先读本文件**定风格方向；具体交付物流程见对应的子 skill：
> - 📱 原型 → `artist-prototype`
> - 📊 幻灯片 → `artist-deck`
> - 🎬 动画 → `artist-animation`
> - 🖼️ 生图/生视频 → `artist-ai-media`

## 0. 铁律门（动手前必读，不可跳过）

1. **先套风格令牌，后写内容**：任何交付物必须用 `:root[data-style="…"]` 变量组驱动，禁止硬编码 hex/px（见 §2 契约）。
2. **单文件 HTML 交付**：零外链、零依赖、本地双击即开；图片/视频经 `data-asset` 槽（见 `artist-ai-media`），禁内嵌大图（<1MB 硬规则）。
3. **反 AI slop**：见 §1 铁律清单，评审会逐条核对。
4. **早 show 早迭代**：先写 ASSUMPTIONS / PLACEHOLDERS / REASONING 注释，尽早给用户看骨架，再填充。
5. **交付前自检**：跑 §6 验收清单 13 条。

## 1. 反 AI slop 铁律清单（10+1 条；避免 → 换成 → CSS 实践）

| # | 避免 | 换成 | CSS 实践 |
|---|---|---|---|
| 1 | 紫蓝渐变 | 单色明度分层 | 背景 `oklch()` 平铺，全页渐变 ≤1 处 |
| 2 | emoji 图标 | 几何 SVG / 1.5px 边框符号 | `::before` 绘制，禁 emoji |
| 3 | 圆角卡片堆砌 | 主卡 4px、浮层 10px、pill 仅标签 | `--radius-*` 令牌 |
| 4 | 左 border accent | 间距/字重/`color-mix` 色块 | 删 `border-left: 4px` |
| 5 | Inter 做 display | 衬线 display + 无衬线正文 | `--font-display: serif; letter-spacing: -0.02em` |
| 6 | 灰底白卡 | 纸感底色（米白 `oklch(0.97 0.008 85)`） | 卡片用 1px 边框而非阴影 |
| 7 | 多层阴影 | 至多 1 层 `0 1px 2px rgb(0 0 0/6%)` | 靠边框+留白分层 |
| 8 | 16px 均码排版 | 4 级字阶 | `0.875 / 1 / 1.25 / clamp(2rem,5vw,3.5rem)`，行高 1.5/1.2 |
| 9 | 居中 hero | 12 列 Grid + 左对齐 | `text-wrap: pretty` |
| 10 | 色板失控 | 封顶 5 色（主/强调/3 中性） | 颜色只走 `--color-*`，禁硬编码 hex |
| 11 | 忽略 a11y | 对比度 ≥4.5:1、focus 可见、reduced-motion | `prefers-reduced-motion` 豁免动画 |

## 2. CSS 变量契约（四段式，grep 校验）

### 2a. 允许清单（权威令牌，只许改值禁增删）

```
--bg --surface --ink --muted --accent
--radius-sm --radius-md --radius-lg --radius-pill
--font-display --font-body
--shadow-1
--density          /* 0.75–1.25 */
```

### 2b. 扩展槽（白名单 + 前缀放行）

```
--color-*   /* 品牌扩展色 */
--brand-*   /* 多品牌并存时 */
--grid-* --space-*  /* 布局 */
--img-sat --img-sepia --img-ratio  /* 生图后处理（M9） */
```

### 2c. 禁用清单（反模式占位）

```
border-left: 4px accent   /* 左 border accent */
--gradient-*              /* 渐变变量 */
emoji 作为图标             /* 字符而非几何 */
```

### 2d. 打印变量（L0 导出）

```
--page-*  /* @media print 分页/出血 */
```

### grep 校验命令（交付前必跑）

```bash
# 无硬编码 hex（除 --color-*/--brand-* 定义处）
grep -nE '#[0-9a-fA-F]{6}' out.html | grep -vE '(--color-|--brand-|:root)' || echo "PASS: 无硬编码 hex"
# 无渐变/左 accent
grep -nE 'linear-gradient|border-left: 4px' out.html && echo "FAIL" || echo "PASS"
```

## 3. 风格库

- **原生 12 风格**（`references/design-styles.md`）：媒介(web/PPT/信息图) × 气质(大胆/中性/安静) = 9 格，每格 ≥2 风格；一风格 = 一组 `:root[data-style="…"]` 变量。**这是默认执行库**，所有交付物从这里选变量组。
- **huashu 40 风格参考**（`references/design-styles-huashu.md`）：网页 20 + PPT 20，带还原度/温度/开源字体，做需求模糊的设计方向顾问时当弹药（三套逻辑选风格用）。
- **切换**：`document.documentElement.dataset.style = "swiss-grid"` + localStorage 键 `dsh-artist:style`
- **Tweaks**：`--density`（0.75–1.25）与 accent 参数化，键 `dsh-artist:tweaks`（完整系统见 `references/tweaks-system.md`，位于 artist-animation）
- **新增风格规则**：新变量组必须过同一 grep 校验 + 5 维评审功能项 ≥6

## 3.5 设计方向顾问（Fallback · 三套逻辑完整流程，移植自 huashu-design 2.0）

**触发**：用户需求模糊（"做个好看的"、"帮我设计"、"做个XX"没有具体参考）、没给设计系统/截图/Figma。
**跳过**：用户已给明确风格参考 → 直接主干流程。

**Phase 1 · 对话澄清**（一次最多 3 个问题）：目标受众 / 核心信息 / 情感基调 / 输出格式。**同时主动索要参考**：产品名？logo/品牌色/VI？喜欢的参考站/截图？都没有就"你看着办"。
**无应答策略**：用户只丢一句模糊需求就没下文 → 按 best judgment 补齐假设（标 assumption），直接往下跑，用"看得见的东西"代替追问。

**Phase 2 · 顾问式重述**（≥200 字）：把需求嚼透，以「基于这个理解，我直接做 3 个不同方向的真实版本给你看」结尾，**不要问"你想选哪个方向"**。

**Phase 3 · 固化设计 spec**（≥500 字，三套逻辑的共同输入）：产品/项目是什么、受众与场景、核心信息分点、情感基调、**输出格式与尺寸（必填）**、已知约束、图片需求。

**Phase 3.5 · 🔴 图片素材前置 CHECKPOINT（spawn 三套逻辑前必做）**
先答：这个设计图片是内容必需吗？
- 内容型（人物/产品/地点/历史/鹦鹉…）→ 图片几乎必需，先取齐真图再 spawn
- 工具/数据/文档/纯观点型 → 可能不需要
- 拿不准 → 按内容必需处理
- 取图脚本：`python3 scripts/fetch_images.py --query "英文关键词" --out 项目/assets/img --count 2 --width 1600`（内置清代理+合规UA+许可输出+失败兜底）
- 渠道：Wikimedia Commons / Met / BHL（博物历史）、Unsplash/Pexels（生活场景）、官方渠道（品牌）
- 🔴 **具名产品/品牌 logo 子门**：设计里出现的每个产品/品牌名都要取到官方 logo（svgl API → simpleicons → Google favicon），有一个缺 = STOP 补齐
- 真图诚实性测试：「去掉这张图，信息是否有损？」有损才用
- 取图失败三级兜底：① 换渠道 ② 有生图能力走 `artist-ai-media` ③ 标"图待补"诚实 placeholder 继续 spawn，不卡流程

**Phase 4 · 三套逻辑并行 subagent（核心）**
三个 subagent 拿同一份 spec + 同一份用户真实内容，各按一套逻辑产出一版**纯 HTML/CSS** 真实视觉：

- **逻辑一 · 🎲 秒数轮盘（随机 20 选 1）**：跑 `date +%S` 取秒数，算 `秒数 % 20 + 1` 得 1-20，从 `design-styles-huashu.md` 对应半区取那一号风格，严格按其视觉 DNA 做。还原度 <70% 的须标注降级。
- **逻辑二 · 🏆 现实参照（标杆迁移）**：选 1 个世界上和该需求最相关、且设计极出色（Awwwards/CSS Design Awards/FWA/Apple Design Award）的真实网站/PPT/iOS 原型。先用 WebSearch 核实其真实存在与设计语言，拆解配色/字体/布局再迁移。
- **逻辑三 · 🧠 最佳设计师（顶级定制）**：假设预算无上限，最适合这个用户/产品的工作室/设计师是谁（Pentagram/Collins/IDEO/原研哉/Stripe 团队…），启用其设计思维从头设计。

并行规范：用用户真实内容（非 Lorem）；纯 HTML/CSS 单文件；内容必需图用 Phase 3.5 的真图；**PPT/deck 场景必走 deck 模板**（见 `artist-deck`）；产出自检——`design-demos/` 下真有 3 个 .html，少于 3 个 = 没走完三套逻辑，补齐。
**不支持 subagent 的 runtime**：串行跑三套，每套开跑前只读 spec、清空对上一套的记忆、用三个不同 anchor 物理隔离趋同。

**Phase 5 · 用户基于真实视觉选择**：看完三版截图选一版深化/混合（"轮盘配色 + 设计师布局"）/微调/全重来。

**Phase 6 · 进入主干执行**：选定后回到 §7 Junior Designer 流程做扎实。

## 4. 5 维评审（artist_critic 独立评审）

- 维度：哲学一致性 / 视觉层级 / 细节执行 / 功能性 / 创新性
- 锚点：0-2 缺失 / 3-4 雏形 / 5-6 达标 / 7-8 出色 / 9-10 教科书级
- **硬阈值**：`function < 4` 一票否决 FAIL；`verdict: PASS` 需平均 ≥6 且无单维 ≤2
- 输出：雷达 JSON `{"style":"…","scores":{…},"verdict":"PASS"}` + Keep / Fix（结构化：问题+位置+指令）/ Quick Wins
- **评审隔离**：生成与评审两段分离——设计者产出，独立评审者评审；评审 JSON 落盘交付
- 完整评审指南见 `references/critique-guide.md`

## 5. 品牌资产协议（涉及具体品牌时强制执行）

**触发**：① 为某个品牌做物料；② 设计里要呈现一个或多个真实可识别的产品/品牌——对比/榜单/评测/介绍 deck、把多个产品并列、信息图里点名某产品。
🔴 **铁律：设计里只要出现一个能被认出的产品/品牌名，它的官方 logo 就是必需资产**（出现几个就取几个），不是"有就用、没有拉倒"。

**5 步硬流程**（每步有 fallback，绝不静默跳过；完整操作见 `references/brand-asset-protocol.md`）：
1. **问**：一次问全资产清单（logo / 产品图 / UI 截图 / 色板 / 字体 / 禁区）
2. **搜官方渠道**：按资产类型去官网 / press kit / 官方社媒 / Wikimedia
3. **下载资产**：按类型三条兜底路径下载 logo / 产品图 / UI
4. **验证 + 提取**：不只 grep 色值，要核对 logo / 产品图真实性
5. **固化为 `brand-spec.md`**：模板覆盖所有资产路径（logo / 产品图 / UI / 色板 / 字型 / 禁区 / 气质）

**核心理念：资产 > 规范**——logo / 产品图 / UI 截图比品牌色值更重要。绝不从记忆猜品牌色，必须从真实资产 grep。

## 6. 交付前验收清单（13 条）

1. [ ] 单文件 HTML（或 HTML + assets/ 目录 zip）
2. [ ] 零外链、离线双击即开
3. [ ] 无 JS 报错（node --check 通过）
4. [ ] 移动端可用（视口 meta）
5. [ ] 全部样式走 CSS 变量，无硬编码 hex/px
6. [ ] `@media print` 打印样式存在（L0 降级）
7. [ ] `data-style` 切换后变量组齐全
8. [ ] 全部 `data-asset` 有对应文件且过闸门（存在/尺寸/格式/体积）
9. [ ] alt 全非空；`:root` 无 url() 污染
10. [ ] 超限资产已自动降级并带 `ASSET-EXTERNAL` 注释
11. [ ] ASSUMPTIONS/PLACEHOLDERS/REASONING 注释完整
12. [ ] 5 维评审 JSON 已生成且 PASS
13. [ ] 品牌色（如有）来自 brand-spec.md，非记忆

## 7. 工作流（Junior Designer）

1. **澄清**：一次性列出问题清单给用户，批量回答后动手；需求模糊 → 走 §3.5 三套顾问流程
2. **骨架**：写 HTML 骨架 + ASSUMPTIONS/PLACEHOLDERS/REASONING，**先 show 灰色方块**
3. **风格**：套风格令牌（三套顾问选方向 → 落变量组）
4. **填充**：真实内容 → variations → Tweaks（各 show 一次）
5. **评审**：5 维评审 → 修 Fix → PASS 交付
6. **导出**：L0 打印样式兜底；有 Playwright 则 L2 脚本链（动画走 `artist-animation` 的 MP4/GIF + BGM/SFX）

## 8. 与其他 skill 的衔接

| 任务 | 用哪个 skill |
|---|---|
| 定风格/反 slop/评审/品牌 | **本 skill（artist-design）** |
| 做 App/网页原型 | 本 skill 定风格 → `artist-prototype` |
| 做幻灯片/PPT | 本 skill 定风格 → `artist-deck` |
| 做动画/视频 | 本 skill 定风格 → `artist-animation` |
| 生图/生视频（Agnes） | 本 skill 定风格 → `artist-ai-media` |

**多 skill 自动组装**：用户说"做个带动画的 deck"→ 自动触发 artist-design（风格）+ artist-deck（结构）+ artist-animation（动效），三者共享本 skill 定的 CSS 变量组。
