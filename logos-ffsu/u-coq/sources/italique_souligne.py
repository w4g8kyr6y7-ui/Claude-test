# Piste "italique-souligne": U italique calligraphique (plume large : pleins et déliés, attaque taillée en
# biseau creux), dont le bras droit monte et devient le cou d'un coq discret (crête à cinq dents, double
# barbillon, oeil blanc). Sous la lettre, un paraphe tricolore : un trait bleu qui suit la panse à distance
# constante, un canal blanc, un trait rouge ; tous deux montent vers la droite comme un trait de vitesse.
import math
from common import sample, ring

META = dict(
    id='italique-souligne', nom='Paraphe',
    wordmark=('IS_AlegreyaSansI800', 52, 1.8, 'n'),
    name=('IS_AlegreyaSansI700', 17, 0.9, 'upper'),
    filet=False,
)

SLANT = math.tan(math.radians(13))    # italic: one shear applied to the finished upright drawing
Y0 = 50.0
N = 90                                # samples per segment


def _sm(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)


DX, DY = -1.2, 1.0                    # final placement in the 100 x 100 box


def _shear(p):
    return (p[0] + (Y0 - p[1]) * SLANT + DX, p[1] + DY)


def _path(pts):
    return ring([_shear(p) for p in pts])


def _quad(p0, c, p1, n=12, skip_first=True):
    out = []
    for k in range(1 if skip_first else 0, n + 1):
        t = k / n; m = 1 - t
        out.append((m * m * p0[0] + 2 * m * t * c[0] + t * t * p1[0], m * m * p0[1] + 2 * m * t * c[1] + t * t * p1[1]))
    return out


# ---------------- upright skeleton: ONE centreline, left arm > bowl > right arm > neck > head > beak ----
XL, XR = 20.0, 62.0
CX, CY = (XL + XR) / 2, 50.0
R = (XR - XL) / 2
YTOP = 15.0                           # left arm: centre of the bevelled entry
YN = 24.0                             # right arm: the neck starts to turn forward
RT = 8.5                              # radius of that turn (centreline): a compact, upright head
HX, HY = XR + RT, YN - RT             # centre of the head
SEGS = [
    ('L', (XL, YTOP - 7), (XL, CY)),
    ('A', (CX, CY), R, math.pi, 0.0),
    ('L', (XR, CY), (XR, YN)),
    ('A', (XR + RT, YN), RT, math.pi, 1.5 * math.pi),
    ('C', (HX, HY), (HX + 3.0, HY), (HX + 6.0, HY + 0.6), (HX + 9.2, HY + 1.7)),
]
PTS = sample(SEGS, N)
TOT = PTS[-1][4]
S_ARM1 = PTS[3 * N][4]
S_HEAD = PTS[4 * N][4]

# broad nib held at -36 deg: strokes moving up-right are hairlines, down-strokes are full.
# The width is capped at the down-stroke value so it only ever thins from the left arm into the bowl.
NIB = math.radians(-36)
W_MIN, W_RNG = 2.1, 5.8
W_ARM = W_MIN + W_RNG * abs(math.sin(math.pi / 2 - NIB))
WI_H, WO_H = 7.1, 4.4                 # head: skull side / jaw side


def _smooth(vals, sig):
    ss = [p[4] for p in PTS]
    out = []
    for i, s in enumerate(ss):
        a = b = 0.0
        for j in range(max(0, i - 260), min(len(ss), i + 260)):
            d = ss[j] - s
            if abs(d) > 3 * sig: continue
            k = math.exp(-d * d / (2 * sig * sig))
            a += k * vals[j]; b += k
        out.append(a / b)
    return out


# (the neck turn and the head get their own widths: they count as full width here, so the right arm only ever thickens)
RAW = _smooth([W_ARM if i >= 3 * N else min(W_ARM, W_MIN + W_RNG * abs(math.sin(math.atan2(p[3], p[2]) - NIB)))
               for i, p in enumerate(PTS)], 6.0)


def _widths(i):
    """(outer, inner) half widths. Outer = outside of the U, then throat and jaw; inner = counter, nape, skull."""
    s = PTS[i][4]
    w = RAW[i] if s < S_ARM1 - 8 else W_ARM + (RAW[i] - W_ARM) * (1 - _sm((s - S_ARM1 + 8) / 8))
    if s <= S_HEAD:
        u = _sm((s - S_ARM1) / (S_HEAD - S_ARM1))
        uo = _sm((s - S_ARM1) / (0.8 * (S_HEAD - S_ARM1)))     # throat reaches the jaw width early: no chin pocket
        return w + (WO_H - w) * uo, w + (WI_H - w) * u
    v = (s - S_HEAD) / (TOT - S_HEAD)
    # forehead drops quickly, then the beak runs out to a sharp point
    # both mandibles meet at an angle (g' > 0 at the tip): a short straight point, no droop, no needle
    g = lambda t: max(0.0, min(1.0, t)) ** 2 * (2 - max(0.0, min(1.0, t)))
    wi = WI_H - (WI_H - 2.3) * _sm(v / 0.55) - (2.3 - 0.05) * g((v - 0.3) / 0.7)
    wo = WO_H + (0.05 - WO_H) * g(v)
    return wo, wi


WO = [_widths(i)[0] for i in range(len(PTS))]


def _edges():
    out, inn = [], []
    for i, (x, y, tx, ty, s) in enumerate(PTS):
        wo, wi = _widths(i)
        out.append((x - ty * wo, y + tx * wo))
        inn.append((x + ty * wi, y - tx * wi))
    # throat: the front edge of the neck runs straight up, then one round fillet carries it into the jaw.
    # (offsetting the tight turn would make the throat retreat into the neck and leave a pocket at the chin)
    xf = XR + W_ARM                           # front edge of the neck
    rf = HX - xf                              # fillet radius: it lands exactly on the jaw line at the head
    yf = HY + WO_H + rf                       # fillet centre is (HX, yf)
    throat = [(xf, YN + (yf - YN) * k / 12) for k in range(1, 13)]
    throat += [(HX - rf * math.cos(a), yf - rf * math.sin(a)) for a in
               [math.pi / 2 * k / 30 for k in range(1, 30)]]
    out = out[:3 * N + 1] + throat + out[4 * N:]
    return out, inn


def _body():
    out, inn = _edges()
    # pen entry at the top of the left arm: a short, slightly hollow cut, its sharp corner rounded off
    k = math.tan(math.radians(24))
    wo, wi = _widths(0)
    A = (XL - wo, YTOP + wo * k)              # outer (left) corner
    B = (XL + wi, YTOP - wi * k)              # inner (counter side) corner, the higher one
    L = math.hypot(B[0] - A[0], B[1] - A[1])
    nx, ny = k / math.hypot(k, 1), 1 / math.hypot(k, 1)        # into the stroke
    Q = ((A[0] + B[0]) / 2 + 1.6 * nx, (A[1] + B[1]) / 2 + 1.6 * ny)
    cut = _quad(B, Q, A, 40, skip_first=False)                 # from B down to A
    # trim the cut 1.6 units from B and 0.9 units from A, fillet each corner (control point = the corner)
    def walk(pts, d):
        acc = 0.0
        for j in range(1, len(pts)):
            acc += math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1])
            if acc >= d: return j
        return len(pts) - 1
    dB, dA = 1.6, 0.9
    jB = walk(cut, dB)
    jA = len(cut) - 1 - walk(cut[::-1], dA)
    B2, A2 = cut[jB], cut[jA]
    # tangent lines at B2 / A2 meet the straight side edges: those meeting points are the fillet controls
    tB = (cut[jB + 1][0] - cut[jB - 1][0], cut[jB + 1][1] - cut[jB - 1][1])
    cB = (B[0], B2[1] + (B[0] - B2[0]) * tB[1] / tB[0])
    tA = (cut[jA + 1][0] - cut[jA - 1][0], cut[jA + 1][1] - cut[jA - 1][1])
    cA = (A[0], A2[1] + (A[0] - A2[0]) * tA[1] / tA[0])
    B1 = (B[0], cB[1] + dB)
    A1 = (A[0], cA[1] + dA)
    out = [p for p in out if p[1] > A1[1] + 1e-6 or p[0] > XL + 1]
    inn = [p for p in inn if p[1] > B1[1] + 1e-6 or p[0] > XL + wi + 1]
    ring_ = [A1] + out + inn[::-1] + [B1]
    ring_ += _quad(B1, cB, B2, 10)
    ring_ += cut[jB + 1:jA]
    ring_ += _quad(A2, cA, A1, 8)[:-1]
    return ring_


# ---------------- tricolour paraphe ---------------------------------------------------------------
GAP = 2.9                             # constant white channel between the U and the blue stroke
A0, A1 = math.radians(166), math.radians(72)
TIP = (95.5, 51.5)


def _wo_bowl(th):
    f = N + (math.pi - th) / math.pi * N
    i = int(f); t = f - i
    return WO[i] * (1 - t) + WO[min(i + 1, len(WO) - 1)] * t


def _guide():
    """Inner edge of the blue stroke: the U's real outer contour pushed out by GAP, then a rising tail."""
    M = 140
    g = []
    for k in range(M + 1):
        th = A0 + (A1 - A0) * k / M
        rho = R + _wo_bowl(th) + GAP
        g.append((CX + rho * math.cos(th), CY + rho * math.sin(th)))
    tx, ty = g[-1][0] - g[-2][0], g[-1][1] - g[-2][1]
    L = math.hypot(tx, ty); tx, ty = tx / L, ty / L
    p0 = g[-1]
    tail = sample([('C', p0, (p0[0] + 15 * tx, p0[1] + 15 * ty), (TIP[0] - 13, TIP[1] + 8.5), TIP)], 120)
    g += [(p[0], p[1]) for p in tail[1:]]
    # tangents by central differences, then arc length
    P = []
    s = 0.0
    for j, (x, y) in enumerate(g):
        a, b = g[max(0, j - 1)], g[min(len(g) - 1, j + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        if j: s += math.hypot(x - g[j - 1][0], y - g[j - 1][1])
        P.append((x, y, dx / L, dy / L, s))
    return P


def _prof(u0, upk, u1, wmax):
    def f(u):
        if u <= u0 or u >= u1: return 0.0
        if u < upk:
            return wmax * math.sin(_sm((u - u0) / (upk - u0)) * math.pi / 2) ** 1.2   # peels off as a hairline
        return wmax * math.sin((u1 - u) / (u1 - upk) * math.pi / 2) ** 0.7          # keeps its mass, then a short point
    return f


def _paraphe(c):
    P = _guide()
    tot = P[-1][4]
    swell = _prof(0.0, 0.5, 1.0, 1.0)
    blue = _prof(0.0, 0.36, 0.90, 5.6)
    env = lambda u: blue(u) if u < 0.36 else 5.6 * (1 - 0.3 * _sm((u - 0.36) / 0.64))
    bands = [(c['b'], blue),
             (None, lambda u: env(u) - blue(u) + 3.4 + swell(u)),
             (c['r'], _prof(0.08, 0.42, 1.0, 5.8))]
    out = []
    off = [0.0] * len(P)
    for col, f in bands:
        inner, outer = [], []
        for k, (x, y, tx, ty, s) in enumerate(P):
            w = f(s / tot)
            nx, ny = -ty, tx
            inner.append((x + nx * off[k], y + ny * off[k]))
            outer.append((x + nx * (off[k] + w), y + ny * (off[k] + w)))
            off[k] += w
        if col:
            keep = [k for k in range(len(P)) if f(P[k][4] / tot) > 0 or
                    (0 < k < len(P) - 1 and (f(P[k - 1][4] / tot) > 0 or f(P[k + 1][4] / tot) > 0))]
            out.append(f'<path d="{_path([inner[k] for k in keep] + [outer[k] for k in keep[::-1]])}" fill="{col}"/>')
    return ''.join(out)


# ---------------- comb, wattle, eye ---------------------------------------------------------------
OX, OY = XR + RT, YN                  # centre of the neck turn: the comb is laid out in polar coordinates around it


def _skull():
    """Distance from (OX, OY) to the top edge of the head, as a function of the angle (deg), nape to forehead."""
    _, inn = _edges()
    tab = []
    for x, y in inn[3 * N:]:
        a = math.degrees(math.atan2(y - OY, x - OX)) % 360
        if 180 <= a <= 330: tab.append((a, math.hypot(x - OX, y - OY)))
    tab.sort()
    def r(a):
        for (a0, r0), (a1, r1) in zip(tab, tab[1:]):
            if a0 <= a <= a1: return r0 + (r1 - r0) * (a - a0) / ((a1 - a0) or 1)
        return tab[-1][1]
    return r


def _comb():
    """One red shape standing on the skull: a fleshy blade and five pointed lobes, the tallest just behind the crown."""
    rs = _skull()
    lobes = [(2.3, 4.8), (3.6, 5.2), (4.5, 5.4), (4.1, 5.2), (2.9, 4.6)]    # (height, angular half width in deg)
    a0 = 226.0
    a1 = a0 + 2 * sum(dw for h, dw in lobes)
    pts, a = [], a0
    for h, dw in lobes:
        for k in range(25):
            t = -1 + 2 * k / 24
            ang = a + dw + dw * t
            hh = h * max(0.0, 1 - abs(t) ** 1.5) ** 0.8          # slightly pointed tips, sharp valleys
            blade = 1.9 * max(0.0, math.sin(math.pi * (ang - a0) / (a1 - a0))) ** 0.5
            lean = -0.22 * hh                     # lobes lean back, like the hackles of a running bird
            th = math.radians(ang)
            r = rs(ang) + blade + hh
            x, y = OX + r * math.cos(th), OY + r * math.sin(th)
            pts.append((x - math.sin(th) * lean, y + math.cos(th) * lean))
        a += 2 * dw
    base = []
    for k in range(13):
        g = a1 + (a0 - a1) * k / 12
        r = rs(g) - 2.5
        base.append((OX + r * math.cos(math.radians(g)), OY + r * math.sin(math.radians(g))))
    return _path(pts + base)


def _drop(wx, wy, w, h):
    W = sample([('C', (wx - w, wy), (wx - 1.25 * w, wy + 0.62 * h), (wx - 0.3 * w, wy + h), (wx + 0.2 * w, wy + h)),
                ('C', (wx + 0.2 * w, wy + h), (wx + 1.0 * w, wy + h), (wx + 1.25 * w, wy + 0.5 * h), (wx + w, wy))], 30)
    return _path([(p[0], p[1]) for p in W])


def sym(c, uid):
    comb = f'<path d="{_comb()}" fill="{c["r"]}"/>'
    # wattle: two drops hanging under the jaw, the front one longer, tucked behind the head and the throat
    wattle = (f'<path d="{_drop(HX + 0.6, HY + 2.0, 2.0, 7.0)}" fill="{c["r"]}"/>'
              f'<path d="{_drop(HX + 3.0, HY + 2.2, 2.2, 8.6)}" fill="{c["r"]}"/>')
    ex, ey = _shear((HX + 0.9, HY - 1.7))
    eye = f'<circle cx="{ex:.2f}" cy="{ey:.2f}" r="1.2" fill="{c["w"]}"/>'
    body = f'<path d="{_path(_body())}" fill="{c["b"]}"/>'
    return comb + wattle + body + eye + _paraphe(c)
