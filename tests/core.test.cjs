/* 正中心那一口 · 核心测试：node --test tests/core.test.cjs
 * 锚点：教科书傅里叶数（独立求）、尺寸平方律、同形状换算 = 尺寸比的平方、tests/ref.json（独立 Python：自算贝塞尔零点 + 线性二分，320 组；有限差分直接解方程 12 点抽查级数解）。 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const A = require(path.join(__dirname, '..', 'core.js'));
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, 'ref.json'), 'utf8'));
const S = (o) => Object.assign(A.defaultState(), o);
const rel = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1e-300, Math.abs(b)), msg + ' got ' + a + ' want ' + b);
const abs = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, msg + ' got ' + a + ' want ' + b);

test('一维因子：t=0 中心不动、平均为满；时间越长越小；F 很大趋 0', () => {
  for (const [u, a] of [[A.slabU, A.slabA], [A.cylU, A.cylA], [A.ballU, A.ballA]]) {
    assert.equal(u(0), 1); abs(a(0), 1, 1e-12, 'avg(0)');
    let pu = 1, pa = 1;
    for (const F of [1e-4, 1e-3, 0.0019, 0.0021, 0.01, 0.05, 0.1, 0.3, 1, 3]) {
      const x = u(F), y = a(F);
      assert.ok(x <= pu + 1e-12 && y <= pa + 1e-12, '单调 F=' + F); assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1, '值域');
      assert.ok(y <= x + 1e-12, '平均残差 ≤ 中心残差（中心最慢）F=' + F); pu = x; pa = y;
    }
    assert.ok(u(20) < 1e-12 && a(20) < 1e-12, 'F 大趋 0');
  }
  /* FMIN 两侧的短时展开与级数接得上（平均） */
  for (const a of [A.slabA, A.cylA, A.ballA]) abs(a(A.FMIN * 0.999), a(A.FMIN * 1.001), 2e-4, 'FMIN 两侧连续');
});

test('教科书傅里叶数：中心到 50% 时平板 0.3787、圆柱 0.2005、球 0.1388（独立牛顿法求）', () => {
  /* 球的级数是交错几何型，可手算：1 − 2e^{−π²F} + 2e^{−4π²F} … = 0.5 */
  const want = { slab: 0.378748, cyl: 0.200524, ball: 0.138785 };
  const fn = { slab: A.slabU, cyl: A.cylU, ball: A.ballU };
  for (const k of Object.keys(want)) {
    let F = 0.2; for (let i = 0; i < 60; i++) { const h = 1e-7; const g = fn[k](F) - 0.5; const d = (fn[k](F + h) - fn[k](F - h)) / (2 * h); F -= g / d; }
    abs(F, want[k], 2e-6, k);
  }
  /* 第一个 J0 零点与 J1 值 */
  abs(A.Z0[0], 2.404825557695773, 1e-12, 'λ1'); abs(A.J1Z[0], 0.519147497289466, 1e-12, 'J1(λ1)');
  /* 圆柱 t=0 的级数和 Σ 2/(λJ1(λ)) = 1、平均 Σ 4/λ² = 1（取全部 80 项，检验常数表） */
  let s = 0, q = 0; A.Z0.forEach((l, i) => { s += 2 / (l * A.J1Z[i]); q += 4 / (l * l); });
  abs(q, 1, 0.01, 'Σ4/λ²'); assert.ok(Math.abs(s) < 1.2, 'Σ2/(λJ1) 交错有界');
});

test('默认场景：逐项可复算（上次 80×60×30 长方块 6 小时 → 这次 直径 60、长 150 圆柱）', () => {
  const o = A.compute(A.defaultState());
  assert.equal(o.ok, true); assert.equal(o.mode, 'calib');
  /* 上次三向半尺寸 40/30/15 mm：中心残差 = slabU(X/1600)·slabU(X/900)·slabU(X/225) = 0.5 */
  const lu = (X) => A.slabU(X / 1600) * A.slabU(X / 900) * A.slabU(X / 225);
  abs(lu(o.X0), 0.5, 1e-10, '上次 X0');
  rel(o.D, o.X0 / 6, 1e-12, 'D = X0 / 6');
  const tu = (X) => A.cylU(X / 900) * A.slabU(X / 5625);
  abs(tu(o.X1), 0.5, 1e-10, '这次 X1');
  rel(o.t1, o.X1 / o.D, 1e-12, 't1'); rel(o.ratio, o.X1 / o.X0, 1e-12, 'ratio');
  /* 读数（说明里用到的）*/
  assert.equal(A.dur(o.t1), '13 小时 18 分'); assert.equal(A.ratio(o.ratio), '2.22');
  assert.equal(A.pct(o.centerAtPlan), '44.2%'); assert.equal(o.hit, false); assert.equal(A.dur(o.gap), '1 小时 18 分');
  assert.equal(A.pct(o.avgAtNeed), '82.7%'); assert.equal(A.pct(o.lastAvg), '83.7%');
  assert.equal(o.headline, '这次整条牛腱（直径 60 mm、长 150 mm 的圆柱）要泡 13 小时 18 分，正中心才到料汁的 50%：是上次切成厚片的牛腱（6 小时）的 2.22 倍。打算泡 12 小时，正中心只到 44.2%，还差 1 小时 18 分。');
});

test('尺寸平方律：整块等比例 k 倍 → 时间 k² 倍（任何形状、任何 p）', () => {
  for (const st of [S({}), S({ tShape: 'box', tA: '200', tB: '90', tC: '35' }), S({ tShape: 'ball', tA: '45', target: '90' })]) {
    const o = A.compute(st);
    o.scales.forEach((s) => rel(s.hours, o.t1 * s.k * s.k, 1e-9, '平方律 k=' + s.k));
    assert.equal(o.scales.filter((s) => s.cur).length, 1);
  }
  /* 同形状同比例：换算倍数 = 尺寸比的平方，与 p 无关 */
  for (const p of ['10', '50', '95']) {
    const o = A.compute(S({ lShape: 'ball', lA: '30', tShape: 'ball', tA: '45', target: p, lHours: '4' }));
    rel(o.ratio, 2.25, 1e-9, '球 45/30 p=' + p); rel(o.t1, 9, 1e-9, '9 小时');
  }
  /* 「很长」的方向不影响：大薄片半厚 a 中心到 50% 的 X = 0.3787·a² */
  const sl = { shape: 'box', dims: [Infinity, Infinity, 20] };
  rel(A.needX(sl, 0.5), 0.378748 * 100, 1e-5, '薄片');
});

test('独立 Python 对拍 320 组：D、X、t1 相对误差 ≤ 1e-9，中心 ≤ 1e-9，平均 ≤ 1e-6', () => {
  assert.equal(REF.cases.length, 320);
  let n = 0;
  for (const c of REF.cases) {
    const o = A.compute(S(c.state)); assert.equal(o.ok, true, JSON.stringify(c.state));
    rel(o.D, c.D, 1e-9, 'D'); rel(o.X1, c.X1, 1e-9, 'X1'); rel(o.t1, c.t1, 1e-9, 't1');
    abs(o.centerAtPlan, c.centerAtPlan, 1e-9, 'center'); abs(o.avgAtPlan, c.avgAtPlan, 1e-6, 'avg'); abs(o.avgAtNeed, c.avgAtNeed, 1e-6, 'avgNeed');
    n++;
  }
  assert.equal(n, 320);
});

test('有限差分直接解扩散方程 12 点：级数解中心值误差 ≤ 3e-5（检查公式本身，不是对拍 core）', () => {
  const fn = { slab: A.slabU, cyl: A.cylU, ball: A.ballU };
  assert.equal(REF.fd.length, 12);
  for (const x of REF.fd) abs(1 - fn[x.kind](x.F), x.fd_center, 3e-5, x.kind + ' F=' + x.F);
});

test('常识：同样最薄一边，形状越「圆」越快；薄片最慢；对半切最长那边只快一点', () => {
  const o = A.compute(A.defaultState());
  const h = Object.fromEntries(o.shapes.map((s) => [s.key, s.hours]));
  assert.ok(h.slab > h.bar && h.bar > h.rod && h.rod > h.cube && h.cube > h.ball, JSON.stringify(h));
  rel(h.rod, o.t1 * 0 + A.needX({ shape: 'cyl', dims: [60, Infinity] }, 0.5) / o.D, 1e-12, 'rod');
  assert.equal(o.half.name, '长'); assert.ok(o.half.saved > 0 && o.half.saved < 0.1, String(o.half.saved));
  assert.equal(A.pct(o.half.saved), '7.4%'); assert.equal(A.dur(o.half.hours), '12 小时 19 分');
  /* 圆柱长度趋于无穷 → 与圆条一样；长度越短越快 */
  const lo = A.compute(S({ tB: '1000' })).t1, sh = A.compute(S({ tB: '60' })).t1;
  /* 测试期望写错过一次（引擎对）：长 1,000 mm 时 slab 因子 F 极小、残差恰为 1，与圆条相等，不是严格小于 */
  assert.ok(lo <= h.rod * (1 + 1e-12) && lo >= o.t1 && sh < o.t1, [lo, h.rod, o.t1, sh].join());
  /* 长 150 mm 的圆柱与无限长圆条只差 0.02%：长度是直径的 2.5 倍时，长度方向几乎不帮忙 */
  assert.ok((h.rod - o.t1) / o.t1 < 0.001);
});

test('改一项：每条建议回代后都在打算的时间内（且是取整后的数）', () => {
  for (const st of [A.defaultState(), S({ tShape: 'box', tA: '200', tB: '100', tC: '50', plan: '10' }), S({ mode: 'direct', tShape: 'ball', tA: '45', plan: '48' })]) {
    const o = A.compute(st); assert.equal(o.hit, false); assert.ok(o.actions.length >= 2);
    for (const a of o.actions) {
      const s2 = Object.assign({}, st, a.set), o2 = A.compute(s2);
      assert.equal(o2.ok, true); assert.equal(o2.hit, true, a.text + ' 回代后 center ' + o2.centerAtPlan);
      rel(o2.t1, a.after, 1e-9, a.text + ' after');
    }
  }
  const o = A.compute(A.defaultState());
  assert.deepEqual(o.actions.map((a) => a.kind), ['plan', 'scale', 'thin']);
  assert.deepEqual(o.actions[0].set, { plan: '13.3' }); assert.deepEqual(o.actions[2].set, { tA: '56.9' });
  /* 切薄是二分出的最大值：再厚 0.2 mm 就不够 */
  const st = S({ tA: String(56.9 + 0.2) }); assert.equal(A.compute(st).hit, false);
  /* 等比例切小：s = √(plan/t1)（平方律反解），默认 95.0%、尺寸向下取到 0.1 mm */
  rel(o.actions[1].s, Math.sqrt(12 / o.t1), 1e-12, 's'); assert.deepEqual(o.actions[1].set, { tA: '56.9', tB: '142.4' });
  /* 长方块切最薄那边：200×100×50 → 改的是「厚」（第 3 个） */
  const bx = A.compute(S({ tShape: 'box', tA: '200', tB: '100', tC: '50', plan: '10' }));
  const th = bx.actions.find((a) => a.kind === 'thin'); assert.equal(th.dim, 2); assert.deepEqual(Object.keys(th.set), ['tC']);
  /* 够了就没有建议 */
  const ok = A.compute(S({ plan: '14' })); assert.equal(ok.hit, true); assert.equal(ok.actions.length, 0);
  assert.ok(ok.headline.indexOf('够了') > 0);
});

test('入味标准：换算倍数随 p 变（形状不同时）；同形状不变', () => {
  const o = A.compute(A.defaultState());
  assert.deepEqual(o.targets.map((t) => t.p), [30, 50, 70, 90]);
  const r = o.targets.map((t) => t.ratio); assert.ok(Math.max(...r) - Math.min(...r) > 0.1, JSON.stringify(r));
  assert.equal(o.targets.filter((t) => t.cur).length, 1); rel(o.targets[1].hours, o.t1, 1e-12, 'cur');
  const same = A.compute(S({ tShape: 'box', tA: '160', tB: '120', tC: '60' }));
  same.targets.forEach((t) => rel(t.ratio, 4, 1e-9, '同形状 2 倍 → 4 倍 p=' + t.p));
});

test('非法输入：空、文字、负数、越界、0；只报对应字段', () => {
  const cases = [
    [{ tA: '' }, 'tA', '这次的直径要填一个数。'], [{ tA: 'abc' }, 'tA', null], [{ tA: '-3' }, 'tA', '这次的直径要在 0.5 到 1,000 mm 之间。'],
    [{ tB: '2000' }, 'tB', null], [{ lHours: '0' }, 'lHours', '上次泡了要在 0.05 到 2,000 小时 之间。'], [{ target: '100' }, 'target', null], [{ target: '0' }, 'target', null],
    [{ plan: '' }, 'plan', null], [{ mode: 'direct', dval: '0' }, 'dval', null], [{ lC: '0.1' }, 'lC', '上次的厚要在 0.5 到 1,000 mm 之间。']
  ];
  for (const [o, f, msg] of cases) {
    const r = A.compute(S(o)); assert.equal(r.ok, false, JSON.stringify(o));
    assert.deepEqual(r.errors.map((e) => e.field), [f], JSON.stringify(o)); if (msg) assert.equal(r.errors[0].message, msg);
  }
  /* 直接填 D 模式不校验上次的字段；按经验模式不校验 D */
  assert.equal(A.compute(S({ mode: 'direct', lA: 'x', lHours: '' })).ok, true);
  assert.equal(A.compute(S({ dval: 'x' })).ok, true);
  /* 单位与写法 */
  assert.equal(A.num('1,000'), 1000); assert.equal(A.num('30mm'), 30); assert.equal(A.num('6 小时'), 6); assert.equal(A.num('50%'), 50); assert.equal(A.num('1e2'), 100); assert.ok(Number.isNaN(A.num('3..2')));
  /* 未知形状回落为长方块 */
  assert.equal(A.compute(S({ tShape: 'zzz', tA: '50', tB: '50', tC: '50' })).tp.shape, 'box');
});

test('极值：0.5 mm 与 1,000 mm、1% 与 99%、D 极大极小都给出有限正数', () => {
  for (const st of [S({ tShape: 'ball', tA: '0.5', target: '1' }), S({ tShape: 'box', tA: '1000', tB: '1000', tC: '1000', target: '99' }),
    S({ mode: 'direct', dval: '0.001', tShape: 'cyl', tA: '1000', tB: '1000', target: '99', plan: '2000' }), S({ mode: 'direct', dval: '10000', tShape: 'ball', tA: '0.5', plan: '0.05' }),
    S({ lShape: 'ball', lA: '0.5', lHours: '2000', tShape: 'box', tA: '1000', tB: '1000', tC: '1000' })]) {
    const o = A.compute(st); assert.equal(o.ok, true);
    assert.ok(isFinite(o.t1) && o.t1 > 0, String(o.t1)); assert.ok(o.curve.length === 81 && o.curve.every((q) => q.center >= 0 && q.center <= 1));
    abs(A.uptake(o.tp, o.X1).center, o.p, 1e-9, 'X1 正好到 p');
    assert.ok(typeof A.dur(o.t1) === 'string' && A.dur(o.t1).length < 20, A.dur(o.t1));
  }
  /* 时长格式 */
  assert.equal(A.dur(0.004), '不到 1 分钟'); assert.equal(A.dur(0.5), '30 分钟'); assert.equal(A.dur(1), '1 小时'); assert.equal(A.dur(47.99), '47 小时 59 分');
  assert.equal(A.dur(48), '2 天'); assert.equal(A.dur(53.4), '2 天 5 小时'); assert.equal(A.dur(53.6), '2 天 6 小时'); assert.equal(A.dur(24 * 5000), '5,000 天'); assert.equal(A.dur(59.9 / 60), '1 小时');
  assert.equal(A.mm(1000), '1,000'); assert.equal(A.mm(56.94), '56.9'); assert.equal(A.pct(0.9999), '99.99%');
});

test('导出：CSV 引号转义与关键字段、Markdown 含结论与边界', () => {
  const o = A.compute(S({ tName: '一锅"卤",蛋' , tShape: 'ball', tA: '45' }));
  const csv = A.toCSV(o, '2026-11-16 13:00');
  assert.ok(csv.indexOf('这次,"一锅""卤"",蛋"') >= 0, csv.slice(0, 300));
  assert.ok(csv.indexOf('这次要泡（小时），') < 0 && csv.indexOf('这次要泡（小时）,' + Number(o.t1.toFixed(4))) >= 0);
  assert.ok(csv.indexOf('够不够,') >= 0);
  const md = A.toMD(o, 'x'); assert.ok(md.indexOf(o.headline) >= 0 && md.indexOf('## 边界') >= 0 && md.indexOf('食品安全') >= 0);
});
