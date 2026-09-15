// Three genuine directions for the 观念年轮 poster, built per dsh-artist-mode's
// §3.5 设计方向顾问 Phase 4 (three parallel logics).
//
//   A  🎲 秒数轮盘  -> huashu style #17 功能主义网格社区 Functional Brutalism
//   B  🏆 现实参照  -> huashu style #7  复古未来太空图录 Cosmic Retro-Futurism
//                      (benchmark: Perplexity Comet launch site)
//   C  🧠 最佳设计师 -> Neo Shen 水墨晕染 — on the library's AI-image-only list,
//                      unlocked because the user has image-generation capability.
//
// The point of three is to physically separate anchors so the model's known
// bias toward "米白+留白+一个点缀色" cannot collapse them into one another.
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'F:/work palce/poster-v2';
const OUT = `${DIR}/directions.html`;

// ---------------- shared: 刘看山 line art, tokenised (used by B only) ----------------
const SVG = 'F:/work palce/liukanshan/liukanshan_desert.ecf3c388.svg';
let fox = readFileSync(SVG, 'utf8');
fox = fox.replace(/<svg([^>]*?)width="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)height="[^"]*"/, '<svg$1');
fox = fox.replace(/viewBox="[^"]*"/, 'viewBox="0 0 252 172"');
fox = fox.replace('<svg', '<svg class="fox-svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true"');
fox = fox.replace(/fill="#FFF"/g, 'class="ff"').replace(/fill="#82899C"/g, 'class="fs"')
         .replace(/stroke="#82899C"/g, 'class="sa"').replace(/stroke="#525C76"/g, 'class="sb"');

export const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>观念年轮 · 315×175 · 三个方向</title>
<style>
/* =========================================================================
   每个方向都是独立的一套令牌，互不共享颜色。
   共同点只有：315×175、单文件、零外链、无 emoji 图标、无紫渐变。
   ========================================================================= */
*{margin:0;padding:0;box-sizing:border-box}
body{background:#191c22;padding:26px;display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start;
     font-family:'Helvetica Neue',Arial,sans-serif}
.stage{display:flex;flex-direction:column;gap:9px}
.cap{font:11px/1.5 Consolas,monospace;color:#7d8798;max-width:315px}
.cap b{color:#c9d2e0;display:block;font-weight:600;margin-bottom:2px}
.poster{width:315px;height:175px;overflow:hidden;position:relative}

/* ==================== A · 功能主义网格社区 Functional Brutalism ====================
   参考 Are.na / Lobsters / Hacker News。近白底、系统字、发丝灰线、经典链接蓝。
   还原度 98%：纯结构，零素材。
   ================================================================================= */
.a{background:#FBFBFB;color:#111;font-family:-apple-system,'Segoe UI',system-ui,sans-serif;
   padding:12px 14px;display:flex;flex-direction:column}
.a .top{display:flex;justify-content:space-between;align-items:baseline;
        border-bottom:1px solid #E0E0E0;padding-bottom:6px}
.a .top b{font-size:12px;font-weight:700;letter-spacing:.02em}
.a .top span{font-size:9px;color:#8a8a8a}
.a .field{margin-top:9px;display:flex;align-items:center;gap:0;
          border:1px solid #111;background:#fff;height:24px;padding:0 7px}
.a .field i{font-style:normal;font-size:11px;color:#111;white-space:nowrap}
.a .field em{font-style:normal;color:#0000EE;text-decoration:underline;font-size:11px}
.a .field .caret{width:1px;height:11px;background:#111;margin-left:1px}
.a .field button{margin-left:auto;border:none;background:none;color:#111;font-size:11px;
                 font-family:inherit;cursor:default;padding:0}
.a table{margin-top:8px;border-collapse:collapse;width:100%;font-size:9.5px}
.a td{padding:3px 0;border-bottom:1px solid #EFEFEF;vertical-align:middle}
.a td.y{color:#555;font-variant-numeric:tabular-nums;width:34px}
.a td.s{color:#111}
.a td.m{width:76px}
.a .bar{height:5px;background:#E0E0E0;position:relative}
.a .bar i{position:absolute;left:0;top:0;bottom:0;background:#0000EE}
.a td.p{text-align:right;color:#555;width:26px;font-variant-numeric:tabular-nums}
.a .foot{margin-top:auto;font-size:9px;color:#0000EE;text-decoration:underline}

/* ==================== B · 复古未来太空图录 Cosmic Retro-Futurism ====================
   对标 Perplexity Comet 发布站。纯黑 + 奶油纸白 + 一抹钴蓝，低饱和像老式天文图录。
   还原度 75%：SVG 轨道线可还原，全屏视差转场降级。
   ================================================================================ */
.b{background:#F0EAD8;color:#0A0A0A;font-family:Georgia,'Songti SC',SimSun,serif;
   padding:14px 16px;display:flex;flex-direction:column}
.b .rule{height:1px;background:#0A0A0A;opacity:.35}
.b .head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
.b .head b{font-family:Consolas,monospace;font-size:8.5px;letter-spacing:.22em;color:#2B4F91}
.b .head span{font-family:Consolas,monospace;font-size:8.5px;letter-spacing:.1em;color:#0A0A0A;opacity:.55}
.b .mid{position:relative;flex:1}
/* 轨道线：椭圆弧 = 观念在时间里的抛物线 */
.b .orbit{position:absolute;inset:-6px -4px auto -4px;height:104px}
.b .orbit path{fill:none;stroke:#2B4F91;stroke-width:.8}
.b .orbit path.dash{stroke-dasharray:2 3;opacity:.55}
.b h1{position:relative;font-size:23px;font-weight:700;line-height:1.22;letter-spacing:.01em;
      margin-top:10px}
.b h1 em{font-style:normal;color:#2B4F91}
.b .yr{position:absolute;right:2px;bottom:-2px;font-family:Consolas,monospace;
       font-size:9px;letter-spacing:.14em;color:#2B4F91}
.b .dot{position:absolute;width:3px;height:3px;border-radius:50%;background:#2B4F91}
.b .foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto}
.b .foot p{font-family:Consolas,monospace;font-size:8.5px;letter-spacing:.1em;color:#0A0A0A;opacity:.7}
.b .fbox{width:54px}
.b .fox-svg{width:100%;height:auto;display:block}
.b .fox-svg .ff{fill:#F0EAD8}.b .fox-svg .fs{fill:#8a8676}
.b .fox-svg .sa{stroke:#0A0A0A;opacity:.55}.b .fox-svg .sb{stroke:#0A0A0A;opacity:.8}

/* ==================== C · 水墨晕染（AI 生图路径）毛胚 ====================
   库中「AI 生图专用风格」，CSS 做不出水墨。这里给的是毛胚：
   图片槽留好，生图提示词见 cap；文字用宋体墨色压在图上。
   ====================================================================== */
.c{background:#F5F2EA;color:#1a1a1a;font-family:'Songti SC',SimSun,Georgia,serif;
   padding:14px 16px;display:flex;flex-direction:column}
.c .ink{position:absolute;border-radius:50%;border:1px solid #1a1a1a}
/* 竖排：两个独立列 + row-reverse，才是传统的由右向左读；靠 writing-mode 自动换行会错字序 */
.c .vtext{position:absolute;right:16px;top:14px;bottom:14px;
          display:flex;flex-direction:row-reverse;gap:7px}
.c .vtext span{writing-mode:vertical-rl;text-orientation:upright;
               font-size:17px;line-height:1;letter-spacing:.11em;white-space:nowrap}
.c .k{position:absolute;left:16px;bottom:14px;font-family:Consolas,monospace;
      font-size:8px;letter-spacing:.18em;color:#1a1a1a;opacity:.62}
.c .seal{position:absolute;left:16px;top:14px;width:21px;height:21px;
         border:1px solid #1a1a1a;display:grid;place-items:center;
         font-size:8.5px;letter-spacing:0;color:#1a1a1a}
</style></head>
<body>

<!-- ============================== A ============================== -->
<div class="stage">
  <div class="poster a">
    <div class="top"><b>观念年轮</b><span>315 × 175</span></div>
    <div class="field">
      <i>买房是最好的&nbsp;</i><em>投资</em><span class="caret"></span>
      <button>搜索 ▸</button>
    </div>
    <table>
      <tr><td class="y">2010</td><td class="s">共识</td><td class="m"><div class="bar"><i style="width:92%"></i></div></td><td class="p">92%</td></tr>
      <tr><td class="y">2016</td><td class="s">出现质疑</td><td class="m"><div class="bar"><i style="width:58%"></i></div></td><td class="p">58%</td></tr>
      <tr><td class="y">2020</td><td class="s">分裂</td><td class="m"><div class="bar"><i style="width:41%"></i></div></td><td class="p">41%</td></tr>
      <tr><td class="y">2026</td><td class="s">少数派</td><td class="m"><div class="bar"><i style="width:23%"></i></div></td><td class="p">23%</td></tr>
    </table>
    <div class="foot">每一个常识，都曾经是少数派</div>
  </div>
  <div class="cap"><b>A · 秒数轮盘 → 功能主义网格</b>近白底 / 系统字 / 发丝灰线 / 链接蓝。像一份原始数据索引。还原度 98%，零素材。</div>
</div>

<!-- ============================== B ============================== -->
<div class="stage">
  <div class="poster b">
    <div class="head"><b>观念年轮</b><span>ZHIHU HACKATHON 2026</span></div>
    <div class="mid">
      <svg class="orbit" viewBox="0 0 283 104" preserveAspectRatio="none">
        <path d="M-6,96 C56,8 227,8 289,96"/>
        <path class="dash" d="M-6,78 C66,22 217,22 289,78"/>
        <path class="dash" d="M-6,58 C78,38 205,38 289,58"/>
      </svg>
      <div class="dot" style="left:6px;top:52px"></div>
      <div class="dot" style="left:140px;top:2px"></div>
      <div class="dot" style="right:6px;top:52px"></div>
      <h1>每一个常识，<br>都曾经是<em>少数派</em>。</h1>
      <div class="yr">2010 — 2026</div>
    </div>
    <div class="rule"></div>
    <div class="foot">
      <p>你的观点，还剩多少保质期</p>
      <div class="fbox">${fox}</div>
    </div>
  </div>
  <div class="cap"><b>B · 现实参照 → 复古未来太空图录</b>对标 Perplexity Comet 发布站。黑 / 奶油纸 / 钴蓝。轨道线即观念的抛物线。还原度 75%。</div>
</div>

<!-- ============================== C ============================== -->
<div class="stage">
  <div class="poster c">
    <div class="ink" style="width:154px;height:154px;left:-52px;top:10px;opacity:.4"></div>
    <div class="ink" style="width:106px;height:106px;left:-28px;top:34px;opacity:.3"></div>
    <div class="ink" style="width:58px;height:58px;left:-4px;top:58px;opacity:.24"></div>
    <div class="seal">年轮</div>
    <div class="vtext"><span>每一个常识，</span><span>都曾经是少数派</span></div>
    <div class="k">观念年轮 · 你的观点还剩多少保质期</div>
  </div>
  <div class="cap"><b>C · 最佳设计师 → 水墨晕染（AI 生图）</b>库中列为「CSS 做不出」。墨圈即年轮，墨迹扩散即观念传播。文字走宋体竖排。<br><b style="margin-top:4px">生图提示词：</b>一滴墨落在宣纸上，正在慢慢洇开，边缘是毛的、不确定的；圈层由内向外越来越淡，像树的年轮，也像一个人改变主意的过程。安静的、旧纸的颜色，没有戏剧光。</div>
</div>

</body></html>`;

writeFileSync(OUT, html, 'utf8');
console.log(`WROTE ${OUT}  ${html.length} chars`);
