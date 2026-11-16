/* 正中心那一口 · 计算核心（core.js）
 * 问题：上次那块泡了多久刚好入味，这次换了大小、换了形状，要泡多久才进到正中心？
 * 模型（菲克扩散，设计选择见页面「没算进去的事」）：
 *   一块料浸在浓度恒定的料汁里，味道从表面往里扩散，扩散系数 D（mm²/h）处处相同、不随时间变化。
 *   「入味」= 正中心的浓度到了外面料汁的 p%（p 由你定，默认 50%）。
 *   形状拆成一维因子相乘（分离变量的乘积解）：长方块 = 三块无限大平板（半厚 L/2、W/2、H/2）；
 *   圆柱 = 无限长圆柱（半径 R）× 平板（半长 len/2）；球 = 球（半径 R）。
 *   每个因子在傅里叶数 F = D·t / a² 下的「中心还差多少」u 与「平均还差多少」ū：
 *     平板 u = Σ 4/π·(−1)^n/(2n+1)·e^{−(2n+1)²π²F/4}        ū = Σ 8/((2n+1)²π²)·e^{−(2n+1)²π²F/4}
 *     圆柱 u = Σ 2/(λ_n J1(λ_n))·e^{−λ_n²F}（λ_n 为 J0 零点）   ū = Σ 4/λ_n²·e^{−λ_n²F}
 *     球   u = Σ 2(−1)^{n+1}·e^{−n²π²F}                          ū = Σ 6/(n²π²)·e^{−n²π²F}
 *   F < 0.002 时中心的变化 < 1e−50，取 u = 1；平均用短时展开（平板 2√(F/π)，球 6√(F/π) − 3F，圆柱 4√(F/π) − F − F^1.5/(3√π)）。
 *   中心入味程度 = 1 − Π u，整块平均 = 1 − Π ū。两者只依赖 X = D·t（尺寸固定时），所以：
 *   按上次的经验：上次那块 X0 = 让中心到 p 所需的 D·t，D = X0 / t0；这次 t1 = X1 / D = t0 · X1 / X0。 */
(function (root) {
  'use strict';
  var Z0 = [2.4048255576958,5.5200781102863,8.653727912911,11.7915344390143,14.9309177084878,18.0710639679109,21.2116366298793,24.3524715307493,27.4934791320403,30.634606468432,33.7758202135736,36.917098353664,40.0584257646282,43.1997917131767,46.3411883716618,49.4826098973978,52.624051841115,55.76551075502,58.9069839260809,62.0484691902272,65.1899648002069,68.3314693298568,71.4729816035937,74.6145006437018,77.7560256303881,80.8975558711376,84.0390907769382,87.1806298436412,90.3221726372105,93.4637187819448,96.6052679509963,99.7468198586806,102.8883742541948,106.0299309164516,109.1714896498054,112.3130502804949,115.4546126536669,118.5961766308725,121.737742087951,124.8793089132329,128.0208770060083,131.1624462752139,134.3040166383055,137.4455880202843,140.5871603528543,143.7287335736897,146.8703076257966,150.0118824569547,153.1534580192279,156.2950342685335,159.4366111642632,162.5781886689467,165.719766747955,168.8613453692358,172.0029245030782,175.1445041219027,178.2860842000738,181.427664713731,184.5692456406387,187.7108269600494,190.8524086525815,193.9939907001091,197.1355730856614,200.2771557933324,203.4187388081987,206.5603221162445,209.7019057042941,212.8434895599495,215.985073671534,219.1266580280405,222.2682426190843,225.4098274348593,228.5514124660988,231.6929977040386,234.8345831403832,237.9761687672757,241.117754577268,244.2593405632957,247.4009267186528,250.54251303697];
var J1Z = [0.5191474972895,-0.3402648065584,0.2714522999284,-0.2324598313647,0.206546433078,-0.1877288030404,0.1732658942292,-0.1617015506892,0.1521812137706,-0.1441659776864,0.1372969434085,-0.1313246266687,0.1260694971273,-0.1213986247718,0.1172111988907,-0.1134291926164,0.1099911430463,-0.1068478882547,0.1039595728694,-0.1012934989339,0.0988225538012,-0.09652404046468,0.09437879398468,-0.09237050482355,0.09048519416296,-0.08871080244097,0.0870368633241,-0.08545424291091,0.08395492928346,-0.08253186130831,0.08117878831953,-0.07989015430874,0.0786610017193,-0.07748689103966,0.07636383321829,-0.07528823255206,0.07425683818227,-0.07326670270621,0.07231514670237,-0.07139972819623,0.07051821627334,-0.06966856819003,0.06884890944685,-0.06805751638168,0.06729280091474,-0.06655329713771,0.06583764948943,-0.06514460230079,0.06447299052551,-0.06382173150082,0.06318981760571,-0.06257630970331,0.06198033127025,-0.0614010631297,0.06083773871596,-0.06028963980835,0.05975609268042,-0.05923646461757,0.05873016076204,-0.05823662124965,0.05775531860673,-0.05728575537998,0.05682746197486,-0.05637999468123,0.05594293386738,-0.05551588232564,0.05509846375495,-0.05469032136696,0.05429111660415,-0.05390052795931,0.05351824988721,-0.05314399179997,0.05277747713856,-0.05241844251392,0.0520666369114,-0.05172182095318,0.05138376621371,-0.05105225458379,0.05072707767913,-0.05040803628984];
  var PI = Math.PI, SQPI = Math.sqrt(Math.PI), FMIN = 0.002, EXPCUT = 60;
  var SHAPES = { box: '长方块', cyl: '圆柱 / 长条', ball: '球 / 蛋' };
  var DIMS = { box: ['长', '宽', '厚'], cyl: ['直径', '长'], ball: ['直径'] };
  var MAX_MM = 1000, MIN_MM = 0.5, MAX_H = 2000, MAX_D = 10000;
  var SCALES = [0.5, 0.75, 1, 1.5, 2, 3];
  var TARGETS = [30, 50, 70, 90];

  function defaultState() {
    return {
      mode: 'calib',
      lName: '上次切成厚片的牛腱', lShape: 'box', lA: '80', lB: '60', lC: '30', lHours: '6',
      dval: '1',
      tName: '这次整条牛腱', tShape: 'cyl', tA: '60', tB: '150', tC: '',
      target: '50', plan: '12'
    };
  }

  /* ── 一维因子 ── */
  function slabU(F) {
    if (F < FMIN) return 1;
    var s = 0;
    for (var n = 0; ; n++) { var k = 2 * n + 1, e = k * k * PI * PI * F / 4; if (e > EXPCUT) break; s += 4 / PI * (n % 2 ? -1 : 1) / k * Math.exp(-e); }
    return Math.min(1, Math.max(0, s));
  }
  function slabA(F) {
    if (F < FMIN) return 1 - 2 * Math.sqrt(F / PI);
    var s = 0;
    for (var n = 0; ; n++) { var k = 2 * n + 1, e = k * k * PI * PI * F / 4; if (e > EXPCUT) break; s += 8 / (k * k * PI * PI) * Math.exp(-e); }
    return Math.min(1, Math.max(0, s));
  }
  function ballU(F) {
    if (F < FMIN) return 1;
    var s = 0;
    for (var n = 1; ; n++) { var e = n * n * PI * PI * F; if (e > EXPCUT) break; s += 2 * (n % 2 ? 1 : -1) * Math.exp(-e); }
    return Math.min(1, Math.max(0, s));
  }
  function ballA(F) {
    if (F < FMIN) return 1 - (6 * Math.sqrt(F / PI) - 3 * F);
    var s = 0;
    for (var n = 1; ; n++) { var e = n * n * PI * PI * F; if (e > EXPCUT) break; s += 6 / (n * n * PI * PI) * Math.exp(-e); }
    return Math.min(1, Math.max(0, s));
  }
  function cylU(F) {
    if (F < FMIN) return 1;
    var s = 0;
    for (var i = 0; i < Z0.length; i++) { var l = Z0[i], e = l * l * F; if (e > EXPCUT) break; s += 2 / (l * J1Z[i]) * Math.exp(-e); }
    return Math.min(1, Math.max(0, s));
  }
  function cylA(F) {
    if (F < FMIN) return 1 - (4 * Math.sqrt(F / PI) - F - Math.pow(F, 1.5) / (3 * SQPI));
    var s = 0;
    for (var i = 0; i < Z0.length; i++) { var l = Z0[i], e = l * l * F; if (e > EXPCUT) break; s += 4 / (l * l) * Math.exp(-e); }
    return Math.min(1, Math.max(0, s));
  }
  var KIND = { slab: [slabU, slabA], cyl: [cylU, cylA], ball: [ballU, ballA] };

  /* 一块料 → 一维因子清单 [{kind, a(半尺寸 mm)}]；Infinity 表示这一方向「很长」不算 */
  function factors(piece) {
    var d = piece.dims, f = [];
    if (piece.shape === 'box') d.forEach(function (x) { if (isFinite(x)) f.push({ kind: 'slab', a: x / 2 }); });
    else if (piece.shape === 'cyl') { f.push({ kind: 'cyl', a: d[0] / 2 }); if (isFinite(d[1])) f.push({ kind: 'slab', a: d[1] / 2 }); }
    else f.push({ kind: 'ball', a: d[0] / 2 });
    return f;
  }
  /* X = D·t（mm²）下中心、平均入味程度（0–1） */
  function uptake(piece, X) {
    var fs = factors(piece), uc = 1, ua = 1;
    fs.forEach(function (q) { var F = X / (q.a * q.a); uc *= KIND[q.kind][0](F); ua *= KIND[q.kind][1](F); });
    return { center: 1 - uc, avg: 1 - ua };
  }
  /* 让中心到 p 所需的 X（mm²）：对数二分 */
  function needX(piece, p) {
    var amin = Infinity; factors(piece).forEach(function (q) { amin = Math.min(amin, q.a); });
    var lo = 1e-9 * amin * amin, hi = amin * amin;
    while (uptake(piece, hi).center < p) hi *= 2;
    for (var i = 0; i < 200; i++) { var mid = Math.sqrt(lo * hi); if (uptake(piece, mid).center < p) lo = mid; else hi = mid; if (hi / lo - 1 < 1e-13) break; }
    return hi;
  }

  function num(s) {
    var t = String(s == null ? '' : s).replace(/[,，\s_]/g, '').replace(/(mm|毫米|小时|h|%|％)$/i, '');
    if (t === '' || !/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return NaN;
    return Number(t);
  }
  function fix(v, d) { return String(Number(v.toFixed(d))); }
  function group(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function mm(v) { var t = fix(v, 1).split('.'); return group(t[0]) + (t[1] ? '.' + t[1] : ''); }
  function pct(f) {
    var v = f * 100;
    if (Math.abs(v - Math.round(v)) < 1e-9) return Math.round(v) + '%';
    var d = 1;
    while (d < 6 && (Number(v.toFixed(d)) === 0 || Number(v.toFixed(d)) === 100)) d++;
    return v.toFixed(d) + '%';
  }
  /* 时长：先四舍五入到分钟。<1 小时写分钟；<48 小时写「x 小时 y 分」；再长写「x 天 y 小时」 */
  function dur(h) {
    if (!isFinite(h)) return String(h);
    var m = Math.round(h * 60);
    if (m < 1) return '不到 1 分钟';
    if (m < 60) return m + ' 分钟';
    if (m < 48 * 60) { var H = Math.floor(m / 60), r = m % 60; return H + ' 小时' + (r ? ' ' + r + ' 分' : ''); }
    var hh = Math.round(h), D = Math.floor(hh / 24), rh = hh % 24;
    return group(String(D)) + ' 天' + (rh ? ' ' + rh + ' 小时' : '');
  }
  function ratio(x) { if (x >= 1000) return group(String(Math.round(x))); return x >= 10 ? fix(x, 1) : fix(x, 2); }
  /* 极值卡目检：中心残差恰为 1 时写成「只到 0%」像出错 → 不到 0.05% 写「几乎还没进味」 */
  function reach(f) { return f < 0.0005 ? '几乎还没进味' : '只到 ' + pct(f); }

  function pieceText(shape, dims) {
    var n = DIMS[shape];
    if (shape === 'ball') return '直径 ' + mm(dims[0]) + ' mm 的' + '球';
    if (shape === 'cyl') return '直径 ' + mm(dims[0]) + ' mm、长 ' + (isFinite(dims[1]) ? mm(dims[1]) + ' mm' : '很长') + ' 的圆柱';
    return dims.map(function (x) { return isFinite(x) ? mm(x) : '很长'; }).join(' × ') + ' mm 的长方块';
  }

  function parse(s) {
    var e = [], v = {}, bad = {};
    function need(k, name, lo, hi, unit) {
      var x = num(s[k]);
      if (!isFinite(x)) { e.push({ field: k, message: name + '要填一个数。' }); bad[k] = 1; return; }
      if (x < lo || x > hi) { e.push({ field: k, message: name + '要在 ' + lo + ' 到 ' + group(String(hi)) + ' ' + unit + ' 之间。' }); bad[k] = 1; return; }
      v[k] = x;
    }
    function dimsOf(pre, shape, label) {
      var keys = [pre + 'A', pre + 'B', pre + 'C'].slice(0, DIMS[shape].length);
      keys.forEach(function (k, i) { need(k, label + '的' + DIMS[shape][i], MIN_MM, MAX_MM, 'mm'); });
      return keys.map(function (k) { return v[k]; });
    }
    var mode = s.mode === 'direct' ? 'direct' : 'calib';
    var tShape = SHAPES[s.tShape] ? s.tShape : 'box', lShape = SHAPES[s.lShape] ? s.lShape : 'box';
    need('target', '正中心要到料汁的', 1, 99, '%');
    need('plan', '打算泡', 0.05, MAX_H, '小时');
    var tDims = dimsOf('t', tShape, '这次');
    var lDims = null;
    if (mode === 'calib') { lDims = dimsOf('l', lShape, '上次'); need('lHours', '上次泡了', 0.05, MAX_H, '小时'); }
    else need('dval', '渗透快慢 D', 0.001, MAX_D, 'mm²/h');
    return { ok: e.length === 0, errors: e, v: v, bad: bad, mode: mode, tShape: tShape, lShape: lShape, tDims: tDims, lDims: lDims,
      lName: String(s.lName || '上次那块').trim().slice(0, 24) || '上次那块', tName: String(s.tName || '这次这块').trim().slice(0, 24) || '这次这块' };
  }

  var EPS = 1e-9;
  /* 这次这块在 D 下到 p 要多少小时 */
  function hoursFor(piece, p, D) { return needX(piece, p) / D; }

  function compute(state) {
    var q = parse(state);
    if (!q.ok) return { ok: false, errors: q.errors, bad: q.bad };
    var v = q.v, p = v.target / 100, plan = v.plan;
    var tp = { shape: q.tShape, dims: q.tDims }, lp = q.lDims ? { shape: q.lShape, dims: q.lDims } : null;
    var X1 = needX(tp, p), X0 = lp ? needX(lp, p) : null;
    var D = lp ? X0 / v.lHours : v.dval;
    var t1 = X1 / D;
    var atNeed = uptake(tp, X1), atPlan = uptake(tp, D * plan);
    var lastAvg = lp ? uptake(lp, X0).avg : null;
    var hit = atPlan.center >= p - EPS;
    var o = { ok: true, mode: q.mode, v: v, p: p, plan: plan, D: D, X1: X1, X0: X0, t1: t1, t0: lp ? v.lHours : null,
      ratio: lp ? t1 / v.lHours : null, tp: tp, lp: lp, tName: q.tName, lName: q.lName,
      avgAtNeed: atNeed.avg, centerAtPlan: atPlan.center, avgAtPlan: atPlan.avg, lastAvg: lastAvg, hit: hit,
      tText: pieceText(tp.shape, tp.dims), lText: lp ? pieceText(lp.shape, lp.dims) : null };
    /* 差多少 / 还剩多少 */
    o.gap = t1 - plan;
    /* 改一项：① 改泡 t1；② 整体按比例缩到 s 倍（t ∝ 尺寸²，闭式）；③ 长方块最薄那边切到多少（二分）；④ 最长那边对半切能快多少 */
    var acts = [];
    if (!hit) {
      acts.push({ kind: 'plan', text: '改成泡 ' + dur(t1), after: t1, set: { plan: fix(Math.ceil(t1 * 100 - 1e-9) / 100, 2) } });
      var s = Math.sqrt(plan / t1);
      var nd = tp.dims.map(function (x) { return x * s; });
      if (nd.every(function (x) { return x >= MIN_MM; })) {
        var rounded = nd.map(function (x) { return Math.floor(x * 10) / 10; });
        var setS = {}; rounded.forEach(function (x, i) { setS['t' + 'ABC'[i]] = fix(x, 1); });
        var tS = hoursFor({ shape: tp.shape, dims: rounded }, p, D);
        acts.push({ kind: 'scale', s: s, dims: rounded, after: tS, text: '整块按比例切小到 ' + pct(s) + '（' + pieceText(tp.shape, rounded) + '）', set: setS });
      }
      if (tp.shape === 'box' || tp.shape === 'cyl') {
        var mi = 0; if (tp.shape === 'box') tp.dims.forEach(function (x, i) { if (x < tp.dims[mi]) mi = i; });
        var lo = MIN_MM, hi = tp.dims[mi];
        var at = function (x) { var d = tp.dims.slice(); d[mi] = x; return hoursFor({ shape: tp.shape, dims: d }, p, D); };
        if (at(lo) <= plan) {
          for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (at(mid) <= plan) lo = mid; else hi = mid; }
          var thin = Math.floor(lo * 10) / 10, setT = {}; setT['t' + 'ABC'[mi]] = fix(thin, 1);
          acts.push({ kind: 'thin', dim: mi, value: thin, after: at(thin), text: tp.shape === 'cyl' ? '长度不动，只把直径切到 ' + mm(thin) + ' mm' : '只把最薄的那边（' + DIMS.box[mi] + '）切到 ' + mm(thin) + ' mm', set: setT });
        }
      }
    }
    /* 对半切最长那边：说明「切短不如切薄」（长方块、圆柱都适用；球不适用） */
    var half = null;
    if (tp.shape === 'box' || tp.shape === 'cyl') {
      var li = tp.shape === 'cyl' ? 1 : 0; if (tp.shape === 'box') tp.dims.forEach(function (x, i) { if (x > tp.dims[li]) li = i; });
      var hd = tp.dims.slice(); hd[li] = hd[li] / 2;
      if (hd[li] >= MIN_MM) { var th = hoursFor({ shape: tp.shape, dims: hd }, p, D); half = { dim: li, name: DIMS[tp.shape][li], dims: hd, hours: th, saved: 1 - th / t1 }; }
    }
    o.actions = acts; o.half = half;
    /* 厚薄对照：整块等比例 k 倍 → 时间 k² 倍（同一个 needX 现算，不靠公式抄） */
    o.scales = SCALES.map(function (k) { var d = tp.dims.map(function (x) { return x * k; }); var h = hoursFor({ shape: tp.shape, dims: d }, p, D); return { k: k, dims: d, hours: h, cur: k === 1, hit: h <= plan + EPS }; });
    /* 形状对照：最薄那一边相同（d） */
    var dmin = Math.min.apply(null, tp.dims);
    var SH = [
      { key: 'slab', name: '大薄片（长宽都很长）', piece: { shape: 'box', dims: [Infinity, Infinity, dmin] } },
      { key: 'bar', name: '方条（截面 d×d，很长）', piece: { shape: 'box', dims: [Infinity, dmin, dmin] } },
      { key: 'rod', name: '圆条（直径 d，很长）', piece: { shape: 'cyl', dims: [dmin, Infinity] } },
      { key: 'cube', name: '正方块（d×d×d）', piece: { shape: 'box', dims: [dmin, dmin, dmin] } },
      { key: 'ball', name: '球（直径 d）', piece: { shape: 'ball', dims: [dmin] } }
    ];
    o.dmin = dmin;
    o.shapes = SH.map(function (x) { var h = hoursFor(x.piece, p, D); return { key: x.key, name: x.name, hours: h, hit: h <= plan + EPS }; });
    /* 「入味」标准换一下：按上次经验时，比例随 p 变（不同形状的曲线形状不同） */
    o.targets = TARGETS.map(function (tq) { var pp = tq / 100, x1 = needX(tp, pp), dd = lp ? needX(lp, pp) / v.lHours : D; return { p: tq, hours: x1 / dd, ratio: lp ? x1 / dd / v.lHours : null, cur: tq === v.target }; });
    /* 时间线：0 → max(2·t1, 1.2·plan) */
    var tEnd = Math.max(2 * t1, 1.2 * plan), pts = [];
    for (var j = 0; j <= 80; j++) { var tt = tEnd * j / 80, u = uptake(tp, D * tt); pts.push({ t: tt, center: u.center, avg: u.avg }); }
    o.curve = pts; o.tEnd = tEnd;
    o.headline = headline(o);
    return o;
  }

  function headline(o) {
    var s = o.tName + '（' + o.tText + '）';
    if (o.mode === 'calib') s += '要泡 ' + dur(o.t1) + '，正中心才到料汁的 ' + pct(o.p) + '：是' + o.lName + '（' + dur(o.t0) + '）的 ' + ratio(o.ratio) + ' 倍。';
    else s += '按 D = ' + fix(o.D, 4) + ' mm²/h 算，要泡 ' + dur(o.t1) + '，正中心才到料汁的 ' + pct(o.p) + '。';
    if (o.hit) s += '打算泡 ' + dur(o.plan) + '，够了，那时正中心到 ' + pct(o.centerAtPlan) + '。';
    else s += '打算泡 ' + dur(o.plan) + '，正中心' + reach(o.centerAtPlan) + '，还差 ' + dur(o.gap) + '。';
    return s;
  }

  function csvCell(v) { var t = String(v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }
  function toCSV(o, when) {
    var L = ['项目,值'], add = function (k, val) { L.push(csvCell(k) + ',' + csvCell(val)); };
    add('导出时间', when); add('算法', o.mode === 'calib' ? '按上次的经验换算' : '直接填渗透快慢 D');
    if (o.lp) { add('上次', o.lName); add('上次形状', o.lText); add('上次泡了（小时）', o.t0); add('上次那块整块平均（中心刚到时）', (o.lastAvg * 100).toFixed(2) + '%'); }
    add('换算出的 D（mm²/h）', Number(o.D.toPrecision(6)));
    add('这次', o.tName); add('这次形状', o.tText); add('正中心要到料汁的（%）', o.v.target);
    add('这次要泡（小时）', Number(o.t1.toFixed(4))); add('这次要泡', dur(o.t1)); if (o.lp) add('是上次的倍数', Number(o.ratio.toFixed(4)));
    add('中心刚到时整块平均（%）', (o.avgAtNeed * 100).toFixed(2));
    add('打算泡（小时）', o.plan); add('打算泡到时正中心（%）', (o.centerAtPlan * 100).toFixed(2)); add('打算泡到时整块平均（%）', (o.avgAtPlan * 100).toFixed(2)); add('够不够', o.hit ? '够' : '不够');
    L.push(''); L.push('改一项,改完要泡（小时）');
    o.actions.forEach(function (a) { add(a.text, Number(a.after.toFixed(4))); });
    if (o.half) add('最长那边（' + o.half.name + '）对半切', Number(o.half.hours.toFixed(4)));
    L.push(''); L.push('整块等比例,要泡（小时）');
    o.scales.forEach(function (s) { add(s.k + ' 倍' + (s.cur ? '（这次）' : ''), Number(s.hours.toFixed(4))); });
    L.push(''); L.push('最薄一边同为 ' + mm(o.dmin) + ' mm 的形状,要泡（小时）');
    o.shapes.forEach(function (s) { add(s.name, Number(s.hours.toFixed(4))); });
    L.push(''); L.push('入味标准（正中心到料汁的 %）,要泡（小时）');
    o.targets.forEach(function (s) { add(s.p + '%' + (s.cur ? '（当前）' : ''), Number(s.hours.toFixed(4))); });
    return L.join('\n') + '\n';
  }
  function toMD(o, when) {
    var L = ['# 正中心那一口 · ' + o.tName, '', '导出：' + when, '', '## 结论', '', o.headline, '', '## 上次 vs 这次', '',
      '| | ' + (o.lp ? '上次 · ' + o.lName : '直接填 D') + ' | 这次 · ' + o.tName + ' |', '|---|---|---|'];
    L.push('| 形状 | ' + (o.lp ? o.lText : '—') + ' | ' + o.tText + ' |');
    L.push('| 泡多久正中心到 ' + pct(o.p) + ' | ' + (o.lp ? dur(o.t0) : '—') + ' | **' + dur(o.t1) + '** |');
    L.push('| 那时整块平均 | ' + (o.lp ? pct(o.lastAvg) : '—') + ' | ' + pct(o.avgAtNeed) + ' |');
    L.push('', '- 渗透快慢 D = ' + Number(o.D.toPrecision(4)) + ' mm²/h' + (o.lp ? '（由上次那块反推）' : '（你直接填的）'),
      '- 打算泡 ' + dur(o.plan) + '：正中心 ' + pct(o.centerAtPlan) + '、整块平均 ' + pct(o.avgAtPlan) + '，' + (o.hit ? '够了' : '不够'), '');
    if (o.actions.length || o.half) { L.push('## 改一项', ''); o.actions.forEach(function (a) { L.push('- ' + a.text + ' → 要泡 ' + dur(a.after)); }); if (o.half) L.push('- 最长那边（' + o.half.name + '）对半切 → 要泡 ' + dur(o.half.hours) + '（只快 ' + pct(o.half.saved) + '）'); L.push(''); }
    L.push('## 整块等比例变大变小', '', '| 倍数 | 要泡 |', '|---|---|');
    o.scales.forEach(function (s) { L.push('| ' + s.k + ' 倍' + (s.cur ? '（这次）' : '') + ' | ' + dur(s.hours) + ' |'); });
    L.push('', '## 最薄一边都是 ' + mm(o.dmin) + ' mm，换个形状', '', '| 形状 | 要泡 |', '|---|---|');
    o.shapes.forEach(function (s) { L.push('| ' + s.name + ' | ' + dur(s.hours) + ' |'); });
    L.push('', '## 边界', '', '- 按菲克扩散算：料汁浓度不变、整块料均匀、渗透快慢不随时间温度变化；不算皮、壳、肥膘挡一层，不算加热时的翻滚对流和料缩水。',
      '- 只换算时间，不判断咸淡口味，也不做食品安全判断（能放多久、要不要冷藏请按常识和食材自己的要求）。', '- 默认数字是虚构示例。', '');
    return L.join('\n');
  }

  var api = { defaultState: defaultState, compute: compute, parse: parse, num: num, uptake: uptake, needX: needX, factors: factors,
    slabU: slabU, slabA: slabA, cylU: cylU, cylA: cylA, ballU: ballU, ballA: ballA, Z0: Z0, J1Z: J1Z, FMIN: FMIN,
    dur: dur, pct: pct, reach: reach, mm: mm, fix: fix, ratio: ratio, pieceText: pieceText, toCSV: toCSV, toMD: toMD,
    SHAPES: SHAPES, DIMS: DIMS, SCALES: SCALES, TARGETS: TARGETS, EPS: EPS, MIN_MM: MIN_MM, MAX_MM: MAX_MM };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AppCore = api;
})(this);
