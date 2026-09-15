// Generate the 刘看山 loading transition for 观念年轮.
//
// Layout is document flow, not absolute placement: the stage is a flex column,
// so 年份 / 主体 / 文案 position *each other*. Nothing is nudged with magic
// offsets, and because the number and the artwork never overlap, "数字被遮挡"
// is impossible by construction rather than by measurement.
//
// Every motion is tied to the product idea rather than being generic decoration:
//   sun rays rotate like a clock  -> time is the subject
//   a big year counter scrubs back -> "翻时间轴", driven by real load progress
//   tumbleweed rolls across       -> time passing through the desert
//   clouds drift                  -> slow, ambient time
//   刘看山 blinks                  -> the character is alive, watching the timeline
//   rings grow outward            -> 年轮
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'F:/work palce/liukanshan';

// The year counter's face. Subsetted to 0-9 only (~3.7 KB) and inlined as a
// data URI, so the loader stays a zero-dependency single file.
const FONT_FILE = 'font-BodoniModa.woff2';   // 零数字偏移（等宽），Didone 高对比
const FONT_B64 = readFileSync(`${DIR}/${FONT_FILE}`).toString('base64');
const FONT_FAMILY = "'Nianlun Digits'";
const FONT_STACK = `${FONT_FAMILY}, Georgia, 'Times New Roman', serif`;

// The original artwork is 252 wide, but its ground line -- the horizontal base
// under the cactus -- is centred at x=148, not at 126. The eye anchors on the
// cactus, so centring the BOX leaves the picture reading 27.5px right of the
// text axis. Widen the viewBox symmetrically around the ground line (2*148=296)
// so the drawing itself declares where its centre is; nothing gets cropped and
// no offset hack is needed. ART_W keeps 刘看山 the same rendered size.
const VB_W = 296;
const ART_W = 96;                       // % of the stage; leaves ~2.5% vertical slack
const VIEWBOX = `0 0 ${VB_W} 172`;

// The artwork arrives as one scene. Indices are stamped on the ORIGINAL shape
// order so the script can group scenery by number (5 = sun rays, 6/7 =
// tumbleweed, 13 = clouds, ellipse 1 = sun disc) without touching structure.
function loadFox(file) {
  let svg = readFileSync(`${DIR}/${file}`, 'utf8');
  svg = svg.replace(/<svg([^>]*?)width="[^"]*"/, '<svg$1');
  svg = svg.replace(/<svg([^>]*?)height="[^"]*"/, '<svg$1');
  svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${VIEWBOX}"`);

  let pi = -1, ei = -1, pathCount = 0, ellipseCount = 0;
  svg = svg.replace(/<path\b[^>]*\/>|<ellipse\b[^>]*\/>/g, (m) => {
    if (m.slice(0, 5) === '<path') {
      pathCount++;
      return m.replace('<path', `<path data-p="${++pi}"`);
    }
    ellipseCount++;
    return m.replace('<ellipse', `<ellipse data-e="${++ei}"`);
  });
  svg = svg.replace('<svg',
    '<svg class="lk-fox-svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true"');
  return { svg, pathCount, ellipseCount };
}

const { svg: fox, pathCount, ellipseCount } = loadFox('liukanshan_desert.ecf3c388.svg');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>观念年轮 · 加载过场</title>
<style>
  /* 年份字体：Bodoni Moda，只子集化 0-9，base64 内嵌，保持零外部依赖 */
  @font-face{
    font-family:'Nianlun Digits';
    font-weight:700;font-style:normal;font-display:block;
    src:url(data:font/woff2;base64,${FONT_B64}) format('woff2');
    unicode-range:U+30-39;
  }
  :root{
    --lk-bg:#0d1017;
    --lk-ink:#8e9ab4;
    --lk-ring:#39424f;
    --lk-hot:#e8b04b;
    --lk-text:#c8d0e0;
  }
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{
    background:var(--lk-bg);
    display:grid;place-items:center;
    font-family:"PingFang SC","Microsoft YaHei",system-ui,-apple-system,sans-serif;
    overflow:hidden;
  }
  .lk-wrap{
    display:flex;flex-direction:column;align-items:center;gap:22px;
    transition:opacity .5s ease, transform .5s ease;
  }
  .lk-wrap.lk-out{opacity:0;transform:scale(1.06)}

  /* ---------- stage ----------
     年份和插画是同一个 flex 列里的兄弟节点：上下错开，永不重叠，
     所以"数字被遮挡"在结构上就不可能发生。

     一个变量决定整块尺寸：宽度、字号、行距全部由 --s 推导，所以任何尺寸的
     设备上比例完全一致。三个约束分别是"别超出宽度""别超过 360""别超出高度"
     —— 最后一条是横屏手机（如 667x375）能正常显示的关键。 */
  .lk-stage{
    --s:min(72vw, 360px, calc(100vh - 96px));
    position:relative;
    width:var(--s);aspect-ratio:1;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    row-gap:calc(var(--s) * .044);   /* flex 不支持百分比 gap，会整条丢弃 */
  }
  .lk-rings{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:0}
  .lk-glow{
    position:absolute;left:50%;top:50%;
    width:86%;aspect-ratio:1;transform:translate(-50%,-50%);
    background:radial-gradient(circle, rgba(232,176,75,.14) 0%, rgba(232,176,75,.05) 44%, transparent 70%);
    z-index:0;pointer-events:none;
    animation:lk-breathe 3.2s ease-in-out infinite;
  }
  @keyframes lk-breathe{0%,100%{opacity:.7}50%{opacity:1}}

  /* ---------- 年份 ----------
     数字相对自己往下移 35.15% 舞台，让云朵落在它一半高度上。
     用 position:relative + top（相对位移），不是负外边距 —— 负外边距会把
     插画一起拉上来，"移动数字"和"移动主体"在视觉上不是一回事。
     图层在后面（z-index 低于插画）：主体压在数字之上，数字从云的上下探出来。
     At 0.28 the gold reads as bronze rather than mud, and it lifts to 0.46
     once real progress arrives. */
  .lk-year{
    position:relative;z-index:1;
    top:calc(var(--s) * .3515);
    font-family:${FONT_STACK};
    font-size:calc(var(--s) * .372);font-weight:700;
    letter-spacing:.01em;line-height:1;
    font-variant-numeric:tabular-nums lining-nums;
    font-feature-settings:"tnum" 1,"lnum" 1;
    color:#f0bd63;opacity:.34;
    pointer-events:none;user-select:none;
    transition:opacity .4s ease;
  }
  .lk-stage.lk-hasprogress .lk-year{opacity:.56}

  /* ---------- 插画 ----------
     在数字之上。viewBox 已经把重心定在底部横线上（见文件头），
     所以流里水平居中就等于横线落在中轴上。 */
  .lk-art{position:relative;z-index:2;width:${ART_W}%;pointer-events:none}
  .lk-art .lk-fox-svg{filter:drop-shadow(0 12px 28px rgba(0,0,0,.6))}

  /* ---------- 年轮 ---------- */
  .lk-ring{
    fill:none;stroke:var(--lk-ring);stroke-width:1;
    transform-origin:200px 200px;opacity:0;
    animation:lk-ripple 2.8s cubic-bezier(.22,.61,.36,1) infinite;
  }
  .lk-ring:nth-child(1){animation-delay:0s}
  .lk-ring:nth-child(2){animation-delay:.32s}
  .lk-ring:nth-child(3){animation-delay:.64s}
  .lk-ring:nth-child(4){animation-delay:.96s}
  .lk-ring:nth-child(5){animation-delay:1.28s}
  .lk-ring:nth-child(6){animation-delay:1.60s}
  @keyframes lk-ripple{
    0%{transform:scale(.34);opacity:0}
    12%{opacity:.9}
    70%{opacity:.22}
    100%{transform:scale(1);opacity:0}
  }

  .lk-arc{
    fill:none;stroke:var(--lk-hot);stroke-width:2;stroke-linecap:round;
    transform:rotate(-90deg);transform-origin:200px 200px;
    opacity:0;transition:opacity .3s ease;
  }
  .lk-stage.lk-hasprogress .lk-arc{opacity:1}

  /* ---------- 刘看山：描边自绘 ---------- */
  .lk-fox-svg{height:auto;display:block;overflow:hidden}
  .lk-fox-svg path{
    stroke-dasharray:var(--lk-len,1000);
    stroke-dashoffset:var(--lk-len,1000);
    fill-opacity:0;
    animation:
      lk-draw .5s cubic-bezier(.5,0,.2,1) forwards var(--lk-delay,0s),
      lk-fill .34s ease forwards calc(var(--lk-delay,0s) + .46s);
  }
  @keyframes lk-draw{to{stroke-dashoffset:0}}
  @keyframes lk-fill{to{fill-opacity:1}}

  /* ellipses are not part of the line-draw sequence; they just fade in */
  .lk-fox-svg ellipse{opacity:0;animation:lk-appear .4s ease forwards var(--lk-edelay,.9s)}
  @keyframes lk-appear{to{opacity:1}}

  /* --- the character is alive: it blinks --- */
  .lk-fox-svg [data-e="0"]{
    transform-box:fill-box;transform-origin:center;
    animation:lk-appear .4s ease forwards var(--lk-edelay,.9s),
              lk-blink 5.4s ease-in-out 1.6s infinite;
  }
  @keyframes lk-blink{
    0%,90%,100%{transform:scaleY(1)}
    94%,96%{transform:scaleY(.06)}
  }

  /* --- sun rays turn like a clock hand: time is the subject --- */
  .lk-sun{transform-box:fill-box;transform-origin:center;animation:lk-clock 18s linear infinite}
  @keyframes lk-clock{to{transform:rotate(360deg)}}

  /* --- clouds drift --- */
  .lk-cloud{animation:lk-drift 26s ease-in-out infinite}
  @keyframes lk-drift{0%,100%{transform:translateX(0)}50%{transform:translateX(-9px)}}

  /* --- tumbleweed rolls past: time moving through the desert --- */
  .lk-tumble{
    animation:lk-roll 11s linear infinite;
    opacity:0;
  }
  @keyframes lk-roll{
    0%{transform:translate(26px,6px);opacity:0}
    12%{opacity:.95}
    82%{opacity:.95}
    100%{transform:translate(-34px,-2px);opacity:0}
  }

  /* ---------- 文案：流里的最后一行 ---------- */
  .lk-text{text-align:center}
  .lk-title{font-size:15px;letter-spacing:.34em;color:var(--lk-text);margin-bottom:9px;font-weight:500}
  .lk-sub{font-size:13px;color:var(--lk-ink);letter-spacing:.05em;height:1.4em;transition:opacity .35s ease}
  .lk-sub.lk-fade{opacity:0}

  @media (prefers-reduced-motion:reduce){
    .lk-ring,.lk-glow,.lk-sun,.lk-cloud,.lk-tumble,.lk-fox-svg [data-e="0"]{animation:none}
    .lk-ring{opacity:.3}
    .lk-tumble{opacity:0}
    .lk-fox-svg path{stroke-dashoffset:0;fill-opacity:1;animation:none}
    .lk-fox-svg ellipse{opacity:1;animation:none}
  }
</style>
</head>
<body>

<div class="lk-wrap" id="lk-wrap">
  <div class="lk-stage" id="lk-stage">
    <svg class="lk-rings" viewBox="0 0 400 400" aria-hidden="true">
      <circle class="lk-ring" cx="200" cy="200" r="192"/>
      <circle class="lk-ring" cx="200" cy="200" r="160"/>
      <circle class="lk-ring" cx="200" cy="200" r="128"/>
      <circle class="lk-ring" cx="200" cy="200" r="96"/>
      <circle class="lk-ring" cx="200" cy="200" r="66"/>
      <circle class="lk-ring" cx="200" cy="200" r="40"/>
      <circle class="lk-arc" id="lk-arc" cx="200" cy="200" r="184"/>
    </svg>
    <div class="lk-glow"></div>

    <div class="lk-year" id="lk-year">2026</div>
    <div class="lk-art">${fox}</div>
  </div>

  <div class="lk-text">
    <div class="lk-title">观念年轮</div>
    <div class="lk-sub" id="lk-sub">正在翻时间轴…</div>
  </div>
</div>

<script>
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.querySelector('.lk-fox-svg');

  // 1. Drawing order + per-path stroke length so each stroke draws itself.
  var paths = [].slice.call(svg.querySelectorAll('path'));
  paths.forEach(function (p, i) {
    var len = 1000;
    try { len = Math.ceil(p.getTotalLength()) || 1000; } catch (e) {}
    p.style.setProperty('--lk-len', len);
    p.style.setProperty('--lk-delay', (i * 0.04).toFixed(3) + 's');
  });

  // 2. Group parts that must move together. Wrapping is only safe when the
  //    members already share a parent, otherwise transforms would shift them.
  function group(selectors, cls) {
    var els = [];
    selectors.forEach(function (s) {
      var n = svg.querySelector(s);
      if (n) els.push(n);
    });
    if (els.length < 2) return null;
    var parent = els[0].parentNode;
    if (!els.every(function (e) { return e.parentNode === parent; })) return null;
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', cls);
    parent.insertBefore(g, els[0]);
    els.forEach(function (e) { g.appendChild(e); });
    return g;
  }

  // sun disc (ellipse #1) + its rays (path #5) turn together
  group(['[data-p="5"]', '[data-e="1"]'], 'lk-sun');
  // tumbleweed: outer spiral (6) + inner spiral (7)
  group(['[data-p="6"]', '[data-p="7"]'], 'lk-tumble');
  // the two clouds live in a single path (13)
  var cloud = svg.querySelector('[data-p="13"]');
  if (cloud) cloud.classList.add('lk-cloud');

  // 3. Progress arc + the year scrubber: loading progress IS time advancing.
  var arc = document.getElementById('lk-arc');
  var R = 184, C = 2 * Math.PI * R;
  arc.style.strokeDasharray = C;
  arc.style.strokeDashoffset = C;

  var yearEl = document.getElementById('lk-year');
  var YEAR_FROM = 2010, YEAR_TO = 2026;
  var YEAR_RUN_MS = 4200;          // fast off the line, long slow settle on 2026
  var stage = document.getElementById('lk-stage');
  var wrap = document.getElementById('lk-wrap');
  var sub = document.getElementById('lk-sub');
  var timer = null;
  var yearRaf = null, yearT0 = 0, yearRunning = false, yearExternal = false, lastYear = -1;

  // 先快后慢. easeOutCubic covers most of the distance in the first third and
  // then crawls, so the number visibly decelerates and locks onto 2026.
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function paintYear(v) {
    var t = Math.max(0, Math.min(1, v));
    var y = Math.round(YEAR_FROM + (YEAR_TO - YEAR_FROM) * easeOutCubic(t));
    if (y !== lastYear) { lastYear = y; yearEl.textContent = String(y); }
  }

  function yearLoop(ts) {
    if (!yearRunning || yearExternal) return;
    if (!yearT0) yearT0 = ts;
    var t = Math.min(1, (ts - yearT0) / YEAR_RUN_MS);
    paintYear(t);
    if (t < 1) { yearRaf = requestAnimationFrame(yearLoop); }
    else { yearRunning = false; }   // 定格在 2026，不回跳
  }

  var LINES = [
    '正在翻时间轴…',
    '正在找第一个说这话的人…',
    '正在数有几个人说中了…',
    '正在算还剩多少保质期…'
  ];
  var li = 0;

  window.LiukanshanLoader = {
    start: function () {
      // the year runs once on its own: fast -> slow -> holds on 2026
      yearRunning = true; yearT0 = 0;
      yearRaf = requestAnimationFrame(yearLoop);
      timer = setInterval(function () {
        sub.classList.add('lk-fade');
        setTimeout(function () {
          li = (li + 1) % LINES.length;
          sub.textContent = LINES[li];
          sub.classList.remove('lk-fade');
        }, 350);
      }, 2200);
    },

    progress: function (v) {
      if (v == null) { stage.classList.remove('lk-hasprogress'); return; }
      stage.classList.add('lk-hasprogress');
      var p = Math.max(0, Math.min(1, v));
      arc.style.strokeDashoffset = C * (1 - p);
      // real progress takes over and advances the year on the same curve
      yearExternal = true; yearRunning = false;
      if (yearRaf) cancelAnimationFrame(yearRaf);
      paintYear(p);
    },

    done: function (onGone) {
      clearInterval(timer);
      yearExternal = true; yearRunning = false;
      if (yearRaf) cancelAnimationFrame(yearRaf);
      sub.textContent = '好了';
      paintYear(1);                 // 定格 2026
      stage.classList.add('lk-done');
      setTimeout(function () {
        wrap.classList.add('lk-out');
        setTimeout(function () { if (onGone) onGone(); }, 520);
      }, 620);
    }
  };

  LiukanshanLoader.start();

  if (location.search.indexOf('demo') > -1) {
    var t0 = Date.now();
    var iv = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / 4600);
      LiukanshanLoader.progress(p);
      if (p >= 1) { clearInterval(iv); LiukanshanLoader.done(); }
    }, 60);
  }
})();
</script>
</body>
</html>`;

writeFileSync(`${DIR}/liukanshan-loader.html`, html, 'utf8');
console.log(`WROTE liukanshan-loader.html  ${html.length} chars  (paths=${pathCount} ellipses=${ellipseCount})`);
