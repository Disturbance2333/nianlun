/* 观念年轮 · 前端
   ─────────────────────────────────────────────────────────────
   四段流程：
     opening  进站先放刘看山动画，年份滚到 2026 后停 1 秒才让路
     idle     搜索框停在首屏偏上（视口黄金分割点），只有它
     loading  搜索框上移成顶栏，年轮那块画呼吸空圈，文章区清空
     result   年轮由内向外描出来，默认选中最近一年，点年份换下面的文章

   年轮本身的画法和布局解算沿用上一版，未改。
   ─────────────────────────────────────────────────────────────*/

const SVG = 'http://www.w3.org/2000/svg';
const $ = (s) => document.querySelector(s);

const opening  = $('#opening');
const hero     = $('#hero');
const heroQ    = $('#hero-q');
const heroGo   = $('#hero-go');
const topbar   = $('#topbar');
const tbQ      = $('#tb-q');
const tbGo     = $('#tb-go');
const tbHome   = $('#tb-home');
const mainEl   = $('#main');
const statusEl = $('#status');
const hintbar  = $('#hintbar');
const heroSug  = $('#hero-sug');
const tbSug    = $('#tb-sug');
const stage    = $('.stage');
const box      = $('#rings');
const panel    = $('#panel');

/* 几何：年轮是页顶一块长方形，圆心就落在这块的正中，年份沿一个正圆
   均匀排开（从正上方起，顺时针一年一格）。
   所有量都按这块的宽高算，写成函数而不是常量 —— 换视口/换块高都自适应。 */
const GEO = {
  r0: 85,        // 中心留白的半径上限，那句话的地盘
  margin: 22,    // 标签盒离框边至少留这么远
  gap: 14,       // 节点圆外缘到标签内缘的距离
  tex: 0.95,     // 背景环线最大画到「框的长边 × 这个数」，超出的由 overflow 裁掉
};

/* 标签盒：横排两行（年份 + 条数）的外接矩形。
   值是**略大于实际渲染**的估计值 —— 宁可把圆算小一点，
   也不能算小了让标签顶出框。 */
function labelBox(n, vw) {
  if (n > 16) return { w: 38, h: 27, yr: 11, cnt: 8 };
  if (n > 12) return { w: 42, h: 30, yr: 12, cnt: 9 };
  if (vw < 560) return { w: 38, h: 27, yr: 11, cnt: 8 };
  return { w: 46, h: 32, yr: 13, cnt: 10 };
}

let VW = 0, VH = 0;        // 年轮那一块（.stage）的宽高，不是视口
let DATA = null, selected = null;
let state = 'opening';
/* 每发起一次检索就 +1。AI 那两条是异步后到的，回来时如果 token 变了，
   说明用户已经搜下一句了 —— 直接丢掉，别把上一句的结果糊到当前页面上。 */
let searchToken = 0;
/* AI 判断出来的输入形态（claim/topic/question/garbage）。
   候选说法条要等它 + DATA.related 都齐了才画，见 renderHint()。 */
let parseKind = null;

/* 量年轮那块。页面现在是可滚动的文档流，不能再拿 window.innerWidth/Height ——
   那量的是视口，跟年轮的框早就不是一回事了。 */
function measure() {
  const r = stage.getBoundingClientRect();
  VW = r.width; VH = r.height;
}

/* ════════════════════════════════════════════════════════════
   0. 打开动画
   ════════════════════════════════════════════════════════════
   动画本身是 liukanshan-loader 那套，年份 2010→2026 自己跑完。
   这里只管什么时候收场：等它把 2026 定格，再停 1 秒（让人看清
   这个数字，也让描线动画走完最后一段），然后淡出交给首屏。 */

const OPEN_HOLD = 600;   // 2026 定格后再停多久

function runOpening() {
  const yearEl = document.getElementById('lk-year');

  const finish = () => {
    if (state !== 'opening') return;
    state = 'idle';
    // 直接用 JS 设透明度，不依赖 CSS class 选择器
    hero.style.opacity = '1';
    hero.style.pointerEvents = 'auto';
    requestAnimationFrame(() => {
      opening.classList.add('gone');
      setTimeout(() => { opening.remove(); heroQ.focus(); }, 760);
    });
  };

  // 没拿到动画就直接放行，不让一个装饰件卡住入口
  if (!window.LiukanshanLoader || !yearEl) { finish(); return; }

  window.LiukanshanLoader.start();

  // 年份从 2010 爬到 2026 要跑 RUN_MS，跑完停住。
  // 时长由页面注入（window.LK_YEAR_RUN_MS），跟动画脚本里的常量同源，
  // 不在这儿再写死一个数字 —— 改一处忘一处是迟早的事。
  // 不用 LiukanshanLoader.done() 的内置淡出：它会先把 lk-wrap 整体隐藏，
  // 再回调 finish，中间那段时间用户看到的是空白。
  const RUN_MS = window.LK_YEAR_RUN_MS || 2200;
  setTimeout(() => {
    if (state !== 'opening') return;
    // 年份定格在 2026（不触发 done 的内置淡出）
    if (yearEl) yearEl.textContent = '2026';
    finish();
  }, RUN_MS + OPEN_HOLD);

  // 兜底：整段开场再宽限 3 秒，无论如何都放行，不把人堵在门口
  setTimeout(() => { if (state === 'opening') finish(); }, RUN_MS + OPEN_HOLD + 3000);
}

/* ════════════════════════════════════════════════════════════
   1. 三段状态切换
   ════════════════════════════════════════════════════════════*/

function toLoading(q) {
  state = 'loading';
  // 首屏的可见性统一走内联 style：finish() 里已经写过 style.opacity='1'，
  // 内联优先级高于 class，再加 .gone 是压不住的。
  hero.style.opacity = '0';
  hero.style.pointerEvents = 'none';
  topbar.classList.add('visible');
  mainEl.classList.add('visible');
  tbQ.value = q;
  statusEl.textContent = '刘看山正在翻…… 这句话要往回查十几年，慢一点。';
  panel.innerHTML = '';
  window.scrollTo(0, 0);
  skeleton();
}

function toResult(d) {
  state = 'result';
  DATA = d;
  const mark = {
    live: '',
    partial: '（这次没跑完就限流了，下面是已经翻到的部分）',
    cache: '（走的本地存档，都是此前真查回来的原始结果）',
  }[d.source] || '';
  statusEl.textContent =
    `翻到 ${d.total} 条，横跨 ${d.span[0]}–${d.span[1]} 年，共 ${d.rings.length} 圈。` +
    `点圆上的年份，下面换那一年的原文。${mark}`;
  draw(d.rings);
  // 默认选中最近一年。文章区就在年轮下面，不摆出来的话，
  // 搜完看到的就只是一个孤零零的年轮，会以为没结果。
  // 这一次不滚屏：一搜索就把年轮顶出屏幕，人连自己搜的那句话什么形状都没看清。
  select(d.rings.length - 1);
  // parse 可能先于 rings 回来（或反过来），两边都调一次，谁后到谁负责画
  renderHint();
}

function toEmpty(d) {
  state = 'result';
  box.innerHTML = '';
  statusEl.textContent = d.source === 'limited'
    ? '知乎接口这会儿限流了（配额窗口），过一阵再试。'
    : '没翻到。换一句更像「常识」的话试试。';
  panel.innerHTML = '<p class="empty">' + (d.source === 'limited'
    ? '不是这句话没痕迹，是这次没查成 —— 不拿假数据糊弄你。'
    : '这句话在知乎上没留下足够的痕迹。') + '</p>';
}

function toError(msg) {
  state = 'result';
  box.innerHTML = '';
  statusEl.textContent = '出错了：' + msg;
  panel.innerHTML = '<p class="empty">检索失败，稍后再试。</p>';
}

/* ════════════════════════════════════════════════════════════
   2. 检索
   ════════════════════════════════════════════════════════════*/

async function search(q) {
  q = (q || '').trim();
  if (!q || state === 'loading') return;
  const token = ++searchToken;

  heroQ.value = q;
  tbQ.value = q;
  heroGo.disabled = tbGo.disabled = true;
  heroQ.blur(); tbQ.blur();

  hintbar.classList.remove('show');    // 上一句的建议不要留在屏幕上
  hideSug();                           // 推荐层也收起来，别挡着结果
  parseKind = null;
  toLoading(q);

  // 这两条都是**增强**，故意不 await：
  // 结果先照原话搜出来、先画出来，AI 回来再补。
  // 拿几秒的模型往返挡在搜索前面，换来的是"每次都多等一段"，不值。
  askParse(q, token);

  try {
    const res = await fetch('/api/rings?q=' + encodeURIComponent(q));
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    if (!d.rings || !d.rings.length) toEmpty(d);
    else { toResult(d); askPicks(q, token); }
  } catch (e) {
    toError(e.message);
  } finally {
    heroGo.disabled = tbGo.disabled = false;
  }
}

/* ════════════════════════════════════════════════════════════
   2b. AI 的两条增强
   ════════════════════════════════════════════════════════════
   服务端不把 AI 调用挂在请求上等（那个端点能从 5 秒抖到 4 分钟），
   而是起了后台任务、立刻返回 {pending:true}，所以这边得轮询。
   两条都**不阻塞**、失败都静默：AI 挂了页面照常能用，
   因为启发式的结果早就在页面上了。
   演示现场网络抽风，不能整个站点跟着塌。 */

async function pollAI(url, token, onReady, tries = 24) {
  // 先密后疏：一开始可能几秒就好，等久了就别再频繁打服务端
  const waits = [1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000, 8000];
  for (let k = 0; k < tries; k++) {
    await new Promise(r => setTimeout(r, waits[k] || 8000));
    if (token !== searchToken) return;          // 已经搜下一句了，结果作废
    let d;
    try { d = await (await fetch(url)).json(); }
    catch (e) { continue; }                     // 网络抖一下不算失败，接着轮
    if (d && d.ok) { onReady(d); return; }
    if (d && !d.pending) return;                // 明确失败（没配 key 等），别再轮
  }
}

/* 候选说法条。
   ─────────────────────────────────────────────────────────────
   AI 只负责「判断输入是哪一类」，候选**不靠模型生成** —— 用的是
   `DATA.related`，也就是这次检索真实捞回来的高赞标题。
   这么做的理由：模型凭旧知识猜的句子常跟语料对不上（实测对「张雪峰」
   它猜「张雪峰的观点有事实依据」，而语料里高赞的全是
   「张雪峰到底靠不靠谱?」这类）；真实标题不用生成、不用等、也不可能编造。

   两条竞态要注意：parse 和 rings 谁先回来不一定，所以两边都调
   renderHint()，谁后到谁负责画。 */
function renderHint() {
  if (!parseKind || !DATA || !DATA.related || !DATA.related.length) return;
  if (parseKind === 'claim') {          // 断言输入不用纠正
    hintbar.classList.remove('show');
    return;
  }

  const q = DATA.query;
  const label = parseKind === 'question'
    ? '你输入的是个问题。这次捞回来的讨论里，大家实际在问的是这些：'
    : parseKind === 'garbage'
      ? '这句里我们看不出可查的主体。换个说法试试：'
      : '「' + q + '」是个话题，不是断言。这次捞回来的讨论集中在这些说法上：';

  hintbar.innerHTML =
    '<span class="hb-label">' + esc(label) + '</span>' +
    DATA.related.map(r =>
      '<button class="hb-chip" data-q="' + esc(r.title) + '" title="' + esc(r.title) + '">' +
      esc(clip(r.title, 26)) + '</button>'
    ).join('') +
    '<button class="hb-close" aria-label="忽略这条建议">×</button>';
  hintbar.classList.add('show');
}

/* 太长的标题在按钮里放不下，截断显示；完整的那句挂在 title 和 data-q 上 */
function clip(s, n) {
  s = s || '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function askParse(q, token) {
  const url = '/api/parse?q=' + encodeURIComponent(q);
  pollAI(url, token, d => {
    parseKind = d.kind;          // 只取分类，不取候选
    renderHint();
  });
}

function askPicks(q, token) {
  const url = '/api/picks?q=' + encodeURIComponent(q);
  pollAI(url, token, d => {
    if (!DATA || !DATA.rings) return;
    let touched = false;
    for (const r of DATA.rings) {
      const p = d.picks[String(r.year)];
      if (!p) continue;
      r.summary = p.summary;                 // 句子仍是知乎原文，只是换了一句
      r.summary_from = p.summary_from;
      r.summary_url = p.summary_url;
      r.summary_is_ai = true;
      if (selected != null && DATA.rings[selected] === r) touched = true;
    }
    if (touched) render(DATA.rings[selected]);   // 正在看的那一年就地更新
  });
}

/* ════════════════════════════════════════════════════════════
   3. 等待时的占位
   ════════════════════════════════════════════════════════════
   十几条查询串行跑要几十秒。这段时间里不能只甩一行字，
   但也不该再放一遍开场动画 —— 开场那个是"进门"，这里是"在干活"。
   年轮位置画一组呼吸的空圈：这东西天生就该一圈圈长出来。 */

function skeleton() {
  box.innerHTML = '';
  box.classList.remove('anim');
  measure();
  box.setAttribute('viewBox', `0 0 ${VW} ${VH}`);

  const cx = VW / 2, cy = VH / 2;
  // 空圈按最终布局的量级铺开，等结果出来时尺度不会突变
  const r0 = GEO.r0;
  const Rmax = Math.max(VW, VH) / 2 * GEO.tex;   // 跟 draw() 的纹理环同一口径
  const g = el('g', { class: 'skeleton' });
  for (let i = 0; i < 9; i++) {
    const r = r0 + (Rmax - r0) * (i / 8);
    const c = el('circle', { cx, cy, r });
    c.style.setProperty('--d', (i * 0.14).toFixed(2) + 's');
    g.appendChild(c);
  }
  g.appendChild(el('text', { x: cx, y: cy + 4, class: 'loadword' }, '翻旧账中'));
  box.appendChild(g);
}

/* ════════════════════════════════════════════════════════════
   4. 年轮
   ════════════════════════════════════════════════════════════*/

function el(tag, attrs, text) {
  const n = document.createElementNS(SVG, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}

/* 节点半径：讨论量映射像素。用开方压一下，
   免得某一年爆量就把别的年份压成看不见的小点。
   现在环大了，点也跟着放大一档，数据量的差别才看得出来。 */
function nodeR(count, max) {
  const t = max > 0 ? Math.sqrt(count / max) : 0;
  return 5 + t * 11;
}

/* 圆环解算：年份沿一个正圆均匀排开，圆心就是这块框的正中。
   ─────────────────────────────────────────────────────────
   排布：从正上方（12 点）起，顺时针一年一格，转满一圈。

   半径不能只按「框的短边除以二」一刀切：标签是横排的两行字，
   在上下两端吃掉的是它的高度、在左右两端吃掉的是它的宽度，差一倍多。
   所以逐年按它自己的角度，把标签盒在半径方向上的半投影算进去，
   再取所有年份里最紧的那个当上限 —— 这样圆的每一段都恰好顶着框的
   边界，不会一边浪费、一边越界。 */
function solveCircle(rings, vw, vh) {
  const { margin, gap } = GEO;
  const n = rings.length;
  const lb = labelBox(n, vw);
  const cx = vw / 2, cy = vh / 2;
  const maxCount = Math.max(...rings.map(r => r.count));
  const halfW = lb.w / 2, halfH = lb.h / 2;
  const step = 2 * Math.PI / n;

  const angs = [], nrs = [];
  let R = Infinity;

  rings.forEach((r, i) => {
    const th = -Math.PI / 2 + i * step;      // 正上方起，顺时针
    const nr = nodeR(r.count, maxCount);
    angs.push(th); nrs.push(nr);

    const A = Math.abs(Math.cos(th)), B = Math.abs(Math.sin(th));
    const reach = nr + gap + (A * halfW + B * halfH);   // 标签中心离圆心至少这么远
    if (A > 1e-6) R = Math.min(R, (cx - margin - halfW) / A - reach);
    if (B > 1e-6) R = Math.min(R, (cy - margin - halfH) / B - reach);
  });

  // 中心留白跟着圆走：圆小了，那句话的地盘也得收，别把年份挤了
  const r0 = Math.max(30, Math.min(GEO.r0, R - 26));
  return { cx, cy, R, r0, angs, nrs, lb };
}

function draw(rings) {
  box.innerHTML = '';
  box.classList.remove('anim');
  if (!rings.length) return;

  measure();
  box.setAttribute('viewBox', `0 0 ${VW} ${VH}`);

  const n = rings.length;
  const { cx, cy, R, r0, angs, nrs, lb } = solveCircle(rings, VW, VH);

  // 背景层：同心环是这块的纹理，不是主角。按**长边**铺开，
  // 让环线横着也能顶到框边（超出的由 overflow 裁掉）——
  // 圆心居中之后圆本身不大，纹理只铺到圆外一圈的话两头会空一大片。
  const texMax = Math.max(VW, VH) / 2 * GEO.tex;
  for (let i = 0; i < n; i++) {
    const r = r0 + (texMax - r0) * (n > 1 ? i / (n - 1) : 0);
    const c = el('circle', { cx, cy, r, class: 'ring' });
    c.style.setProperty('--len', (2 * Math.PI * r).toFixed(1));
    c.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
    box.appendChild(c);
  }
  // 年份落在这个圆上，比别的纹理环明确一点，看得出年份是「一圈」
  const onRing = el('circle', { cx, cy, r: R, class: 'ring on' });
  onRing.style.setProperty('--len', (2 * Math.PI * R).toFixed(1));
  onRing.style.setProperty('--d', '0s');
  box.appendChild(onRing);

  // 中心：那句话本身。先挖一块纸色盘，否则字会压在环线上。
  const g0 = el('g', {});
  g0.appendChild(el('circle', { cx, cy, r: r0, class: 'seedhole' }));
  g0.appendChild(el('circle', { cx, cy, r: r0 - 10, fill: 'none',
                                stroke: 'var(--ink)', 'stroke-width': 1.4 }));

  // 一行最多 5 字，最多两行。留白直径约 2×r0，放得下。
  const q = (DATA.query || '').trim();
  const lines = [];
  for (let i = 0; i < q.length && lines.length < 2; i += 5) lines.push(q.slice(i, i + 5));
  if (q.length > 10) lines[1] = lines[1].slice(0, 4) + '…';

  const baseY = lines.length > 1 ? cy - 12 : cy - 4;
  lines.forEach((ln, i) => {
    g0.appendChild(el('text', { x: cx, y: baseY + i * 18, class: 'seedtext' }, ln));
  });
  // 总条数 + 年份跨度：进来就知道体量
  g0.appendChild(el('text', { x: cx, y: baseY + lines.length * 18 + 6, class: 'seedsub' },
    `${DATA.total} 条 · ${DATA.span ? DATA.span[0] + '–' + DATA.span[1] : ''}`));
  box.appendChild(g0);

  // 年份节点：绕正圆均匀一圈
  rings.forEach((r, i) => {
    const th = angs[i], nr = nrs[i];
    const ux = Math.cos(th), uy = Math.sin(th);
    const x = cx + R * ux, y = cy + R * uy;
    const delay = (i * 0.09 + 0.3).toFixed(2) + 's';

    const g = el('g', { class: 'node', tabindex: '0', role: 'button',
                        'aria-label': `${r.year} 年，${r.count} 条` });
    g.style.setProperty('--d', delay);
    g.appendChild(el('circle', { cx: x, cy: y, r: nr }));

    // 标签沿半径往外推：推过「节点外缘 + gap + 标签在半径方向的半投影」，
    // 这样标签的内缘贴着节点、外缘贴着框边，两边都不挤。
    // 用 middle 对齐而不是左/右对齐：绕一整圈时，左半边右对齐、
    // 右半边左对齐会在中轴处出现「背靠背贴死」的缝（踩过）。
    const A = Math.abs(ux), B = Math.abs(uy);
    const lr = R + nr + GEO.gap + (A * lb.w / 2 + B * lb.h / 2);
    const lx = cx + lr * ux, ly = cy + lr * uy - lb.yr * 0.24;

    const yr = el('text', { x: lx, y: ly, 'text-anchor': 'middle', class: 'yr' }, r.year);
    yr.style.fontSize = lb.yr + 'px';
    g.appendChild(yr);
    const cnt = el('text', { x: lx, y: ly + lb.cnt + 4, 'text-anchor': 'middle', class: 'cnt' },
                   r.count + ' 条');
    cnt.style.fontSize = lb.cnt + 'px';
    g.appendChild(cnt);

    const pick = () => select(i, true);
    g.addEventListener('click', pick);
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
    });
    box.appendChild(g);
  });

  void box.getBoundingClientRect();
  box.classList.add('anim');
}

/* 选中某一年。
   scroll=true 才滚屏，而且只由「人主动点年份」触发 —— 他点了，
   说明现在想看那一年的原文，就把他送下去。
   搜完那次自动选中传 false：一搜索就把年轮顶出屏幕，人连自己
   搜的那句话长什么形状都没看清。 */
function select(i, scroll) {
  selected = i;
  document.querySelectorAll('.node').forEach((g, k) => g.classList.toggle('sel', k === i));
  render(DATA.rings[i]);
  if (scroll) {
    // 76 = 顶栏高度（#main 的 padding-top），让文章区正好停在顶栏下面
    const top = panel.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

/* ════════════════════════════════════════════════════════════
   5. 文章区（年轮下面第二节）
   ════════════════════════════════════════════════════════════*/

function esc(s) {
  return (s || '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function render(r) {
  const total = Math.max(r.believe + r.doubt + r.mixed, 1);
  const pct = (v) => (v / total * 100).toFixed(1) + '%';

  const items = r.answers.map(a => `
    <a class="item" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">
      <div class="t">${esc(a.title)}</div>
      <div class="x">${esc(a.excerpt)}</div>
      <div class="f">
        <span>${esc(a.author)}</span>
        <span>${a.votes} 赞同</span>
        <span>${a.comments} 评论</span>
        <span class="tag ${a.stance === 'doubt' ? 'd' : (a.stance === 'believe' ? 'b' : '')}">${
          a.stance === 'doubt' ? '偏质疑' : (a.stance === 'believe' ? '偏支持' : '两说')
        }</span>
        <span>${esc(a.type)}</span>
      </div>
    </a>`).join('');

  panel.innerHTML = `
    <div class="yearhead">
      <h2>${r.year}</h2>
      <span class="meta">这一年翻到 ${r.count} 条</span>
    </div>

    <div class="summary">
      <p>「${esc(r.summary)}」</p>
      <div class="from">
        当年 ${r.count} 条里，${r.summary_is_quote ? '说得最直白的一句' : '没有长度合规的整句，这是截断'}${r.summary_is_ai ? '<span class="aibadge">AI 挑句</span>' : ''}
        · <em>${esc(r.summary_from)}</em>
      </div>
    </div>

    <div class="bar">
      <i class="b" style="width:${pct(r.believe)}"></i>
      <i class="d" style="width:${pct(r.doubt)}"></i>
      <i class="m" style="width:${pct(r.mixed)}"></i>
    </div>
    <div class="barlegend">
      <span><i class="dotb"></i>偏支持 <b>${r.believe}</b></span>
      <span><i class="dotd"></i>偏质疑 <b>${r.doubt}</b></span>
      <span><i class="dotm"></i>两说 <b>${r.mixed}</b></span>
    </div>

    <div class="list">${items}</div>

    <p class="note">
      说到底这里只有两件事是硬的：年份取自知乎给的编辑时间，链接指向原文，点开就能核。
      立场那一栏是按词判的，只够用来看个走向，不作数。<br>
      说中的和没说中的都在上面 —— 只留下说对的那几个，等于骗你。
    </p>`;
}

/* ════════════════════════════════════════════════════════════
   5b. 输入推荐
   ════════════════════════════════════════════════════════════
   输入关键词就出，比整条检索早得多 —— 因为服务端只发**一条**搜索
   （0.76s），不是那 15 条扇出（13s）。
   候选是知乎给出的真实标题，点了就拿它去搜完整的那一轮。
   这是增强项，失败静默：不挡输入、不挡回车。

   **首屏和顶栏两个输入框都要挂。** 只挂首屏的话会有个很明显的 bug：
   搜过一次之后首屏就藏起来了，能打字的是顶栏那个，于是"再输入就没推荐了"。 */
function initSuggest(input, box) {
  let timer = null, seq = 0;

  function close() {
    clearTimeout(timer);
    seq++;                        // 作废还在路上的那次请求
    box.classList.remove('show');
    box.innerHTML = '';
  }

  async function load(q) {
    const my = ++seq;
    try {
      const d = await (await fetch('/api/suggest?q=' + encodeURIComponent(q))).json();
      if (my !== seq) return;     // 回来时已经不是当初那次（改了字 / 已开搜 / 已关掉）
      if (!d || !d.ok || !d.items || !d.items.length) { close(); return; }
      box.innerHTML =
        '<div class="s-hd">知乎上真实存在的说法，点一条直接查</div>' +
        d.items.map(it =>
          '<button data-q="' + esc(it.title) + '" title="' + esc(it.title) + '">' +
          '<span class="s-t">' + esc(it.title) + '</span>' +
          '<span class="s-v">' + it.votes + ' 赞</span></button>'
        ).join('');
      box.classList.add('show');
    } catch (e) { /* 推荐是增强项，失败就算了 */ }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    seq++;                        // 打字期间，之前那次的结果一律作废
    const q = input.value.trim();
    if (q.length < 2) { box.classList.remove('show'); box.innerHTML = ''; return; }
    // 400ms 没再敲才发请求：一个词打下来只发一两次，不是每敲一个键发一次
    timer = setTimeout(() => load(q), 400);
  });

  box.addEventListener('click', e => {
    const b = e.target.closest('button[data-q]');
    if (!b) return;
    close();
    search(b.dataset.q);
  });

  return close;
}

const closeHeroSug = initSuggest(heroQ, heroSug);
const closeTbSug = initSuggest(tbQ, tbSug);

function hideSug() { closeHeroSug(); closeTbSug(); }

// 点别处收起推荐（两个输入框各自的容器都算"里面"）
document.addEventListener('click', e => {
  if (!e.target.closest('.hero-search') && !e.target.closest('.tb-search')) hideSug();
});

/* ════════════════════════════════════════════════════════════
   6. 绑定
   ════════════════════════════════════════════════════════════*/

heroGo.addEventListener('click', () => search(heroQ.value));
heroQ.addEventListener('keydown', e => { if (e.key === 'Enter') search(heroQ.value); });
tbGo.addEventListener('click', () => search(tbQ.value));
tbQ.addEventListener('keydown', e => { if (e.key === 'Enter') search(tbQ.value); });

document.querySelectorAll('.hero-hints button').forEach(b => {
  b.addEventListener('click', () => search(b.dataset.q));
});

// 候选说法条：点一条就按那条重搜；点 × 只收起来，不打断当前结果
hintbar.addEventListener('click', e => {
  const chip = e.target.closest('.hb-chip');
  if (chip) {
    hintbar.classList.remove('show');
    search(chip.dataset.q);
    return;
  }
  if (e.target.closest('.hb-close')) hintbar.classList.remove('show');
});

// 点顶栏标题回首屏，重新来一次
tbHome.addEventListener('click', () => {
  state = 'idle';
  topbar.classList.remove('visible');
  mainEl.classList.remove('visible');
  panel.innerHTML = '';
  box.innerHTML = '';
  hintbar.classList.remove('show');
  hintbar.innerHTML = '';
  hideSug();
  searchToken++;              // 让还在路上的 AI 结果作废
  parseKind = null;
  DATA = null; selected = null;
  window.scrollTo(0, 0);
  hero.style.opacity = '1';
  hero.style.pointerEvents = 'auto';
  heroQ.focus();
});

// 窗口变了要重排：年轮那块的宽高跟着变，整个圆的几何得重解
let rzTimer = null;
window.addEventListener('resize', () => {
  if (state !== 'result' || !DATA || !DATA.rings) return;
  clearTimeout(rzTimer);
  rzTimer = setTimeout(() => {
    const keep = selected;
    draw(DATA.rings);
    if (keep != null) {
      document.querySelectorAll('.node').forEach((g, k) => g.classList.toggle('sel', k === keep));
    }
  }, 160);
});

// 等 LiukanshanLoader 挂载完再起动画。
// 两个 <script> 在同一页面内，loader 的 script 在前，app.js 在后，
// 正常情况下 LiukanshanLoader 已经存在；但如果浏览器缓存/defer 导致
// 时序颠倒，就用 requestAnimationFrame 等一帧再试。
(function waitAndRun(retries) {
  if (window.LiukanshanLoader) {
    runOpening();
  } else if (retries > 0) {
    requestAnimationFrame(() => waitAndRun(retries - 1));
  } else {
    runOpening(); // 兜底：让 finish() 里的 !LiukanshanLoader 分支处理
  }
})(60); // 最多等 60 帧（约 1 秒）
