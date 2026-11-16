#!/usr/bin/env python3
"""正中心那一口 · 独立参考实现（不读 core.js 的任何常数）
1. 自己用积分式算 J0/J1、牛顿法求 J0 零点；
2. 级数解算中心/平均残差，线性区间二分（core.js 用对数二分）求让中心到 p 的 X=D·t；
3. 另用有限差分（Crank–Nicolson，径向一维）直接解扩散方程，抽查级数解本身（不是对拍 core）。
输出 tests/ref.json。"""
import json, math, random
import numpy as np

def J(n, x, N=None):
    N = N or int(abs(x)) + 400
    t = (np.arange(N) + 0.5) * math.pi / N
    return float(np.mean(np.cos(n * t - x * np.sin(t))))

ZER = []
for m in range(1, 61):
    x = (m - 0.25) * math.pi
    for _ in range(40):
        x -= J(0, x) / (-J(1, x))
    ZER.append((x, J(1, x)))
def zero_far(m):
    """第 m 个零点（m>60）：McMahon 展开 + J1 渐近式，误差远小于 1e-9"""
    b = (m - 0.25) * math.pi
    x = b + 1 / (8 * b) - 31 / (384 * b ** 3)
    return x, (-1) ** (m + 1) * math.sqrt(2 / (math.pi * x)) * (1 + 3 / (128 * x * x))

def one(kind, F, avg):
    if F <= 0: return 1.0
    # 中心：F<0.01 时离表面的扩散前沿远未到中心，残差与 1 的差 < 2·erfc(5) ≈ 3e-12（高斯界，独立于 core 的 FMIN）
    if not avg and F < 0.01: return 1.0
    s = 0.0
    if kind == 'slab':
        for n in range(400):
            k = 2 * n + 1; e = k * k * math.pi ** 2 * F / 4
            if e > 700: break
            s += (8 / (k * k * math.pi ** 2) if avg else 4 / math.pi * (-1) ** n / k) * math.exp(-e)
    elif kind == 'ball':
        for n in range(1, 400):
            e = n * n * math.pi ** 2 * F
            if e > 700: break
            s += (6 / (n * n * math.pi ** 2) if avg else 2 * (-1) ** (n + 1)) * math.exp(-e)
    else:
        m = 0
        while True:
            m += 1
            l, j1 = ZER[m - 1] if m <= 60 else zero_far(m)
            e = l * l * F
            if e > 700 or m > 200000: break
            s += (4 / (l * l) if avg else 2 / (l * j1)) * math.exp(-e)
    return min(1.0, max(0.0, s))

def facs(shape, dims):
    f = []
    if shape == 'box': f = [('slab', d / 2) for d in dims if d is not None]
    elif shape == 'cyl':
        f = [('cyl', dims[0] / 2)] + ([('slab', dims[1] / 2)] if dims[1] is not None else [])
    else: f = [('ball', dims[0] / 2)]
    return f

def upt(shape, dims, X, avg=False):
    u = 1.0
    for k, a in facs(shape, dims): u *= one(k, X / (a * a), avg)
    return 1 - u

def needX(shape, dims, p):
    lo, hi = 0.0, 1.0
    while upt(shape, dims, hi) < p: hi *= 2
    for _ in range(200):
        mid = (lo + hi) / 2
        if upt(shape, dims, mid) < p: lo = mid
        else: hi = mid
    return hi

# ── 有限差分抽查：无量纲半尺寸 1，几何因子 g=0 平板、1 圆柱、2 球；求中心值 ──
def fd_center(g, F, N=400, steps=4000):
    r = np.linspace(0, 1, N + 1); h = 1.0 / N; dt = F / steps
    c = np.zeros(N + 1); c[-1] = 1.0
    A = np.zeros((N + 1, N + 1))
    for i in range(1, N):
        A[i, i - 1] = 1 / h**2 - g / (2 * r[i] * h); A[i, i] = -2 / h**2; A[i, i + 1] = 1 / h**2 + g / (2 * r[i] * h)
    A[0, 0] = -2 * (1 + g) / h**2; A[0, 1] = 2 * (1 + g) / h**2
    I = np.eye(N + 1); L = I - 0.5 * dt * A; R = I + 0.5 * dt * A
    L[-1, :] = 0; L[-1, -1] = 1; R[-1, :] = 0
    M = np.linalg.solve(L, R); b = np.linalg.solve(L, np.eye(N + 1)[:, -1])
    for _ in range(steps): c = M @ c + b
    return float(c[0])

random.seed(20261116)
fd = []
for kind, g in (('slab', 0), ('cyl', 1), ('ball', 2)):
    for F in (0.03, 0.1, 0.3, 0.8):
        fd.append({'kind': kind, 'F': F, 'fd_center': fd_center(g, F, N=200, steps=1500), 'series_center': 1 - one(kind, F, False)})

def rdim(): return round(random.choice([random.uniform(2, 30), random.uniform(10, 120), random.uniform(50, 600)]), 1)
cases = []
for i in range(320):
    shape = random.choice(['box', 'cyl', 'ball'])
    n = {'box': 3, 'cyl': 2, 'ball': 1}[shape]
    dims = [rdim() for _ in range(n)]
    p = random.choice([5, 30, 50, 63, 70, 90, 99]) / 100
    calib = random.random() < 0.6
    st = {'mode': 'calib' if calib else 'direct', 'tShape': shape, 'tA': str(dims[0]), 'tB': str(dims[1]) if n > 1 else '', 'tC': str(dims[2]) if n > 2 else '',
          'target': str(round(p * 100)), 'plan': str(round(random.uniform(0.5, 200), 2))}
    if calib:
        ls = random.choice(['box', 'cyl', 'ball']); ln = {'box': 3, 'cyl': 2, 'ball': 1}[ls]
        ld = [rdim() for _ in range(ln)]
        st.update({'lShape': ls, 'lA': str(ld[0]), 'lB': str(ld[1]) if ln > 1 else '', 'lC': str(ld[2]) if ln > 2 else '', 'lHours': str(round(random.uniform(0.5, 72), 2))})
        D = needX(ls, ld, p) / float(st['lHours'])
    else:
        st['dval'] = str(round(random.choice([random.uniform(0.05, 1), random.uniform(1, 20)]), 3)); D = float(st['dval'])
    X1 = needX(shape, dims, p); t1 = X1 / D; plan = float(st['plan'])
    cases.append({'state': st, 'D': D, 'X1': X1, 't1': t1,
                  'centerAtPlan': upt(shape, dims, D * plan), 'avgAtPlan': upt(shape, dims, D * plan, True), 'avgAtNeed': upt(shape, dims, X1, True)})
json.dump({'fd': fd, 'cases': cases}, open(__file__.replace('ref.py', 'ref.json'), 'w'), ensure_ascii=False)
print('fd', [(x['kind'], x['F'], round(x['fd_center'] - x['series_center'], 6)) for x in fd])
print('cases', len(cases))
