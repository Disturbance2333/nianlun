// 生成 nianlun-web/index.html
// 把 liukanshan-loader 的动画提取、浅色化，作为网站打开动画内联进主页面。
// 布局是上下分区：页顶一块长方形年轮，文章区是它下面的第二节，整页可滚。
import fs from 'node:fs';

const LOADER = 'F:/work palce/liukanshan/liukanshan-loader.html';
const OUT = 'F:/work palce/nianlun-web/index.html';

const src = fs.readFileSync(LOADER, 'utf8');
const rawCss = src.match(/<style>([\s\S]*?)<\/style>/)[1];
const rawBody = src.match(/<body>\s*([\s\S]*?)\s*(?=<script)/)[1].trim();
const rawScript = src.match(/<script>([\s\S]*?)<\/script>/)[1];
// 只去掉结尾的 demo 自启动（start() 调用 + demo 进度条那段），
// 但必须把 IIFE 的闭合 `})();` 补回来 —— 之前直接按 start() 位置截断，
// 闭合被一起切掉，内联进页面就是个语法错误，
// window.LiukanshanLoader 永远挂不上，年份自然一动不动。
const api = rawScript.slice(0, rawScript.lastIndexOf('LiukanshanLoader.start()')).trimEnd()
  + '\n})();\n';

// ── 缩短年份滚动 ──
// 原片是 4200ms，作为独立的加载过场没问题；但这里它是"开门"动作，
// 后面还要接首屏，5 秒多的开场每次刷新都要等，太黏。
// 压到 2200ms：easeOutCubic 的减速段仍然看得出来，不会变成生硬的跳数。
const YEAR_RUN_MS = 2200;
const apiFast = api.replace(/var YEAR_RUN_MS = \d+/, `var YEAR_RUN_MS = ${YEAR_RUN_MS}`);

// ── 动画浅色化 ──
// 原动画是深色底（#0d1017）。网站是纸色，把整套色板换掉，
// 并把那圈暖黄光晕换成知乎蓝，跟网站 --accent 对齐。
let css = rawCss
  .replace(/--lk-bg\s*:\s*#[0-9a-fA-F]+/g,   '--lk-bg:#FBF9F4')
  .replace(/--lk-text\s*:\s*#[0-9a-fA-F]+/g, '--lk-text:#17191C')
  .replace(/--lk-ink\s*:\s*#[0-9a-fA-F]+/g,  '--lk-ink:#2C3238')
  .replace(/--lk-ring\s*:\s*#[0-9a-fA-F]+/g, '--lk-ring:#D8D3C7')
  .replace(/--lk-hot\s*:\s*#[0-9a-fA-F]+/g,  '--lk-hot:#0F62D6')
  .replace(/rgba\(232,\s*176,\s*75,\s*\.14\)/g, 'rgba(15,98,214,.10)')
  .replace(/rgba\(232,\s*176,\s*75,\s*\.05\)/g, 'rgba(15,98,214,.04)')
  .replace(/rgba\(232,\s*176,\s*75,([^)]*)\)/g, 'rgba(15,98,214,$1)');

// 深色底下用的投影在纸色上会脏，去掉
css = css.replace(/filter:drop-shadow\([^)]*\);?/g, '');

// 动画原本铺满整个 body，这里它只是首屏的一层，作用域收进 #opening
css = css.replace(/(^|\n)\s*(html|body)\s*\{[^}]*\}/g, '\n');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>观念年轮 · 刘看山替你翻旧账</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23FBF9F4'/%3E%3Cg fill='none' stroke='%2317191C' stroke-width='1.4'%3E%3Ccircle cx='16' cy='16' r='4'/%3E%3Ccircle cx='16' cy='16' r='9'/%3E%3Ccircle cx='16' cy='16' r='13.5'/%3E%3C/g%3E%3C/svg%3E">
<style>
/* ══ 刘看山打开动画（自 liukanshan-loader.html 提取，已浅色化）══ */
${css}

/* 打开动画那一层：铺满首屏，播完淡出 */
#opening{
  position:fixed;inset:0;z-index:100;
  background:#FBF9F4;
  display:flex;align-items:center;justify-content:center;
  transition:opacity .72s cubic-bezier(.22,.61,.36,1),
             visibility 0s linear .72s;
}
#opening.gone{opacity:0;visibility:hidden;pointer-events:none}

/* ══ 网站本体 ══ */
:root{
  --paper:#FBF9F4; --ink:#17191C; --grey:#6B7280; --dot:#DDE1E6;
  --accent:#0F62D6; --doubt:#B4472F; --believe:#2F6B4F;
  --line:#E6E2D9;
  --ease:cubic-bezier(.22,.61,.36,1);
  /* 黄金分割 */
  --phi-s:38.2%; --phi-l:61.8%;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{overflow-x:clip}
body{
  background:var(--paper);color:var(--ink);
  font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;line-height:1.7;
}

/* ── 首屏：搜索框居中 ── */
#hero{
  position:fixed;inset:0;z-index:20;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:var(--paper);
  /* 标题落在视口上方黄金分割点，不是几何正中 */
  padding-bottom:12vh;
  opacity:0;
  transition:opacity .6s var(--ease);
}
/* 首屏可见性只由 JS 的内联 style 控制，CSS 这里不写第二条规则。
   踩过的坑：原来靠兄弟选择器让首屏露出来，
   但 opening.remove() 一把 #opening 摘掉，选择器当场失配，
   #hero 掉回 opacity:0 —— 表现就是首屏闪一下就没了。 */
#hero.gone{opacity:0;pointer-events:none}
.hero-title{
  font-size:clamp(30px,5vw,50px);font-weight:800;letter-spacing:.02em;
  font-family:"Songti SC",SimSun,serif;text-align:center;
}
.hero-sub{
  margin-top:10px;font-size:15px;color:var(--grey);text-align:center;
  max-width:420px;line-height:1.7;
}
.hero-search{
  margin-top:38px;display:flex;gap:10px;width:min(520px,90vw);
  position:relative;      /* 推荐浮层按它定位，不参与布局 */
}
.hero-search input{
  flex:1;height:50px;padding:0 20px;font-size:16px;
  border:1.8px solid var(--ink);border-radius:28px;
  background:var(--paper);color:var(--ink);outline:none;font-family:inherit;
  transition:border-color .2s,box-shadow .2s;
}
.hero-search input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(15,98,214,.12)}
/* 只作用于「翻旧账」那个按钮，用 **>** 限定成直接子元素。
   否则这两条会漏进推荐层（.sugbox）里：height:50px 和 border-radius:28px
   都不是 .sugbox button 声明的属性，于是被继承过去 —— 推荐行的行高和圆角
   就跟顶栏那份对不上了。跟 #topbar > button 是同一个坑。 */
.hero-search > button{
  height:50px;padding:0 28px;font-size:15px;font-weight:600;
  border:1.8px solid var(--ink);border-radius:28px;
  background:var(--ink);color:var(--paper);cursor:pointer;font-family:inherit;
  white-space:nowrap;transition:background .2s,opacity .2s;
}
.hero-search > button:hover{background:#2d3138}
.hero-search > button:disabled{opacity:.4;cursor:not-allowed}
.hero-hints{
  margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;
  justify-content:center;max-width:min(560px,92vw);
}
.hero-hints span{font-size:12px;color:var(--grey)}
.hero-hints button{
  font-size:12px;padding:4px 14px;border-radius:14px;cursor:pointer;
  border:1px solid var(--line);background:transparent;color:var(--grey);
  font-family:inherit;transition:border-color .15s,color .15s;
}
.hero-hints button:hover{border-color:var(--accent);color:var(--accent)}

/* ── 输入推荐 ──
   输入关键词就出，靠的是**一条**搜索调用（0.76s），不是那 15 条扇出（13s）。
   候选是知乎给出的真实标题，原样照搬、不改写、不生成。
   绝对定位挂在输入框下面：出推荐时页面不跳，首屏那些元素一动不动。

   首屏（.hero-search）和顶栏（.tb-search）两个输入框共用这一套 ——
   只挂首屏的话，搜过一次首屏就藏起来了，顶栏再输入就没推荐了。 */
.sugbox{
  position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:30;
  display:none;max-height:min(46vh,360px);overflow-y:auto;overscroll-behavior:contain;
  border:1px solid var(--line);border-radius:12px;background:var(--paper);
  box-shadow:0 16px 38px -18px rgba(23,25,28,.26);
}
.sugbox.show{display:block}
.sugbox .s-hd{
  padding:7px 16px;font-size:11.5px;color:var(--grey);
  background:rgba(15,98,214,.045);
}
.sugbox button{
  display:flex;gap:12px;align-items:baseline;width:100%;
  padding:9px 16px;border:none;border-top:1px solid var(--line);
  background:transparent;cursor:pointer;font-family:inherit;
  font-size:13.5px;color:var(--ink);text-align:left;line-height:1.5;
}
.sugbox button:first-of-type{border-top:none}
.sugbox button:hover{background:rgba(15,98,214,.05)}
.sugbox button:hover .s-t{color:var(--accent)}
.sugbox .s-t{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sugbox .s-v{flex:none;font-size:11.5px;color:var(--grey);
             font-variant-numeric:tabular-nums}

/* ── 顶栏：搜索后搜索框上移缩短 ── */
#topbar{
  position:fixed;top:0;left:0;right:0;z-index:19;
  background:rgba(251,249,244,.92);backdrop-filter:blur(8px);
  border-bottom:1px solid var(--line);
  padding:12px 24px;display:flex;align-items:center;gap:12px;
  transform:translateY(-100%);
  transition:transform .55s var(--ease);
}
#topbar.visible{transform:translateY(0)}
#topbar .tb-title{
  font-weight:800;font-size:18px;font-family:"Songti SC",SimSun,serif;
  white-space:nowrap;cursor:pointer;
}
/* 顶栏的输入框也要能出推荐（搜过一次之后首屏就藏起来了，
   这时能打字的就是这一个），所以给它一个定位容器 */
.tb-search{position:relative;flex:1;max-width:380px}
.tb-search input{width:100%}
#topbar input{
  height:40px;padding:0 16px;font-size:14px;
  border:1.5px solid var(--ink);border-radius:22px;
  background:var(--paper);color:var(--ink);outline:none;font-family:inherit;
}
#topbar input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(15,98,214,.1)}
/* 只作用于「翻旧账」那个按钮，用 **>** 限定成直接子元素。
   否则这条带 id 的规则（特异性 1,0,1）会盖掉 .sugbox button（0,1,1），
   把推荐层里每一行都染成深墨底 + 纸色字 —— 踩过。
   首屏那边曾用 .hero-search button（0,1,1），跟 .sugbox 打平、靠书写顺序
   侥幸没露馅，但 height/radius 仍会漏过去；两边现在都用 > 限定了。 */
#topbar > button{
  height:40px;padding:0 20px;font-size:14px;font-weight:600;
  border:1.5px solid var(--ink);border-radius:22px;
  background:var(--ink);color:var(--paper);cursor:pointer;font-family:inherit;
  white-space:nowrap;
}
#topbar > button:hover{background:#2d3138}
#topbar > button:disabled{opacity:.4;cursor:not-allowed}

/* ── 主体：上下分区，整页可滚 ── */
/* 不用 fixed 了：文章区现在是真的第二节，得靠文档流把它顶到
   年轮下面，页面才滚得动。display 切换而不是 opacity，
   否则没搜索时它也占着高度，首屏背后会多出一条滚动条。 */
#main{display:none;padding-top:76px}
#main.visible{display:block;animation:fadein .45s var(--ease)}
@keyframes fadein{from{opacity:0}to{opacity:1}}
/* 状态行：顶栏之下、年轮之上，占布局高度 */
#status{
  padding:0 28px;
  max-width:min(760px,92vw);
  font-size:12.5px;color:var(--grey);line-height:1.6;
}

/* ── 候选说法条 ──
   用户输入的不是断言时（比如只输了个「张雪峰」），在结果上方给几条
   改写好的说法让他一键换。**刻意不阻塞**：结果已经照原话搜出来了，
   这条只是提示，点不点都行 —— 拿几秒的模型往返去挡在搜索前面，
   换来的是"每次都多等一段"，不值。 */
.hintbar{
  display:none;align-items:center;flex-wrap:wrap;gap:8px;
  margin:0 28px 12px;padding:10px 14px;
  border-left:2.5px solid var(--accent);
  background:rgba(15,98,214,.045);border-radius:0 8px 8px 0;
  font-size:12.5px;color:var(--grey);
}
.hintbar.show{display:flex}
.hintbar .hb-label{color:var(--ink)}
.hintbar button.hb-chip{
  font-size:12.5px;padding:4px 14px;border-radius:14px;cursor:pointer;
  border:1px solid var(--line);background:var(--paper);color:var(--ink);
  font-family:inherit;transition:border-color .15s,color .15s;
  /* 候选是知乎上真实存在的标题，可能很长 —— 按钮里截断显示，
     完整那句挂在 title 和 data-q 上：hover 看得到，点了搜的也是完整那句 */
  max-width:min(400px,70vw);overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;text-align:left;
}
.hintbar button.hb-chip:hover{border-color:var(--accent);color:var(--accent)}
.hintbar .hb-close{
  margin-left:auto;border:none;background:transparent;cursor:pointer;
  color:var(--grey);font-size:16px;line-height:1;padding:2px 6px;
}
.hintbar .hb-close:hover{color:var(--ink)}

/* ══ 年轮：页面顶部一块长方形 ══
   不再铺满视口。同心圆是这块里的背景纹理，
   年份沿一条弧线从中心（偏右上）排到这块的左下角。
   弧线几何是按这块的宽高解的，跟以前一样自适应；
   多出来的环线由 overflow:hidden 裁掉，不侵入下面的文章区。 */
.stage{
  position:relative;
  width:100%;
  height:clamp(520px,66vh,700px);
  margin-top:10px;
  overflow:hidden;
  pointer-events:none;
}
.ringbox{
  position:absolute;inset:0;
  width:100%;height:100%;
  pointer-events:auto;
}
.ringbox svg{width:100%;height:100%;display:block;overflow:visible}

/* ── 年轮 ──
   环线退成背景纹理：比原来更淡，因为现在它铺满整页，
   跟内容抢注意力就会很吵。 */
.ring{fill:none;stroke:var(--line);stroke-width:1;opacity:.55}
.ring.on{stroke:var(--dot);opacity:.9}
.node{cursor:pointer}
.node circle{fill:var(--paper);stroke:var(--ink);stroke-width:1.6;
             transition:r .28s var(--ease),fill .2s,stroke .2s}
.node text.yr{font-size:13px;fill:var(--ink);letter-spacing:.06em;font-weight:600;
           font-variant-numeric:tabular-nums;user-select:none;
           paint-order:stroke fill;stroke:var(--paper);stroke-width:4px;
           stroke-linejoin:round;transition:fill .2s}
/* 条数：年份下面一行小字，让数据量直接可读 */
.node text.cnt{font-size:10px;fill:var(--grey);letter-spacing:.02em;
           font-variant-numeric:tabular-nums;user-select:none;
           paint-order:stroke fill;stroke:var(--paper);stroke-width:3.5px;
           stroke-linejoin:round;transition:fill .2s}
.node:hover circle{stroke:var(--accent)}
.node:hover text.yr{fill:var(--accent)}
.node.sel circle{fill:var(--accent);stroke:var(--accent)}
.node.sel text.yr{fill:var(--accent);font-weight:800}
.seedtext{font-size:15px;fill:var(--ink);font-weight:700;text-anchor:middle;
          paint-order:stroke fill;stroke:var(--paper);stroke-width:5px;stroke-linejoin:round}
.seedsub{font-size:11px;fill:var(--grey);text-anchor:middle;
         paint-order:stroke fill;stroke:var(--paper);stroke-width:4px;stroke-linejoin:round}
.seedhole{fill:var(--paper)}
@keyframes ringdraw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
@keyframes nodein{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
.anim .ring{stroke-dasharray:var(--len);animation:ringdraw .9s var(--ease) both;
            animation-delay:var(--d)}
.anim .node{opacity:0;transform-box:fill-box;transform-origin:center;
            animation:nodein .5s var(--ease) both;animation-delay:calc(var(--d) + .34s)}

/* 检索等待：中心呼吸空圈。
   不再需要右栏灰条 —— 现在没有右栏，等待态就是年轮自己在呼吸。 */
@keyframes breathe{0%,100%{opacity:.22}50%{opacity:.6}}
.skeleton circle{fill:none;stroke:var(--line);stroke-width:1.1;
                 animation:breathe 1.9s ease-in-out infinite;
                 animation-delay:var(--d)}
.loadword{font-size:13px;fill:var(--grey);text-anchor:middle;letter-spacing:.2em}

/* ── 文章区：年轮下面第二节 ──
   不再是点开后盖在年轮上的浮层。它有自己的位置，
   搜完就摆在这儿（默认选中最近一年），点年份换的是它的内容。
   窄栏居中：一屏 860px 的行宽读起来才不费劲。 */
.panel{
  max-width:860px;
  margin:0 auto;
  padding:18px 28px 90px;
  border-top:1px solid var(--line);
}
.yearhead{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.yearhead h2{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;
             font-family:"Songti SC",SimSun,serif}
.yearhead .meta{font-size:13px;color:var(--grey)}
.summary{margin-top:14px;padding:16px 18px;border-left:2.5px solid var(--accent);
         background:rgba(15,98,214,.045);border-radius:0 8px 8px 0}
.summary p{font-size:16px;line-height:1.85;font-family:"Songti SC",SimSun,serif}
.summary .from{margin-top:8px;font-size:12px;color:var(--grey)}
.summary .from em{font-style:normal;color:var(--ink)}
/* AI 挑句的标记：摘要那句到底是启发式挑的还是模型挑的，如实标出来 */
.aibadge{
  display:inline-block;font-size:10.5px;padding:0 6px;border-radius:8px;
  border:1px solid rgba(15,98,214,.35);color:var(--accent);
  margin-left:6px;vertical-align:1px;
}
.bar{display:flex;height:6px;border-radius:3px;overflow:hidden;margin-top:16px;
     background:var(--line)}
.bar i{display:block;height:100%}
.bar .b{background:var(--believe)} .bar .d{background:var(--doubt)}
.bar .m{background:var(--dot)}
.barlegend{margin-top:8px;font-size:12px;color:var(--grey);display:flex;
           gap:16px;flex-wrap:wrap;align-items:center}
.barlegend b{font-weight:600;color:var(--ink)}
.barlegend .dotb,.barlegend .dotd,.barlegend .dotm{
  display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
.barlegend .dotb{background:var(--believe)}
.barlegend .dotd{background:var(--doubt)}
.barlegend .dotm{background:var(--dot)}
.list{margin-top:22px;display:flex;flex-direction:column;gap:2px}
.item{display:block;padding:14px 2px;border-top:1px solid var(--line);
      text-decoration:none;color:inherit;transition:background .15s}
.item:hover{background:rgba(15,98,214,.04)}
.item .t{font-size:15px;font-weight:600;line-height:1.5}
.item:hover .t{color:var(--accent)}
.item .x{margin-top:6px;font-size:13.5px;color:var(--grey);line-height:1.75}
.item .f{margin-top:8px;font-size:12px;color:var(--grey);display:flex;
         gap:14px;flex-wrap:wrap;align-items:center}
.tag{font-size:11px;padding:1px 8px;border-radius:10px;border:1px solid var(--line)}
.tag.d{color:var(--doubt);border-color:rgba(180,71,47,.35)}
.tag.b{color:var(--believe);border-color:rgba(47,107,79,.35)}
.note{margin-top:28px;padding-top:16px;border-top:1px solid var(--line);
      font-size:12px;color:var(--grey);line-height:1.8}
.empty{color:var(--grey);font-size:14px;padding:40px 0}

@media (prefers-reduced-motion:reduce){
  .anim .ring,.anim .node{animation:none;stroke-dashoffset:0;opacity:1;transform:none}
  #opening,#hero,#topbar{transition:none}
  #main{animation:none}
}
</style>
</head>
<body>

<!-- ══ 打开动画 ══ -->
<div id="opening">
${rawBody}
</div>

<!-- ══ 首屏 ══ -->
<div id="hero">
  <div class="hero-title">观念年轮</div>
  <p class="hero-sub">每一个常识，都曾经是少数派。<br>输入一句你信以为真的话，看它这些年被信了多少。</p>
  <div class="hero-search">
    <input id="hero-q" type="text" placeholder="比如：买房是最好的投资"
           autocomplete="off" aria-label="输入一句你信以为真的话">
    <button id="hero-go">翻旧账</button>
    <div class="sugbox" id="hero-sug"></div>
  </div>
  <div class="hero-hints">
    <span>试试：</span>
    <button data-q="买房是最好的投资">买房是最好的投资</button>
    <button data-q="读研一定比本科好找工作">读研一定比本科好找工作</button>
    <button data-q="女性不被定义">女性不被定义</button>
    <button data-q="孝顺是一种过时的观念">孝顺是一种过时的观念</button>
  </div>
</div>

<!-- ══ 顶栏 ══ -->
<div id="topbar">
  <span class="tb-title" id="tb-home">观念年轮</span>
  <div class="tb-search">
    <input id="tb-q" type="text" autocomplete="off" aria-label="重新搜索">
    <div class="sugbox" id="tb-sug"></div>
  </div>
  <button id="tb-go">翻旧账</button>
</div>

<!-- ══ 主体 ══ -->
<div id="main">
  <div class="hintbar" id="hintbar"></div>
  <div id="status"></div>
  <main class="stage">
    <div class="ringbox"><svg id="rings" aria-label="观念年轮"></svg></div>
  </main>
  <section class="panel" id="panel"></section>
</div>

<script>
/* 刘看山打开动画的原始 API（提取自 liukanshan-loader.html，仅改了年份时长） */
${apiFast}
/* 把时长挂出来给 app.js 读，省得两边各写一个数字、改一处忘一处 */
window.LK_YEAR_RUN_MS = ${YEAR_RUN_MS};
</script>
<script src="app.js"></script>
</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log('WROTE', OUT, html.length, 'chars');
