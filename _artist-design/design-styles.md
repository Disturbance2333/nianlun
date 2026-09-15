# 风格库 · design-styles.md（MVP 12 风格）

> 结构：媒介(web/PPT/信息图) × 气质(大胆/中性/安静)，MVP 每格 1-2 个（共 12）。一风格 = 一组 `:root[data-style="…"]` 变量。
> 用法：`<html data-style="swiss-grid">` 或 JS `document.documentElement.dataset.style = "swiss-grid"`。
> 新增风格：复制变量组 + 过 SKILL.md §2 grep 校验 + 5 维评审功能项 ≥6。

---

## 契约基准（允许清单变量，各风格只需改值）

```
--bg --surface --ink --muted --accent
--radius-sm(4px) --radius-md(10px) --radius-lg(16px) --radius-pill(999px)
--font-display --font-body --shadow-1 --density(1)
```

---

## 大胆（Bold）

### 1. brutalis-wire — Brutalist Wire（web）
- **特征**：黑底荧光绿 1px 网格，硬边无圆角，工业感
- **场景**：开发者工具、Web3、先锋品牌

```css
:root[data-style="brutalist-wire"]{
  --bg:#0a0a0a; --surface:#111; --ink:#eaff5a; --muted:#9a9a9a; --accent:#ff3d81;
  --radius-sm:0; --radius-md:0; --radius-lg:0; --radius-pill:0;
  --font-display:'Courier New',monospace; --font-body:'Courier New',monospace;
  --shadow-1:0 0 0 1px #eaff5a; --density:1;
}
```

### 2. editorial-punch — Editorial Punch（web）
- **特征**：巨号衬线 display + 红强调，杂志封面感
- **场景**：品牌 landing、专题文章

```css
:root[data-style="editorial-punch"]{
  --bg:#f7f3ec; --surface:#fff; --ink:#1a1a1a; --muted:#6b6b6b; --accent:#d32f2f;
  --radius-sm:2px; --radius-md:6px; --radius-lg:12px; --radius-pill:999px;
  --font-display:Georgia,'Times New Roman',serif; --font-body:Georgia,serif;
  --shadow-1:0 1px 2px rgb(0 0 0/8%); --density:1.05;
}
```

### 3. slide-riot — Slide Riot（PPT）
- **特征**：撞色斜切色块，大胆块面
- **场景**：发布会 deck、创业 pitch

```css
:root[data-style="slide-riot"]{
  --bg:#14142b; --surface:#1e1e3f; --ink:#fff; --muted:#b9b9d4; --accent:#ff7a00;
  --radius-sm:0; --radius-md:0; --radius-lg:0; --radius-pill:999px;
  --font-display:'Arial Black',sans-serif; --font-body:Arial,sans-serif;
  --shadow-1:0 0 0 2px #ff7a00; --density:1.1;
}
```

### 4. poster-mono — Poster Mono（PPT）
- **特征**：全大写等宽，海报感强
- **场景**：活动预告、艺术类 deck

```css
:root[data-style="poster-mono"]{
  --bg:#f5f2e8; --surface:#fff; --ink:#111; --muted:#666; --accent:#0047ab;
  --radius-sm:0; --radius-md:0; --radius-lg:0; --radius-pill:0;
  --font-display:'Courier New',monospace; --font-body:'Courier New',monospace;
  --shadow-1:0 1px 2px rgb(0 0 0/6%); --density:1;
}
```

### 5. data-gotham — Data Gotham（信息图）
- **特征**：深色霓虹数据图，科技感
- **场景**：数据可视化、年度报告

```css
:root[data-style="data-gotham"]{
  --bg:#0d1b2a; --surface:#16283c; --ink:#e0fbfc; --muted:#98c1d9; --accent:#00f5d4;
  --radius-sm:4px; --radius-md:8px; --radius-lg:12px; --radius-pill:999px;
  --font-display:'Segoe UI',sans-serif; --font-body:'Segoe UI',sans-serif;
  --shadow-1:0 0 12px rgb(0 245 212/15%); --density:1;
}
```

---

## 中性（Neutral）

### 6. swiss-grid — Swiss Grid（web）
- **特征**：极简网格，无衬线，红点缀
- **场景**：企业官网、作品集（默认首选）

```css
:root[data-style="swiss-grid"]{
  --bg:#fafafa; --surface:#fff; --ink:#111; --muted:#666; --accent:#e30613;
  --radius-sm:0; --radius-md:0; --radius-lg:0; --radius-pill:999px;
  --font-display:'Helvetica Neue',Arial,sans-serif; --font-body:'Helvetica Neue',Arial,sans-serif;
  --shadow-1:0 1px 2px rgb(0 0 0/6%); --density:1;
}
```

### 7. newsprint — Newsprint（web）
- **特征**：报纸衬线排版，黑白灰
- **场景**：长文、专栏、文档

```css
:root[data-style="newsprint"]{
  --bg:#f4f1e8; --surface:#fcfaf4; --ink:#222; --muted:#777; --accent:#8b0000;
  --radius-sm:0; --radius-md:0; --radius-lg:0; --radius-pill:0;
  --font-display:Georgia,serif; --font-body:Georgia,serif;
  --shadow-1:0 0 0 1px #ddd; --density:1;
}
```

### 8. deck-minimal — Deck Minimal（PPT）
- **特征**：留白 + 单强调色，克制
- **场景**：商务汇报、培训（默认 PPT）

```css
:root[data-style="deck-minimal"]{
  --bg:#fff; --surface:#f7f7f7; --ink:#1a1a1a; --muted:#888; --accent:#1a56db;
  --radius-sm:4px; --radius-md:8px; --radius-lg:12px; --radius-pill:999px;
  --font-display:'Helvetica Neue',Arial,sans-serif; --font-body:'Helvetica Neue',Arial,sans-serif;
  --shadow-1:0 1px 3px rgb(0 0 0/8%); --density:0.95;
}
```

### 9. report-card — Report Card（PPT）
- **特征**：表格驱动，信息密度高
- **场景**：季度汇报、财报 deck

```css
:root[data-style="report-card"]{
  --bg:#f8f9fa; --surface:#fff; --ink:#212529; --muted:#6c757d; --accent:#0d6efd;
  --radius-sm:4px; --radius-md:8px; --radius-lg:12px; --radius-pill:999px;
  --font-display:Georgia,serif; --font-body:'Helvetica Neue',Arial,sans-serif;
  --shadow-1:0 1px 2px rgb(0 0 0/6%); --density:1.1;
}
```

### 10. chart-clean — Chart Clean（信息图）
- **特征**：灰阶 + 单蓝，图表为主
- **场景**：数据分析图、KPI 面板

```css
:root[data-style="chart-clean"]{
  --bg:#fff; --surface:#f4f6f8; --ink:#1c2530; --muted:#7a869a; --accent:#2563eb;
  --radius-sm:4px; --radius-md:8px; --radius-lg:12px; --radius-pill:999px;
  --font-display:'Helvetica Neue',Arial,sans-serif; --font-body:'Helvetica Neue',Arial,sans-serif;
  --shadow-1:0 1px 2px rgb(0 0 0/6%); --density:1;
}
```

---

## 安静（Quiet）

### 11. warm-paper — Warm Paper（web/信息图）
- **特征**：米白纸感暖灰，1px 边框，柔和
- **场景**：生活方式品牌、手工产品

```css
:root[data-style="warm-paper"]{
  --bg:oklch(0.97 0.008 85); --surface:#fdfbf5; --ink:#3d3a36; --muted:#8a857d; --accent:#b08968;
  --radius-sm:4px; --radius-md:10px; --radius-lg:16px; --radius-pill:999px;
  --font-display:Georgia,serif; --font-body:Georgia,serif;
  --shadow-1:0 0 0 1px rgb(0 0 0/6%); --density:0.9;
}
```

### 12. zen-slide — Zen Slide（PPT）
- **特征**：居中大字呼吸留白，极简禅意
- **场景**：思想分享、TED 风格

```css
:root[data-style="zen-slide"]{
  --bg:#faf9f6; --surface:#fff; --ink:#2b2b2b; --muted:#999; --accent:#5c6b73;
  --radius-sm:0; --radius-md:0; --radius-lg:0; --radius-pill:0;
  --font-display:'Helvetica Neue',Arial,sans-serif; --font-body:'Helvetica Neue',Arial,sans-serif;
  --shadow-1:none; --density:0.85;
}
```

---

## 反例（slop 对照，评审时禁用）

```
--accent: 紫蓝渐变（#6366f1→#8b5cf6）       ✗
--radius: 全部 16px 圆角卡片堆砌             ✗
--font-display: Inter                       ✗（Inter 只做正文）
border-left: 4px solid var(--accent)        ✗（左 accent 反模式）
emoji 图标（☕📊🚀）                          ✗
```
