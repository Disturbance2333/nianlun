// 观念年轮 · 封面（线稿/涂鸦风）—— 仿 v2-b82cc1785a54a41931d0cd4e8c41505d
//
// 那三张参考图是三种载体：#1 是 3D 渲染，#3 是水彩晕染，两者都得靠生图；
// #2「太空冲刺计划」是**矢量线稿 + 手绘涂鸦 + 半调网点**，可以完全用 HTML/SVG
// 还原，而且它用的正是官方刘看山线稿 —— 所以照它的语言重做：
//   白底 / 细描边 / 半调网点 / 手绘虚线轨道与四角星 / 描边贴纸式大标题 / 胶囊按钮
// 只有一处强调色：知乎蓝，用在"你在这里"的那颗珠子和搜索框。
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'F:/work palce/poster-v2';

// 标题字体：Noto Serif SC 900。用 Google Fonts 的 text= 参数在服务端只子集化
// 「观念年轮」四个字（1.7 KB），所以仍然是零外部依赖的单文件。
// 反 AI-slop 闸门 #1：显示字体不许用 Inter/Roboto/系统默认。
const TITLE_FONT_B64 = readFileSync(`${DIR}/TitleSerif.woff2`).toString('base64');

// 三种主体素材：两张官方线稿 + 一张按线稿规范生成、并已重映射到本封面调色板的位图
const ASSETS = {
  desert: { file: 'liukanshan_desert.ecf3c388.svg', width: 112, tag: 'line' },
  wire:   { file: 'liukanshan_wire.dc5adecf.svg',   width: 72,  tag: 'wire' },
  gen:    { raster: 'F:/work palce/gen-assets/fox-hourglass.png', width: 96, tag: 'gen' },
};
const WHICH = ['desert', 'wire', 'gen'].includes(process.argv[2]) ? process.argv[2] : 'wire';
const ART = ASSETS[WHICH];
const OUT = `${DIR}/poster-${ART.tag}.html`;

// ---------------- 主体：官方 SVG 重新上色；生成的位图直接内嵌 ----------------
let fox;
if (ART.raster) {
  const b64 = readFileSync(ART.raster).toString('base64');
  fox = `<img class="fox-img" src="data:image/png;base64,${b64}" alt="">`;
} else {
  fox = readFileSync(`F:/work palce/liukanshan/${ART.file}`, 'utf8');
  fox = fox.replace(/<svg([^>]*?)width="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)height="[^"]*"/, '<svg$1');
  fox = fox.replace(/(fill|stroke)="#(82899C|979797)"/g, '$1="var(--grey)"');
  fox = fox.replace(/(fill|stroke)="#(525C76|515B75)"/g, '$1="var(--ink)"');
  fox = fox.replace(/fill="#FFF"/g, 'fill="var(--paper)"');
  fox = fox.replace('<svg', '<svg class="fox-svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true"');
}

// 共识衰减：珠子大小 = 共识比例。
//
// 文案按 blader/humanizer（反 AI 味文本，源自维基《Signs of AI writing》）改。
// 原「不都这样吗/等等，不对吧/一半人不信了/只剩我们了」四句全中三个 tell：
//   ① 结构完全平行（全是"短句+语气词"）② 泛泛而谈，换任何话题都成立
//   ③ 句长几乎相等。
//
// 于是有两条路：写具体事例（要靠得住出处），或写立场（不举事例）。
// 走后者，理由是 humanizer 的规则有优先级 —— "不许添加来源没有的事实/引语"
// 是 Work 准则，"要具体"是 §6 风格偏好，准则高于偏好。
// 代价是放弃了 §6 的具体性，所以风格上的反 AI 味改从**句式**补，四句是四种
// 不同的言语行为（断语 / 疑问 / 不确定 / 许可），首字尾字互不重复，
// 只一句带语气词，全程不含数字、人名、日期等任何需要出处的断言。
// 首尾对照：2010「买了才安心」→ 2026「不买也行」，同一个动作，十六年翻了个面。
const ROWS = [
  ['2010', '“买了才安心”', 92, '泛化立场·断语（不含事实断言）'],
  ['2016', '“一定要买吗？”', 58, '泛化立场·疑问（不含事实断言）'],
  ['2020', '“没有人说得准”', 41, '泛化立场·不确定（不含事实断言）'],
  ['2026', '“不买也行”', 23, '泛化立场·许可（不含事实断言）'],
];

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>观念年轮 · 封面 · 线稿风</title>
<style>
/* 标题显示字体：服务端子集化到「观念年轮」四个字，1.7 KB */
@font-face{
  font-family:'Nianlun Title';
  font-weight:900;font-style:normal;font-display:block;
  src:url(data:font/woff2;base64,${TITLE_FONT_B64}) format('woff2');
}
/* 反 AI-slop 整改后的令牌：
   --paper 从纯白 #FFFFFF 改成微暖纸色（闸门 #7 禁纯白，闸门 #22 禁零彩度中性色）
   --grey  #8B9199 -> #6B7280（对比度 3.18:1 不合格 -> 4.83:1，闸门 #40）
   --accent #0084FF -> #0F62D6（3.66:1 -> 5.62:1，闸门 #40）
   尺度：175px 画布用 1/2/3/5/8/13 的微尺度，4px 栅格在这个尺寸上不可用 */
:root{
  --paper:#FBF9F4; --ink:#17191C; --grey:#6B7280; --dot:#DDE1E6; --accent:#0F62D6;
  --u1:1px; --u2:2px; --u3:3px; --u5:5px; --u8:8px; --u13:13px;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{overflow-x:clip}
body{background:var(--dot);padding:24px;font-family:'Helvetica Neue',Arial,sans-serif}
.poster{
  position:relative;width:315px;height:175px;overflow:hidden;
  background:var(--paper);color:var(--ink);
  padding:9px 11px 8px;display:flex;flex-direction:column;
  font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
/* 手绘涂鸦：轨道虚线、四角星、带环行星、半调网点 —— 纯装饰，允许贴在后层 */
.doodles{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.doodles .dash{fill:none;stroke:var(--grey);stroke-width:.8;stroke-dasharray:3 4}
.doodles .thin{fill:none;stroke:var(--ink);stroke-width:.9}
.doodles .star{fill:none;stroke:var(--ink);stroke-width:.9}
.doodles .soft{fill:none;stroke:var(--dot);stroke-width:1.1}


/* ---------- 上半：左边文案，右边刘看山 ---------- */
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;
     position:relative;z-index:1}
.left{display:flex;flex-direction:column;min-width:0}

.eyebrow{display:flex;align-items:center;gap:4px;white-space:nowrap;
         font-size:7.5px;letter-spacing:.1em;color:var(--grey)}
.eyebrow i{display:block;width:14px;height:1px;background:var(--grey);opacity:.7;flex:none}
.eyebrow b{font-weight:600;color:var(--ink)}

/* 描边贴纸式大标题：白描边(后) → 深描边(中) → 白填充(前)，三层同格叠放。
   反 AI-slop 闸门 #38a：标题必须是正体，不能斜 —— 已去掉原来的 skewX(-7deg)。
   闸门 #1：显示字体换成子集化的 Noto Serif SC 900，不再用系统默认。
   闸门 #45：原来的两道"速线"是没有语义依据的装饰，已删。 */
.title{display:grid;margin-top:var(--u3)}
.title span{grid-area:1/1;font-size:27px;font-weight:900;letter-spacing:.02em;
            line-height:1;white-space:nowrap;
            font-family:'Nianlun Title',"Songti SC",SimSun,serif}
.title .halo{-webkit-text-stroke:7px var(--paper);color:var(--paper)}
.title .edge{-webkit-text-stroke:4px var(--ink);color:var(--ink)}
.title .face{color:var(--paper)}

.tagline{margin-top:var(--u3);font-size:9.5px;letter-spacing:.06em;color:var(--grey)}

/* 手绘描边搜索框：用户点名要的搜索框 + 放大镜 + 待点击光标 */
.chip{position:relative;margin-top:var(--u5);height:19px;width:158px;
      border:1.4px solid var(--ink);border-radius:11px;background:var(--paper);
      display:flex;align-items:center;padding:0 8px;gap:var(--u1)}
.chip .q{font-size:10px;white-space:nowrap}
.chip .kw{color:var(--accent)}
.chip .caret{width:1.2px;height:11px;background:var(--ink);margin-left:var(--u2)}
.chip .btn{margin-left:auto;display:flex;align-items:center;gap:var(--u3);font-size:9px}
.mag circle,.mag line{fill:none;stroke:var(--ink);stroke-width:1.4;stroke-linecap:round}
.cursor{position:absolute;right:-3px;bottom:-7px;width:11px;height:16px}
.cursor path{fill:var(--ink);stroke:var(--paper);stroke-width:1.2}

/* 刘看山：线稿直接放进流里，和文案并排 */
.fox{width:${ART.width}px;flex:none;margin-top:calc(var(--u2) * -1);
     position:relative;z-index:1}
.fox-svg,.fox-img{width:100%;height:auto;display:block}

/* ---------- 下半：时间轴 ----------
   这一块原来死板，根因三条，逐条破：
   ① 名词式文案（共识/出现质疑/分裂/少数派）像数据表格 -> 改成当时人说的话，加「」
   ② 两行等重（年份和标签一样大） -> 改成三层级：年份小灰、百分比大墨、引语小灰
   ③ 四栏完全等宽等高 -> 珠子大小已表达比例，再把百分比做成主角，栏内自然有轻重 */
.timeline{display:flex;margin-top:auto;position:relative;z-index:1}
.cell{flex:1;display:flex;flex-direction:column;align-items:center}
.yr{font-size:7.5px;letter-spacing:.12em;color:var(--grey);margin-bottom:var(--u1);
    font-variant-numeric:tabular-nums}
.beadwrap{height:10px;display:flex;align-items:flex-end}
.bead{display:block;border:1.4px solid var(--ink);border-radius:50%;background:var(--paper)}
.rule{align-self:stretch;border-top:1.5px dashed var(--grey)}
.pct{font-size:12px;font-weight:700;letter-spacing:.01em;margin-top:var(--u1);
     font-variant-numeric:tabular-nums}
.say{font-size:8px;color:var(--grey);margin-top:0;white-space:nowrap}
.cell.now .bead,.cell.now .rule{border-color:var(--accent)}
.cell.now .pct{color:var(--accent)}

.foot{margin-top:var(--u5);display:flex;align-items:center;gap:var(--u5);
      position:relative;z-index:1}
.foot i{display:block;height:1px;flex:1;background:var(--dot)}
.foot span{font-size:9.5px;font-weight:600;letter-spacing:.14em;white-space:nowrap}
</style></head>
<body>

<div class="poster">
  <svg class="doodles" viewBox="0 0 315 175" aria-hidden="true">
    <defs>
      <pattern id="halftone" width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.85" fill="var(--dot)"/>
      </pattern>
    </defs>
    <!-- 半调网点：压在刘看山后面，像 #2 里火箭尾焰那种印刷质感 -->
    <rect x="228" y="8" width="80" height="58" fill="url(#halftone)"/>
    <!-- 雪地脚印：唯一保留的装饰。原先那两条虚线轨迹 + 淡椭圆 + 雪屋已删除：
         虚线不承载信息，雪屋又正好挤在沙漏旁边（用户指出三处）。 -->
    <g class="soft">
      <ellipse cx="196" cy="27" rx="2" ry="1.6"/>
      <ellipse cx="193.8" cy="23.6" rx=".85" ry=".75"/>
      <ellipse cx="197.4" cy="23" rx=".85" ry=".75"/>
    </g>
    <path class="star" d="M205 12 l2.4 5.4 5.4 2.4 -5.4 2.4 -2.4 5.4 -2.4 -5.4 -5.4 -2.4 5.4 -2.4z"/>
  </svg>

  <div class="top">
    <div class="left">
      <div class="eyebrow"><i></i>知乎黑客松 2026 · <b>校园新锐季</b><i></i></div>
      <div class="title"><span class="halo">观念年轮</span><span class="edge">观念年轮</span><span class="face">观念年轮</span></div>
      <div class="tagline">你的观点，还剩多少保质期</div>
      <div class="chip">
        <span class="q">买房是最好的<span class="kw">投资</span></span><span class="caret"></span>
        <span class="btn">搜索
          <svg class="mag" width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
            <circle cx="5" cy="5" r="3.6"/><line x1="7.8" y1="7.8" x2="11" y2="11"/>
          </svg>
        </span>
        <svg class="cursor" viewBox="0 0 11 16" aria-hidden="true">
          <path d="M1 1 L1 12.4 L3.9 9.6 L5.9 14.6 L8.1 13.6 L6.2 8.8 L10 8.6 Z"/>
        </svg>
      </div>
    </div>
    <div class="fox">${fox}</div>
  </div>

  <div class="timeline">
${ROWS.map(([y, s, p], i) => `    <div class="cell${i === ROWS.length - 1 ? ' now' : ''}">
      <div class="yr">${y}</div>
      <div class="beadwrap"><i class="bead" style="width:${(2.5 + p * 0.10).toFixed(1)}px;height:${(2.5 + p * 0.10).toFixed(1)}px"></i></div>
      <div class="rule"></div>
      <div class="pct">${p}%</div>
      <div class="say">${s}</div>
    </div>`).join('\n')}
  </div>

  <div class="foot"><i></i><span>每一个常识，都曾经是少数派</span><i></i></div>
</div>

<!--
  时间轴文案与出处（供提交材料核对）
${ROWS.map(([y, s, p, src]) => `    ${y}  ${s}  ${p}%  ——  ${src}`).join('\n')}

  说明：四句均为示意文案，不是核实过的真实引语。反 AI 味规范（blader/humanizer）
  禁止添加来源不明的引语，故此处如实标注。替换真实引语时只改 ROWS 的第四项，
  这一块注释会自动更新。
-->
</body></html>`;

writeFileSync(OUT, html, 'utf8');
console.log(`WROTE ${OUT}  ${html.length} chars  (fox ${fox.length} chars)`);
