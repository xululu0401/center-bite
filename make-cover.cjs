/* 封面 cover.svg（1200×1200），读数来自 core.js 同一次 compute；再用浏览器截成 cover.png。 */
const fs = require('node:fs');
const A = require('./core.js');
const o = A.compute(A.defaultState());
if (!o.ok || A.dur(o.t1) !== '13 小时 18 分') throw new Error('默认场景不对');
const F = "-apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
/* 两个截面：上次厚片（30 mm 厚）与这次整条（直径 60 mm），按同一比例画，颜色深浅 = 该处浓度（同一 D、同一时刻 6 小时） */
const S = 4.2, T6 = 6;
function slabC(x, a, X) { /* 一维平板在位置 x（距中心）的浓度，级数解 */ let s = 0; for (let n = 0; n < 200; n++) { const k = 2 * n + 1, e = k * k * Math.PI * Math.PI * X / (4 * a * a); if (e > 60) break; s += 4 / Math.PI * (n % 2 ? -1 : 1) / k * Math.exp(-e) * Math.cos(k * Math.PI * x / (2 * a)); } return 1 - s; }
function cylC(r, R, X) { let s = 0; for (let i = 0; i < A.Z0.length; i++) { const l = A.Z0[i], e = l * l * X / (R * R); if (e > 60) break; s += 2 / (l * A.J1Z[i]) * Math.exp(-e) * j0(l * r / R); } return 1 - s; }
function j0(x) { let s = 0, N = 200; for (let k = 0; k < N; k++) { const t = (k + 0.5) * Math.PI / N; s += Math.cos(x * Math.sin(t)); } return s / N; }
const shade = (c) => { const a = [250, 244, 232], b = [138, 90, 43]; return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, c)))).join(',') + ')'; };
const X6 = o.D * T6;
let rects = '';
/* 上次：厚片截面 60×30（宽 × 厚），只看厚度方向 + 宽度方向 */
const x0 = 170, y0 = 627, cell = 2.5; /* 片的中线与圆心对齐（750） */
for (let i = 0; i < 60 / cell; i++) for (let j = 0; j < 30 / cell; j++) {
  const xm = -30 + (i + 0.5) * cell, ym = -15 + (j + 0.5) * cell;
  const c = 1 - (1 - slabC(xm, 30, X6)) * (1 - slabC(ym, 15, X6)) * (1 - slabC(0, 40, X6)); /* 截面取在长 80 mm 的正中，长度方向因子在中点 */
  rects += `<rect x="${(x0 + (i * cell) * S).toFixed(1)}" y="${(y0 + 60 + (j * cell) * S).toFixed(1)}" width="${(cell * S + 0.6).toFixed(1)}" height="${(cell * S + 0.6).toFixed(1)}" fill="${shade(c)}"/>`;
}
/* 这次：圆柱截面直径 60，同一时刻 6 小时 */
const cx = 830, cy = 750, R = 30;
for (let rr = R; rr > 0; rr -= 1) rects += `<circle cx="${cx}" cy="${cy}" r="${(rr * S).toFixed(1)}" fill="${shade(1 - (1 - cylC(rr - 0.5, R, X6)) * (1 - slabC(0, 75, X6)))}"/>`;
const cLast = 1 - (1 - slabC(0, 30, X6)) * (1 - slabC(0, 15, X6)) * (1 - slabC(0, 40, X6)), cThis = 1 - (1 - cylC(0, R, X6)) * (1 - slabC(0, 75, X6));
if (Math.abs(cLast - A.uptake(o.lp, X6).center) > 1e-6 || Math.abs(cThis - A.uptake(o.tp, X6).center) > 1e-6) throw new Error('封面级数与 core 不一致');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="#f4f1ea"/>
  <rect x="70" y="60" width="1060" height="1080" rx="18" fill="#fff" stroke="#ddd5c6" stroke-width="3"/>
  <text x="140" y="200" font-family="${F}" font-size="108" font-weight="800" fill="#23201b">正中心那一口</text>
  <text x="140" y="272" font-family="${F}" font-size="36" fill="#58524a">换了大小和形状，要泡多久才入味到正中间</text>
  <rect x="140" y="304" width="920" height="5" fill="#23201b"/>
  <text x="140" y="392" font-family="${F}" font-size="40" fill="#23201b">上次厚片 ${A.dur(o.t0)} → 这次整条</text>
  <text x="140" y="480" font-family="${F}" font-size="76" font-weight="800" fill="#8a5a2b">要泡 ${A.dur(o.t1)}</text>
  ${rects}
  <text x="${x0}" y="590" font-family="${F}" font-size="30" fill="#58524a">上次：厚 30 mm 的片</text>
  <text x="${cx}" y="590" font-family="${F}" font-size="30" fill="#58524a" text-anchor="middle">这次：直径 60 mm 的整条</text>
  <text x="${x0}" y="930" font-family="${F}" font-size="28" fill="#23201b">泡 6 小时，正中心 ${A.pct(cLast)}</text>
  <text x="${cx}" y="930" font-family="${F}" font-size="28" fill="#23201b" text-anchor="middle">泡 6 小时，正中心 ${A.pct(cThis)}</text>
  <text x="140" y="1040" font-family="${F}" font-size="34" font-weight="700" fill="#23201b">同样的形状大一倍，要泡四倍；切短不如切薄</text>
  <text x="140" y="1096" font-family="${F}" font-size="24" fill="#8e877c">颜色越深 = 味道进得越多 · 按扩散规律换算 · 虚构示例</text>
</svg>`;
fs.writeFileSync('cover.svg', svg);
console.log('cover.svg', svg.length, '上次中心', A.pct(cLast), '这次中心', A.pct(cThis));
