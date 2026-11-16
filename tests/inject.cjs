'use strict';
/* 注入测试：对 core.js 做一处小改动，看核心测试能不能抓到。跑完自动还原。 */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const F=path.join(__dirname,'../core.js'),src=fs.readFileSync(F,'utf8');
const M=[
["s += 4 / PI * (n % 2 ? -1 : 1) / k * Math.exp(-e);","s += 4 / PI / k * Math.exp(-e);"],
["var k = 2 * n + 1, e = k * k * PI * PI * F / 4; if (e > EXPCUT) break; s += 4","var k = 2 * n + 1, e = k * k * PI * PI * F / 2; if (e > EXPCUT) break; s += 4"],
["s += 8 / (k * k * PI * PI) * Math.exp(-e);","s += 8 / (k * PI * PI) * Math.exp(-e);"],
["s += 2 * (n % 2 ? 1 : -1) * Math.exp(-e);","s += 2 * Math.exp(-e);"],
["s += 6 / (n * n * PI * PI) * Math.exp(-e);","s += 6 / (n * PI * PI) * Math.exp(-e);"],
["s += 2 / (l * J1Z[i]) * Math.exp(-e);","s += 2 / (l * Math.abs(J1Z[i])) * Math.exp(-e);"],
["s += 4 / (l * l) * Math.exp(-e);","s += 4 / l * Math.exp(-e);"],
["var l = Z0[i], e = l * l * F; if (e > EXPCUT) break; s += 2","var l = Z0[i], e = l * F; if (e > EXPCUT) break; s += 2"],
["if (piece.shape === 'box') d.forEach(function (x) { if (isFinite(x)) f.push({ kind: 'slab', a: x / 2 }); });","if (piece.shape === 'box') d.forEach(function (x) { if (isFinite(x)) f.push({ kind: 'slab', a: x }); });"],
["else if (piece.shape === 'cyl') { f.push({ kind: 'cyl', a: d[0] / 2 });","else if (piece.shape === 'cyl') { f.push({ kind: 'slab', a: d[0] / 2 });"],
["if (isFinite(d[1])) f.push({ kind: 'slab', a: d[1] / 2 }); }","}"],
["else f.push({ kind: 'ball', a: d[0] / 2 });","else f.push({ kind: 'cyl', a: d[0] / 2 });"],
["var F = X / (q.a * q.a);","var F = X / q.a;"],
["return { center: 1 - uc, avg: 1 - ua };","return { center: 1 - uc, avg: 1 - uc };"],
["if (hi / lo - 1 < 1e-13) break;","if (hi / lo - 1 < 1e-3) break;"],
["var D = lp ? X0 / v.lHours : v.dval;","var D = lp ? X0 * v.lHours : v.dval;"],
["var hit = atPlan.center >= p - EPS;","var hit = atPlan.avg >= p - EPS;"],
["var s = Math.sqrt(plan / t1);","var s = plan / t1;"],
["var rounded = nd.map(function (x) { return Math.floor(x * 10) / 10; });","var rounded = nd.map(function (x) { return Math.round(x * 10) / 10; });"],
["set: { plan: fix(Math.ceil(t1 * 100 - 1e-9) / 100, 2) } });","set: { plan: fix(Math.round(t1 * 10) / 10, 2) } });"],
["var thin = Math.floor(lo * 10) / 10","var thin = Math.round(lo * 10) / 10 + 0.1"],
["if (x < tp.dims[mi]) mi = i; });\n        var lo","if (x > tp.dims[mi]) mi = i; });\n        var lo"],
["var SCALES = [0.5, 0.75, 1, 1.5, 2, 3];","var SCALES = [0.5, 0.75, 1.5, 2, 3];"],
["{ key: 'bar', name: '方条（截面 d×d，很长）', piece: { shape: 'box', dims: [Infinity, dmin, dmin] } },","{ key: 'bar', name: '方条（截面 d×d，很长）', piece: { shape: 'box', dims: [dmin, dmin, dmin] } },"],
["dd = lp ? needX(lp, pp) / v.lHours : D;","dd = D;"],
["if (m < 60) return m + ' 分钟';","if (m < 60) return (m / 60).toFixed(1) + ' 小时';"],
["if (m < 48 * 60)","if (m < 24 * 60)"],
["var hh = Math.round(h), D = Math.floor(hh / 24)","var hh = Math.floor(h), D = Math.floor(hh / 24)"],
["if (x < lo || x > hi)","if (x < lo)"],
["if (mode === 'calib') { lDims = dimsOf('l', lShape, '上次');","if (true) { lDims = dimsOf('l', lShape, '上次');"],
[".replace(/(mm|毫米|小时|h|%|％)$/i, '');",".replace(/(%|％)$/i, '');"],
["return /[\",\\n]/.test(t) ?","return /[\\n]/.test(t) ?"],
["if (F < FMIN) return 1 - 2 * Math.sqrt(F / PI);","if (F < FMIN) return 1 - Math.sqrt(F / PI);"],
];
let L=[],caught=0,valid=0;
try{
for(const [a,b] of M){ if(src.indexOf(a)<0){L.push('✗ 没找到注入点：'+a.slice(0,60));continue;} valid++;
 fs.writeFileSync(F,src.replace(a,b));
 let r='';try{execFileSync('node',['--test',path.join(__dirname,'core.test.cjs')],{stdio:'pipe',timeout:120000});r='漏掉';}catch(e){r='抓到';caught++;}
 L.push(r+'：'+a.slice(0,70)+' → '+b.slice(0,70));}
} finally { fs.writeFileSync(F,src); }
L.push('合计 '+caught+'/'+valid+' 抓到');console.log(L.join('\n'));
