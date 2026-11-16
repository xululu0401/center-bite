/* 正中心那一口 · 界面（ui.js）
 * 读 state → AppCore.compute → 把同一次输出画出来。页面自己不做扩散计算。 */
(function () {
  'use strict';
  var A = window.AppCore;
  var KEY = 'center-bite:v1';
  var $ = function (id) { return document.getElementById(id); };
  var Dd = A.dur, P = A.pct, MM = A.mm;
  var TEXT = ['lName', 'lA', 'lB', 'lC', 'lHours', 'dval', 'tName', 'tA', 'tB', 'tC', 'target', 'plan'];
  var ENUM = { mode: ['calib', 'direct'], lShape: ['box', 'cyl', 'ball'], tShape: ['box', 'cyl', 'ball'] };
  var SHAPE_BTN = { box: '长方块', cyl: '圆柱/长条', ball: '球/蛋' };
  var PRESETS = [
    { key: 'beef', name: '厚片换整条（默认）', note: '虚构示例：上次把牛腱切成 80×60×30 mm 的厚片，泡 6 小时正中心刚好有味；这次整条直径 60、长 150 mm，打算泡 12 小时。数字是编的，请换成你自己泡过的那一次。', s: {} },
    { key: 'egg', name: '鹌鹑蛋换鸡蛋', note: '虚构示例：剥了壳的鹌鹑蛋（当成直径 26 mm 的球）泡 3 小时中间有味；这次剥壳的鸡蛋当成直径 42 mm 的球。蛋不是正圆、带壳泡会慢很多，这里只看剥壳后的大小差。', s: { lName: '上次剥壳鹌鹑蛋', lShape: 'ball', lA: '26', lB: '', lC: '', lHours: '3', tName: '这次剥壳鸡蛋', tShape: 'ball', tA: '42', tB: '', tC: '', plan: '6' } },
    { key: 'chicken', name: '鸡胸片厚了一倍', note: '虚构示例：上次 15 mm 厚的鸡胸片腌 30 分钟够了，这次没片开、整块 30 mm 厚；长宽都比厚度大得多。', s: { lName: '上次 15 mm 鸡胸片', lShape: 'box', lA: '150', lB: '80', lC: '15', lHours: '0.5', tName: '这次整块 30 mm', tShape: 'box', tA: '150', tB: '80', tC: '30', plan: '1' } },
    { key: 'direct', name: '我知道 D 值', note: '虚构示例：直接填渗透快慢 D = 1 mm²/小时（随便取的数，不代表任何食材），看直径 45 mm 的球要泡多久。', s: { mode: 'direct', dval: '1', tName: '一个球', tShape: 'ball', tA: '45', tB: '', tC: '', plan: '48' } }
  ];
  function presetState(k) { var s = A.defaultState(), p = PRESETS.filter(function (q) { return q.key === k; })[0]; Object.keys(p.s).forEach(function (f) { s[f] = p.s[f]; }); return s; }
  function presetKey(s) { var j = JSON.stringify(s); for (var i = 0; i < PRESETS.length; i++) if (JSON.stringify(presetState(PRESETS[i].key)) === j) return PRESETS[i].key; return null; }

  function sanitize(s) {
    if (!s || typeof s !== 'object') return null;
    var d = A.defaultState(), any = false;
    TEXT.forEach(function (k) { if (s[k] != null && typeof s[k] !== 'object') { d[k] = String(s[k]).slice(0, 24); any = true; } });
    Object.keys(ENUM).forEach(function (k) { if (ENUM[k].indexOf(s[k]) >= 0) { d[k] = s[k]; any = true; } });
    return any ? d : null;
  }
  function load() { try { var t = localStorage.getItem(KEY); if (!t) return null; var j = JSON.parse(t); return sanitize(j && j.state); } catch (e) { return null; } }
  var state = load() || A.defaultState();
  var out = null;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ state: state })); $('saveTag').textContent = '· 已存到本机'; }
    catch (e) { $('saveTag').textContent = '· 没能存到本机'; }
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function renderPresets() {
    var key = presetKey(state);
    $('presets').innerHTML = PRESETS.map(function (p) { return '<button type="button" class="chip" id="preset_' + p.key + '" data-p="' + p.key + '" aria-pressed="' + (key === p.key) + '">' + esc(p.name) + '</button>'; }).join('');
    var cur = PRESETS.filter(function (p) { return p.key === key; })[0];
    $('presetNote').textContent = cur ? cur.note : '你改过的（按你填的算）。';
  }
  $('presets').addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (!b) return; state = presetState(b.getAttribute('data-p')); fill(); update(); });
  function shapeSeg(pre) {
    var k = pre + 'Shape';
    $(pre + 'ShapeSeg').innerHTML = ['box', 'cyl', 'ball'].map(function (s) { return '<button type="button" id="' + pre + 'Shape_' + s + '" data-s="' + s + '" aria-pressed="' + (state[k] === s) + '">' + SHAPE_BTN[s] + '</button>'; }).join('');
    var dims = A.DIMS[state[k]];
    ['A', 'B', 'C'].forEach(function (c, i) {
      var f = $(pre + c + '_f'); f.classList.toggle('hide', i >= dims.length);
      if (i < dims.length) $(pre + c + '_l').textContent = dims[i] + '（mm）';
    });
  }
  ['l', 't'].forEach(function (pre) {
    $(pre + 'ShapeSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-s]'); if (!b) return;
      var s = b.getAttribute('data-s'); if (state[pre + 'Shape'] === s) return;
      state[pre + 'Shape'] = s;
      /* 换形状时把多出来的格子清空，缺的格子用第一格的数补上（避免默认出现空格报错） */
      var n = A.DIMS[s].length;
      ['B', 'C'].forEach(function (c, i) { if (i + 1 >= n) state[pre + c] = ''; else if (!String(state[pre + c]).trim()) state[pre + c] = state[pre + 'A']; });
      fill(); update();
    });
  });
  $('modeSeg').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; state.mode = b.getAttribute('data-m'); fill(); update(); });
  function fill() {
    TEXT.forEach(function (k) { if ($(k).value !== String(state[k])) $(k).value = state[k]; });
    shapeSeg('l'); shapeSeg('t');
    ['calib', 'direct'].forEach(function (m) { $('mode_' + m).setAttribute('aria-pressed', String(state.mode === m)); });
    $('lastCol').classList.toggle('hide', state.mode !== 'calib');
    $('dCol').classList.toggle('hide', state.mode === 'calib');
  }
  TEXT.forEach(function (k) { $(k).addEventListener('input', function () { state[k] = this.value; update(); }); });
  function markErrors() {
    TEXT.forEach(function (k) { $(k).classList.remove('bad'); });
    (out.errors || []).forEach(function (e) { var el = $(e.field); if (el) el.classList.add('bad'); });
  }

  /* ── 时间线图：中心、平均两条线，入味标准横线，打算泡到竖线，刚好入味点 ── */
  function chart(o) {
    /* 375px 目检：860 宽的 viewBox 缩到 330px 后字只有 5px → 按容器实际宽度画（最窄 300） */
    var cwid = ($('chart').clientWidth || 860), W = Math.max(300, Math.min(860, cwid)), H = W < 500 ? 240 : 300, L = 42, R = 12, T = 14, B = 40, w = W - L - R, h = H - T - B;
    var X = function (t) { return L + t / o.tEnd * w; }, Y = function (f) { return T + (1 - f) * h; };
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="正中心与整块平均随时间的变化">';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) { s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(f) + '" y2="' + Y(f) + '" stroke="#ece6da"/><text x="' + (L - 6) + '" y="' + (Y(f) + 4) + '" font-size="12" text-anchor="end" fill="#8e877c">' + Math.round(f * 100) + '%</text>'; });
    var ticks = niceTicks(o.tEnd);
    ticks.forEach(function (t) { s += '<line x1="' + X(t) + '" x2="' + X(t) + '" y1="' + (T + h) + '" y2="' + (T + h + 5) + '" stroke="#8e877c"/><text x="' + X(t) + '" y="' + (T + h + 20) + '" font-size="12" text-anchor="middle" fill="#8e877c">' + tickLabel(t, o.tEnd) + '</text>'; });
    var path = function (k) { return o.curve.map(function (q, i) { return (i ? 'L' : 'M') + X(q.t).toFixed(1) + ' ' + Y(q[k]).toFixed(1); }).join(''); };
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(o.p) + '" y2="' + Y(o.p) + '" stroke="#23201b" stroke-dasharray="5 5"/>';
    s += '<path d="' + path('avg') + '" fill="none" stroke="#c99a5b" stroke-width="2.5"/>';
    s += '<path d="' + path('center') + '" fill="none" stroke="#8a5a2b" stroke-width="3.5"/>';
    s += '<line id="planLine" x1="' + X(o.plan) + '" x2="' + X(o.plan) + '" y1="' + T + '" y2="' + (T + h) + '" stroke="#b3261e" stroke-width="2"/>';
    s += '<circle id="needDot" cx="' + X(o.t1) + '" cy="' + Y(o.p) + '" r="6" fill="#8a5a2b" stroke="#fff" stroke-width="2"/>';
    /* 375px 目检：标签用 end 锚点时左边被截 → 估算文字宽度（汉字 13px、数字 7.5px），把起点夹在绘图区里 */
    var lab = Dd(o.t1) + ' 正中心到 ' + P(o.p), lw = 0;
    for (var ci = 0; ci < lab.length; ci++) lw += /[\u4e00-\u9fff]/.test(lab[ci]) ? 13 : 7.5;
    var lx = X(o.t1) + 10;
    if (lx + lw > W - R) lx = X(o.t1) - 10 - lw;
    lx = Math.max(L + 4, Math.min(W - R - lw, lx));
    s += '<text id="needLabel" x="' + lx.toFixed(1) + '" y="' + (Y(o.p) + (o.p > 0.8 ? 22 : -12)) + '" font-size="13" font-weight="700" fill="#8a5a2b" stroke="#fff" stroke-width="4" paint-order="stroke" text-anchor="start">' + esc(lab) + '</text>';
    s += '<text x="' + (W - R) + '" y="' + (H - 4) + '" font-size="12" text-anchor="end" fill="#8e877c">' + (o.tEnd >= 72 ? '天' : '小时') + '</text>';
    return s + '</svg>';
  }
  function niceTicks(end) {
    var unit = end >= 72 ? 24 : 1, span = end / unit, maxT = ($('chart').clientWidth || 860) < 500 ? 5 : 8, steps = [0.25, 0.5, 1, 2, 3, 6, 12, 24, 48, 100, 200, 500, 1000, 2000, 5000], st = steps[steps.length - 1];
    for (var i = 0; i < steps.length; i++) if (span / steps[i] <= maxT) { st = steps[i]; break; }
    var r = []; for (var t = 0; t <= span + 1e-9; t += st) r.push(t * unit); return r;
  }
  function tickLabel(t, end) { var v = end >= 72 ? t / 24 : t; return String(Number(v.toFixed(2))); }

  function render() {
    var bad = !out.ok;
    $('errBox').classList.toggle('hide', !bad);
    $('res').classList.toggle('hide', bad);
    if (bad) { $('errBox').innerHTML = '<b>还算不了</b>：<ul>' + out.errors.map(function (e) { return '<li>' + esc(e.message) + '</li>'; }).join('') + '</ul>'; return; }
    var o = out, c = o.mode === 'calib', h = '';
    h += '<tr><th></th><td><b>' + esc(c ? '上次 · ' + o.lName : '你填的 D 值') + '</b></td><td><b>' + esc('这次 · ' + o.tName) + '</b></td></tr>';
    h += '<tr><th>形状和大小</th><td>' + esc(c ? o.lText : '—') + '</td><td>' + esc(o.tText) + '</td></tr>';
    h += '<tr><th>决定快慢的那一边</th><td>' + esc(c ? '最薄 ' + MM(Math.min.apply(null, o.lp.dims)) + ' mm' : '—') + '</td><td>' + esc('最薄 ' + MM(o.dmin) + ' mm') + '</td></tr>';
    h += '<tr class="key"><th>泡多久正中心到 ' + P(o.p) + '</th><td class="n">' + esc(c ? Dd(o.t0) : '—') + '</td><td class="n this" id="needCell">' + esc(Dd(o.t1)) + (c ? '<div class="muted" style="font-weight:400">是上次的 ' + A.ratio(o.ratio) + ' 倍</div>' : '') + '</td></tr>';
    h += '<tr><th>那时整块平均</th><td class="n">' + (c ? P(o.lastAvg) : '—') + '</td><td class="n">' + P(o.avgAtNeed) + '</td></tr>';
    h += '<tr><th>渗透快慢 D</th><td class="n" colspan="2">' + Number(o.D.toPrecision(4)) + ' mm²/小时' + (c ? '（由上次那块反推，这次沿用）' : '') + '</td></tr>';
    $('cmp').innerHTML = h;
    $('verdict').className = 'verdict ' + (o.hit ? 'ok' : 'no');
    $('verdict').textContent = o.hit ? '打算泡 ' + Dd(o.plan) + '：够了' : '打算泡 ' + Dd(o.plan) + '：还差 ' + Dd(o.gap);
    $('headline').textContent = o.headline;
    $('chart').innerHTML = chart(o);
    $('chartNote').textContent = '整块平均总是跑在正中心前面：正中心刚到 ' + P(o.p) + ' 时，整块平均已经到 ' + P(o.avgAtNeed) + '，外面一圈会比中间咸、比中间味重。泡满打算的 ' + Dd(o.plan) + '，正中心' + (o.centerAtPlan < 0.0005 ? '几乎还没进味' : ' ' + P(o.centerAtPlan)) + '、整块平均 ' + P(o.avgAtPlan) + '。';
    /* 建议 */
    $('actPanel').classList.toggle('hide', o.hit && !o.half);
    var ah = o.actions.map(function (a, i) { return '<button type="button" class="act" id="act_' + a.kind + '" data-i="' + i + '">' + esc(a.text) + '<small>改完要泡 ' + esc(Dd(a.after)) + '（点一下改到输入框里）</small></button>'; }).join('');
    if (o.hit) ah = '<p class="note">打算的时间已经够了，不用改。</p>';
    $('acts').innerHTML = ah;
    $('actNote').textContent = o.half ? '只把最长那边（' + o.half.name + '）对半切，要泡 ' + Dd(o.half.hours) + '，只快 ' + P(o.half.saved) + '：快慢由最薄、最细的那一边决定，切短几乎不帮忙，要切薄、切细。' : '球没有「最长那边」，只能整体切小。';
    /* 等比例 */
    var g = '<tr><th>整块</th><th>大小</th><th>要泡</th></tr>';
    o.scales.forEach(function (s) { g += '<tr class="' + (s.cur ? 'cur' : '') + '"><td>' + s.k + ' 倍' + (s.cur ? ' ◀ 这次' : '') + '</td><td>' + esc(A.pieceText(o.tp.shape, s.dims).replace(/ 的(长方块|圆柱|球)$/, '')) + '</td><td class="' + (s.hit ? 'yes' : 'no') + '">' + esc(Dd(s.hours)) + '</td></tr>'; });
    $('grid').innerHTML = g;
    $('gridNote').textContent = '同样的形状，长宽高一起放大 k 倍，要泡 k² 倍：大一倍泡四倍。绿色是打算的 ' + Dd(o.plan) + ' 以内泡得透的。';
    var sh = '<tr><th>形状（最薄一边都是 ' + MM(o.dmin) + ' mm）</th><th>要泡</th></tr>';
    o.shapes.forEach(function (s) { sh += '<tr><td>' + esc(s.name.replace(/d/g, MM(o.dmin))) + '</td><td class="' + (s.hit ? 'yes' : 'no') + '">' + esc(Dd(s.hours)) + '</td></tr>'; });
    $('shapes').innerHTML = sh;
    var sl = o.shapes[0].hours, bl = o.shapes[4].hours;
    $('shapeNote').textContent = '同样 ' + MM(o.dmin) + ' mm，大薄片只能从两面往里渗，球从四面八方往里渗：薄片要泡 ' + Dd(sl) + '，球只要 ' + Dd(bl) + '，差 ' + A.ratio(sl / bl) + ' 倍。';
    var tg = '<tr><th>正中心到料汁的</th><th>这次要泡</th>' + (o.mode === 'calib' ? '<th>是上次的</th>' : '') + '</tr>';
    o.targets.forEach(function (t) { tg += '<tr class="' + (t.cur ? 'cur' : '') + '"><td>' + t.p + '%' + (t.cur ? ' ◀ 当前' : '') + '</td><td>' + esc(Dd(t.hours)) + '</td>' + (o.mode === 'calib' ? '<td>' + A.ratio(t.ratio) + ' 倍</td>' : '') + '</tr>'; });
    $('targets').innerHTML = tg;
    $('targetNote').textContent = o.mode === 'calib' ? '按上次的经验时，每一行都假定上次那块在同样的时长里正中心刚好到这个标准；上次和这次形状不同，倍数会随标准变一点。形状相同、只是大小不同时，倍数不随标准变。' : '直接填 D 时，标准越高要泡越久；最后那一段越来越慢，因为里外浓度差小了，往里渗得也慢了。';
  }
  $('acts').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; var a = out.actions[Number(b.getAttribute('data-i'))]; Object.keys(a.set).forEach(function (k) { state[k] = a.set[k]; }); fill(); update(); });

  function update() { out = A.compute(state); markErrors(); renderPresets(); render(); save(); }
  var rz = null; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (out && out.ok) $('chart').innerHTML = chart(out); }, 120); });

  /* 导出 */
  function stamp() { var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function download(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function tag() { return out.ok ? '要泡' + Math.round(out.t1 * 60) + '分钟' : '出错'; }
  $('dlCsv').addEventListener('click', function () { if (out.ok) download('正中心那一口-' + tag() + '.csv', new Blob(['\ufeff' + A.toCSV(out, stamp())], { type: 'text/csv;charset=utf-8' })); });
  $('dlMd').addEventListener('click', function () { if (out.ok) download('正中心那一口-' + tag() + '.md', new Blob([A.toMD(out, stamp())], { type: 'text/markdown;charset=utf-8' })); });
  $('dlJson').addEventListener('click', function () { download('正中心那一口-备份.json', new Blob([JSON.stringify({ app: '正中心那一口', slug: 'center-bite', version: 1, exported_at: stamp(), state: state }, null, 2)], { type: 'application/json' })); });
  $('impJson').addEventListener('click', function () { $('impFile').click(); });
  $('impFile').addEventListener('change', function () { var f = this.files && this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { importText(String(rd.result)); }; rd.readAsText(f); this.value = ''; });
  function importText(t) {
    var s = null;
    try { var j = JSON.parse(t); s = sanitize(j && j.state ? j.state : j); } catch (e) { s = null; }
    if (!s) { $('saveTag').textContent = '· 这个文件读不出来，没改动'; return false; }
    state = s; fill(); update(); return true;
  }
  $('reset').addEventListener('click', function () { state = A.defaultState(); fill(); update(); });

  /* 结果卡 PNG 1080×1350：文字取自同一次 out */
  function drawCard() {
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d'), FF = '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.fillRect(60, 50, W - 120, H - 100);
    g.strokeStyle = '#ddd5c6'; g.lineWidth = 2; g.strokeRect(60, 50, W - 120, H - 100);
    var L = 110, Rr = W - 110, maxW = Rr - L, y = 150;
    function clip(t, w) { t = String(t); if (g.measureText(t).width <= w) return t; while (t.length > 1 && g.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }
    function text(t, size, color, bold, x, w) { g.font = (bold ? '700 ' : '') + size + 'px ' + FF; g.fillStyle = color; g.fillText(clip(t, w || maxW), x || L, y); }
    function wrap(t, size, color, bold, lim) {
      g.font = (bold ? '700 ' : '') + size + 'px ' + FF; g.fillStyle = color; var cur = '', n = 0;
      var toks = String(t).match(/[0-9.,]+ (?:天|小时)(?: [0-9]+ (?:小时|分))?[）)。，、；：]?|[0-9.,]+ (?:分钟|分|倍|mm)[）)。，、；：]?|[（(]?[0-9A-Za-z.,%×²·]+[）)。，、；：]?|[（(]?[^\s（(][）)。，、；：]?|\s/g) || [];
      for (var i = 0; i < toks.length; i++) { var ch = toks[i]; if (g.measureText(cur + ch).width > maxW && cur) { if (lim && ++n >= lim) { g.fillText(clip(cur + '…', maxW), L, y); y += size * 1.5; return; } g.fillText(cur, L, y); y += size * 1.5; cur = ch.trim() ? ch : ''; } else cur += ch; }
      if (cur) { g.fillText(cur, L, y); y += size * 1.5; }
    }
    text('正中心那一口', 52, '#23201b', true); y += 22;
    g.fillStyle = '#23201b'; g.fillRect(L, y, maxW, 4); y += 50;
    if (!out.ok) { y += 50; text('还算不了', 48, '#b3261e', true); y += 70; out.errors.forEach(function (e) { wrap('· ' + e.message, 28, '#58524a'); y += 8; }); y += 30; wrap('改好输入框里标红的那几项，结果会自动重算。', 26, '#8e877c');
      y += 40; wrap('这张卡算的是：上次那块泡了多久刚好入味，这次换了大小和形状，要泡多久味道才进到正中心。', 26, '#8e877c'); return cv; }
    var o = out, c = o.mode === 'calib';
    wrap(o.tName + '：' + o.tText, 30, '#58524a', true, 2); y += 20;
    g.font = '700 30px ' + FF; g.fillStyle = '#23201b'; g.fillText('要泡', L, y + 10);
    g.font = '800 96px ' + FF; g.fillStyle = '#8a5a2b'; g.fillText(clip(Dd(o.t1), maxW - 90), L + 80, y + 30); y += 90;
    text('正中心才到料汁的 ' + P(o.p) + (c ? ' · 是上次（' + Dd(o.t0) + '）的 ' + A.ratio(o.ratio) + ' 倍' : ''), 30, '#23201b', true); y += 56;
    text(o.hit ? '打算泡 ' + Dd(o.plan) + '：够了，正中心到 ' + P(o.centerAtPlan) : '打算泡 ' + Dd(o.plan) + '：正中心' + A.reach(o.centerAtPlan) + '，还差 ' + Dd(o.gap), 28, o.hit ? '#2b7a4b' : '#b3261e', true); y += 40;
    /* 小图 */
    var cx = L, cw = maxW, ch = 300, cy = y;
    g.strokeStyle = '#ece6da'; g.lineWidth = 1;
    [0, 0.5, 1].forEach(function (f) { g.beginPath(); g.moveTo(cx, cy + (1 - f) * ch); g.lineTo(cx + cw, cy + (1 - f) * ch); g.stroke(); g.font = '20px ' + FF; g.fillStyle = '#8e877c'; g.fillText(Math.round(f * 100) + '%', cx + cw - 52, cy + (1 - f) * ch - 6); });
    var X = function (t) { return cx + t / o.tEnd * cw; }, Yc = function (f) { return cy + (1 - f) * ch; };
    g.setLineDash([8, 8]); g.strokeStyle = '#23201b'; g.beginPath(); g.moveTo(cx, Yc(o.p)); g.lineTo(cx + cw, Yc(o.p)); g.stroke(); g.setLineDash([]);
    [['avg', '#c99a5b', 4], ['center', '#8a5a2b', 6]].forEach(function (q) { g.strokeStyle = q[1]; g.lineWidth = q[2]; g.beginPath(); o.curve.forEach(function (pt, i) { var px = X(pt.t), py = Yc(pt[q[0]]); if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); });
    g.strokeStyle = '#b3261e'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(o.plan), cy); g.lineTo(X(o.plan), cy + ch); g.stroke();
    g.fillStyle = '#8a5a2b'; g.beginPath(); g.arc(X(o.t1), Yc(o.p), 9, 0, 7); g.fill();
    y = cy + ch + 40;
    g.font = '22px ' + FF;
    var lg = [['#8a5a2b', '正中心'], ['#c99a5b', '整块平均'], ['#b3261e', '打算泡到']], lx = L;
    lg.forEach(function (q) { g.fillStyle = q[0]; g.fillRect(lx, y - 9, 28, 5); g.fillStyle = '#58524a'; g.fillText(q[1], lx + 36, y); lx += 36 + g.measureText(q[1]).width + 34; });
    g.fillStyle = '#8e877c'; g.textAlign = 'right'; g.fillText('横轴 0 到 ' + Dd(o.tEnd), Rr, y); g.textAlign = 'left';
    y += 58;
    var tips = [];
    if (!o.hit && o.actions[1]) tips.push(o.actions[1].text + ' → 要泡 ' + Dd(o.actions[1].after));
    if (!o.hit && o.actions[2]) tips.push(o.actions[2].text + ' → 要泡 ' + Dd(o.actions[2].after));
    if (o.half) tips.push('最长那边（' + o.half.name + '）对半切只快 ' + P(o.half.saved) + '：要切薄，不是切短');
    tips.push('整块大一倍要泡四倍；正中心到 ' + P(o.p) + ' 时整块平均已到 ' + P(o.avgAtNeed));
    /* 默认卡目检：4 条提示把下半张占满、形状对照一行都放不下 → 最多 3 条（等比切小那条与切细那条只留后一条，若有） */
    if (tips.length > 3) tips.splice(0, 1);
    tips.forEach(function (t) { if (y < H - 160) { wrap('· ' + t, 27, '#58524a', false, 2); y += 6; } });
    /* 默认卡目检：下半张空着 → 按剩余高度补「最薄一边一样，换个形状」对照（同一次 out.shapes） */
    var rowH = 38, room = Math.floor((H - 120 - (y + 20 + 42)) / rowH);
    if (room >= 2) {
      /* 放不下 5 行时先留两头（薄片最慢、球最快），再按原顺序补中间 */
      var order = [0, 4, 2, 3, 1].slice(0, Math.min(room, 5)).sort(function (x, z) { return x - z; });
      y += 20; text('最薄一边都是 ' + MM(o.dmin) + ' mm，换个形状要泡', 26, '#23201b', true); y += 42;
      order.map(function (i) { return o.shapes[i]; }).forEach(function (s) {
        g.font = '25px ' + FF; g.fillStyle = '#23201b'; g.fillText(clip(s.name.replace(/d/g, MM(o.dmin)), maxW * 0.62), L, y);
        g.fillStyle = s.hit ? '#2b7a4b' : '#b3261e'; g.textAlign = 'right'; g.fillText(clip(Dd(s.hours), maxW * 0.36), Rr, y); g.textAlign = 'left'; y += rowH;
      });
    }
    g.font = '21px ' + FF; g.fillStyle = '#8e877c';
    g.fillText(clip('按扩散规律换算，不判断咸淡与食品安全；默认数字为虚构示例', maxW), L, H - 92);
    return cv;
  }
  $('dlPng').addEventListener('click', function () { drawCard().toBlob(function (b) { if (b) download('正中心那一口-' + tag() + '-1080x1350.png', b); }, 'image/png'); });

  window.__cbUi = { state: function () { return JSON.parse(JSON.stringify(state)); }, out: function () { return out; }, importText: importText, drawCard: drawCard, storageKey: KEY };
  fill(); update();
})();
