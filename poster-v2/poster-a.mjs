// 观念年轮 · 封面方案 A 深化版 —— 功能主义网格社区 Functional Brutalism
//
// 方向 A 的逻辑：不"设计"，只呈现原始信息。近白底 / 系统字 / 发丝灰线 / 经典链接蓝。
// 深化时保留的：搜索框 + 那句查询词（用户自己的点子）、四行共识衰减数据。
// 深化时补的：放大镜 + 待点击的光标（用户点名要的元素）、真正的标题层级、
//              赛事信息、把"315 × 175"这类出图辅助标签从画面里去掉。
import { writeFileSync } from 'node:fs';

const DIR = 'F:/work palce/poster-v2';
const OUT = `${DIR}/poster-a.html`;

const ROWS = [
  ['2010', '共识', 92],
  ['2016', '出现质疑', 58],
  ['2020', '分裂', 41],
  ['2026', '少数派', 23],
];

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>观念年轮 · 封面 A · 功能主义网格</title>
<style>
/* 五个令牌，画面里不允许出现这五个之外的任何颜色 */
:root{
  --bg:#FBFBFB; --ink:#111111; --muted:#8A8A8A; --rule:#E0E0E0; --accent:#0000EE;
}
*{margin:0;padding:0;box-sizing:border-box}
body{margin:0;padding:24px}
.poster{
  width:315px;height:175px;overflow:hidden;position:relative;
  background:var(--bg);color:var(--ink);
  font-family:-apple-system,'Segoe UI',system-ui,'PingFang SC','Microsoft YaHei',sans-serif;
  padding:10px 13px 0;display:flex;flex-direction:column;
  -webkit-font-smoothing:antialiased;
}
/* 高度是硬约束：不许任何一块被 flex 悄悄压扁，宁可让溢出暴露出来 */
.poster>*{flex:0 0 auto}

/* ---- 页眉：项目名 + 赛事 ---- */
.hd{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.hd h1{font-size:17px;font-weight:700;letter-spacing:-.015em;line-height:1.1}
.hd .meta{font-size:8px;color:var(--muted);letter-spacing:.04em;white-space:nowrap}
.sub{font-size:9.5px;color:var(--muted);margin-top:2px;letter-spacing:.01em}

/* ---- 查询框：整个封面唯一的"可操作"物件 ---- */
.field{
  position:relative;margin-top:8px;height:23px;
  border:1px solid var(--ink);background:#fff;
  display:flex;align-items:center;padding:0 7px;gap:1px;
}
.field .q{font-size:11px;white-space:nowrap}
.field .kw{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
.field .caret{width:1px;height:12px;background:var(--ink);margin-left:2px}
.field .btn{margin-left:auto;display:flex;align-items:center;gap:3px;
            font-size:10.5px;color:var(--ink);white-space:nowrap}
.mag{display:block}
.mag circle,.mag path{fill:none;stroke:currentColor;stroke-width:1.25}
/* 光标悬在搜索键上，还没按下去 */
.cursor{position:absolute;right:2px;bottom:-6px;width:11px;height:16px;display:block}
.cursor path{fill:var(--ink);stroke:var(--bg);stroke-width:1.2}

/* ---- 数据表：观念共识的衰减 ---- */
table{margin-top:7px;border-collapse:collapse;width:100%;font-size:9.5px}
td{padding:2.2px 0;vertical-align:middle;white-space:nowrap}
td.y{color:var(--muted);width:30px;font-variant-numeric:tabular-nums}
td.s{color:var(--ink)}
td.m{width:82px;padding-left:8px;padding-right:0}
td.m i{display:block;height:5px;background:var(--rule)}
td.m i b{display:block;height:5px;background:var(--accent)}
td.p{text-align:right;width:28px;color:var(--muted);font-variant-numeric:tabular-nums}

/* ---- 页脚：把话说完 ---- */
.foot{margin-top:auto;border-top:1px solid var(--rule);padding:4px 0 6px;
      font-size:10.5px;font-weight:600;letter-spacing:.01em}
</style></head>
<body>

<div class="poster">
  <div class="hd">
    <h1>观念年轮</h1>
    <div class="meta">知乎黑客松 2026 · 校园新锐季</div>
  </div>
  <div class="sub">你的观点，还剩多少保质期</div>

  <div class="field">
    <span class="q">买房是最好的<span class="kw">投资</span></span><span class="caret"></span>
    <span class="btn">搜索
      <svg class="mag" width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="5" cy="5" r="3.5"/><path d="M7.6 7.6 L11 11"/>
      </svg>
    </span>
    <svg class="cursor" viewBox="0 0 11 16" aria-hidden="true">
      <path d="M1 1 L1 12.4 L3.9 9.6 L5.9 14.6 L8.1 13.6 L6.2 8.8 L10 8.6 Z"/>
    </svg>
  </div>

  <table>
${ROWS.map(([y, s, p]) => `    <tr><td class="y">${y}</td><td class="s">${s}</td>` +
  `<td class="m"><i><b style="width:${p}%"></b></i></td><td class="p">${p}%</td></tr>`).join('\n')}
  </table>

  <div class="foot">每一个常识，都曾经是少数派</div>
</div>

</body></html>`;

writeFileSync(OUT, html, 'utf8');
console.log(`WROTE ${OUT}  ${html.length} chars`);
