# Piste "italique-vitesse": U italique sportif (12 deg), tendu, terminal gauche taillé en biseau.
# Le bras droit monte et devient le cou d'un coq lancé en plein sprint ; trois bandes de vitesse
# bleu / blanc / rouge filent derrière la tête, le long de la nuque, coupées au même biseau que le U.
import math
from common import sample

META = dict(
    id='italique-vitesse', nom='Sprint',
    wordmark=('IV_SairaI800', 64, 1, 'n'),
    name=('IV_SairaI600', 17, 1.2, 'upper'),
    filet=True,
)

T = math.tan(math.radians(12))     # italic slant
H = 8.7                            # half stem
N = 160                            # samples per segment


def _sm(t):                        # smootherstep: C2 joins (no curvature jump at the ends)
    t = max(0.0, min(1.0, t)); return t * t * t * (t * (6 * t - 15) + 10)


def _two_stage(u, a, b, c, split=0.4):
    """a -> b over [0, split] (flat start, C2), then a straight taper b -> c, tangent-continuous at split."""
    u = max(0.0, min(1.0, u))
    m = (c - b) / (1 - split)                              # slope of the straight part
    if u >= split: return b + m * (u - split)
    t = u / split
    h4 = -4 * t ** 3 + 7 * t ** 4 - 3 * t ** 5              # quintic Hermite, end slope basis
    h5 = 10 * t ** 3 - 15 * t ** 4 + 6 * t ** 5            # quintic Hermite, end value basis
    return a + (b - a) * h5 + m * split * h4


# ---- upright skeleton (the slant is applied at the end as one shear) -------------------
XL, XR = 18.0, 67.5                # arm centrelines
YB = 64.0                          # where the bowl starts
R = 14.0                           # corner radius of the taut bowl (centreline)
K = 0.64                           # >0.55 : squarer, tauter corners
YBOT = YB + R
YN = 28.0                          # the neck starts to turn forward
HX, HY = 78.0, 13.5                # top of the head (centreline)
SEGS = [
    ('L', (XL, 16.0), (XL, YB)),
    ('C', (XL, YB), (XL, YB + K * R), (XL + R - K * R, YBOT), (XL + R, YBOT)),
    ('L', (XL + R, YBOT), (XR - R, YBOT)),
    ('C', (XR - R, YBOT), (XR - R + K * R, YBOT), (XR, YB + K * R), (XR, YB)),
    ('L', (XR, YB), (XR, YN)),
    ('C', (XR, YN), (XR, YN - 8.5), (XR + 2.5, HY), (HX, HY)),               # nape / skull
    ('C', (HX, HY), (HX + 4, HY), (HX + 8, HY + 0.8), (HX + 12, HY + 2.2)),  # beak
]
PTS = sample(SEGS, N)
TOT = PTS[-1][4]
S_NECK = PTS[5 * N][4]
S_HEAD = PTS[6 * N][4]
W_SKULL = 8.0                      # half height of the skull above the centreline


def w_in(s):                       # inner side: counter, back of the neck, skull, upper beak
    if s < S_NECK: return H
    if s < S_HEAD: return H + (W_SKULL - H) * _sm((s - S_NECK) / (S_HEAD - S_NECK))
    return _two_stage((s - S_HEAD) / (TOT - S_HEAD), W_SKULL, 3.2, 0.3)


def _edges():
    out, inn = [], []
    for x, y, tx, ty, s in PTS:
        a, b = H, w_in(s)                                  # outer side: constant (the throat is drawn below)
        out.append((x - ty * a, y + tx * a))
        inn.append((x + ty * b, y - tx * b))
    return out, inn


OUT, INN = _edges()

# Throat + lower beak: ONE cubic from the straight front of the neck to the beak tip. It leaves the neck exactly
# along its edge (tangent, near-zero curvature) and turns in a single concave sweep, so its direction changes
# monotonically: no lip, no step where the head meets the neck.
Y_THROAT = 30.0                    # where the front of the neck starts to curve into the jaw
TIP_A = math.radians(-12)          # direction of the lower beak at the tip (slightly rising)
K_THROAT = (0.92, 0.85)            # handle lengths, as fractions of the distances to the throat corner


def _throat():
    x, y, tx, ty, s = PTS[-1]
    p3 = (x - ty * 0.3, y + tx * 0.3)                      # lower side of the beak tip
    j0 = 4 * N + round((YB - Y_THROAT) / (YB - YN) * N)
    p0 = OUT[j0]
    cy = p3[1] - (p3[0] - p0[0]) * math.tan(TIP_A)         # corner of the two tangent lines (x = neck front)
    p1 = (p0[0], p0[1] - K_THROAT[0] * (p0[1] - cy))
    p2 = (p3[0] - K_THROAT[1] * (p3[0] - p0[0]), p3[1] - K_THROAT[1] * (p3[1] - cy))
    seg = sample([('C', p0, p1, p2, p3)], 2 * N)
    return j0, [(q[0], q[1]) for q in seg]


_J0, _TH = _throat()
OUT = OUT[:_J0] + _TH

# left terminal: sharp bevel, low on the outside, high on the inside
CUT_OUT, CUT_IN = 25.0, 16.0
BEVEL = (2 * H, CUT_IN - CUT_OUT)                          # direction of the left terminal's cut


def _body_pts():
    out = [p for p in OUT if not (p[0] < XL and p[1] < CUT_OUT)]
    return [(XL - H, CUT_OUT)] + out + INN[::-1]


def _idx_y(y):                     # sample index on the right arm at height y
    return 4 * N + round((YB - y) / (YB - YN) * N)


def _clip(edge, c, v):
    """Walk an edge (tail -> head) and stop where it crosses the line through c with direction v."""
    f = lambda p: v[0] * (p[1] - c[1]) - v[1] * (p[0] - c[0])
    s0 = f(edge[0]) > 0
    for k in range(1, len(edge)):
        if (f(edge[k]) > 0) != s0:
            a, b = edge[k - 1], edge[k]
            fa, fb = f(a), f(b)
            t = fa / (fa - fb)
            return edge[:k] + [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)]
    return edge


LW = 2.6                           # half width of a speed band (each band is 2*LW wide)
OVER = 0.3                         # the red band tucks under the back of the neck by this much


def _streak(i0, i1, base, width):
    """Speed band along the back of the neck, from sample i0 (tail, low) to i1 (head end), `width` wide, its inner
    edge at w_in(s) + base: parallel to the neck, it follows the nape into the head. Both ends are cut parallel
    to the left arm's bevel, so the bands share the italic cut of the U and their tails point backwards."""
    L, Rr = [], []
    for i in range(max(0, i0 - N // 2), min(i1 + N // 2, len(PTS))):
        x, y, tx, ty, s = PTS[i]
        a = w_in(s) + base
        b = a + width
        nx, ny = ty, -tx                                   # towards the back of the neck
        L.append((x + nx * a, y + ny * a))
        Rr.append((x + nx * b, y + ny * b))

    def centre(i):
        x, y, tx, ty, s = PTS[i]
        d = w_in(s) + base + width / 2
        return (x + ty * d, y - tx * d)

    def cut(e):
        e = _clip(e, centre(i1), BEVEL)                    # head end
        return _clip(e[::-1], centre(i0), BEVEL)[::-1]     # tail end
    return cut(L) + cut(Rr)[::-1]


# red fused to the back of the neck, then a white band (the page), then blue: three equal bands that read
# blue-white-red from the counter to the neck. Same head cut, staggered tails (the outer band is the shortest).
LINES = [('r', _idx_y(43), 5 * N + int(0.38 * N), -OVER, 2 * LW + OVER),
         ('b', _idx_y(37.5), 5 * N + int(0.30 * N), 4 * LW, 2 * LW)]


# comb: three pointed teeth on the skull, from the back of the head to the forehead. Each tooth has a steep
# back and a long front, so the tips lean backwards like the speed lines.
HEADPTS = sample(SEGS[5:], 400)                            # dense resampling of the nape + head
COMB_U = (0.37, 0.62)                                      # comb base, as fractions of the head samples
TEETH = [(0.08, 4.5, 0.08, 0.28), (0.45, 6.0, 0.08, 0.28), (0.76, 4.2, 0.08, 0.24)]  # pos, height, back, front
COMB_BASE = 1.3                    # fleshy base under the teeth, so the comb reads as one red crest


def _comb_h(u):
    out = COMB_BASE * _sm(u / 0.08) * _sm((1 - u) / 0.10)   # rises under the first tooth: no shoulder
    for c, h, wb, wf in TEETH:
        d = (c - u) / wb if u < c else (u - c) / wf
        if d < 1: out = max(out, h * (1 - d) ** 1.15)
    return out


def _comb_pts():
    n = len(HEADPTS) - 1
    i0, i1 = round(COMB_U[0] * n), round(COMB_U[1] * n)
    top, bot = [], []
    s0, s1 = HEADPTS[i0][4], HEADPTS[i1][4]
    for i in range(i0, i1 + 1):
        x, y, tx, ty, s = HEADPTS[i]
        u = (s - s0) / (s1 - s0)                           # arc length, not sample index
        b = w_in(S_NECK + s)
        nx, ny = ty, -tx                                   # outwards from the skull
        h = b + _comb_h(u)
        top.append((x + nx * h, y + ny * h))
        bot.append((x + nx * (b - 1.5), y + ny * (b - 1.5)))   # tucked under the blue
    return top, bot


def _comb_ring():
    top, bot = _comb_pts()
    return top + bot[::-1]


# wattle: hangs from the base of the beak, its root hidden inside the head (drawn under the body)
WATTLE = 'M76.5,20.6 C76.3,24.2 77.6,27.0 80.3,27.9 C83.2,27.3 84.8,22.8 84.5,16.6 L80.0,15.0 Z'
EYE = (HX + 1.0, HY - 2.4, 1.3)


def _d(ring_pts, corner=12.0, tol=0.008):
    """Closed dense polyline -> SVG path of cubic Beziers. Splits at real corners (turn > `corner` degrees); each
    smooth run is fitted with cubics whose handles lie along the local tangent (a third of the chord long),
    subdivided until no point is more than `tol` away from the dense outline: no facets, a compact file."""
    P = [ring_pts[0]]
    for q in ring_pts[1:]:
        if math.hypot(q[0] - P[-1][0], q[1] - P[-1][1]) > 1e-6: P.append(q)
    if math.hypot(P[0][0] - P[-1][0], P[0][1] - P[-1][1]) < 1e-6: P.pop()
    n = len(P)
    ang = lambda a, b: math.atan2(b[1] - a[1], b[0] - a[0])
    def turn(i):
        d = ang(P[i], P[(i + 1) % n]) - ang(P[i - 1], P[i])
        return abs((d + math.pi) % (2 * math.pi) - math.pi)
    corners = [i for i in range(n) if math.degrees(turn(i)) > corner]
    P = P[corners[0]:] + P[:corners[0]]                    # start on a corner
    corners = [(c - corners[0]) % n for c in corners] + [n]
    P = P + [P[0]]
    out = [f'M{P[0][0]:.2f},{P[0][1]:.2f}']

    def seg_dist(p, a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]; L = dx * dx + dy * dy
        t = 0 if L < 1e-12 else max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L))
        return math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1])

    for a, b in zip(corners[:-1], corners[1:]):
        def tan(i):
            p, q = (P[i], P[i + 1]) if i == a else (P[i - 1], P[i]) if i == b else (P[i - 1], P[i + 1])
            L = math.hypot(q[0] - p[0], q[1] - p[1]); return ((q[0] - p[0]) / L, (q[1] - p[1]) / L)

        def cubic(i, j):
            (x0, y0), (x1, y1) = P[i], P[j]
            c = math.hypot(x1 - x0, y1 - y0) / 3
            t0, t1 = tan(i), tan(j)
            return (x0, y0), (x0 + t0[0] * c, y0 + t0[1] * c), (x1 - t1[0] * c, y1 - t1[1] * c), (x1, y1)

        def fits(i, j, cb):
            for k in range(1, 24):
                t = k / 24; u = 1 - t
                q = tuple(u ** 3 * cb[0][e] + 3 * u * u * t * cb[1][e] + 3 * u * t * t * cb[2][e] + t ** 3 * cb[3][e]
                          for e in (0, 1))
                if min(seg_dist(q, P[k2], P[k2 + 1]) for k2 in range(i, j)) > tol: return False
            return True

        def emit(i, j):
            if j - i == 1:
                out.append(f'L{P[j][0]:.2f},{P[j][1]:.2f}'); return
            cb = cubic(i, j)
            if fits(i, j, cb):
                out.append('C' + ' '.join(f'{x:.2f},{y:.2f}' for x, y in cb[1:])); return
            mid = (i + j) // 2
            emit(i, mid); emit(mid, j)
        emit(a, b)
    return ''.join(out) + 'Z'


def _bbox():
    pts = OUT + INN + _comb_pts()[0]
    xs = [x - T * y for x, y in pts]; ys = [y for x, y in pts]
    return min(xs), max(xs), min(ys), max(ys)


X0, X1, Y0, Y1 = _bbox()
SC = min(92 / (X1 - X0), 94 / (Y1 - Y0))
EX = 50 - SC * (X0 + X1) / 2
EY = 50 - SC * (Y0 + Y1) / 2


def sym(c, uid):
    g = f'<g transform="matrix({SC:.5f},0,{-SC * T:.5f},{SC:.5f},{EX:.4f},{EY:.4f})">'
    st = ''.join(f'<path d="{_d(_streak(*a))}" fill="{c[k]}"/>' for k, *a in LINES)
    comb = f'<path d="{_d(_comb_ring())}" fill="{c["r"]}"/>'
    wat = f'<path d="{WATTLE}" fill="{c["r"]}"/>'
    body = f'<path d="{_d(_body_pts())}" fill="{c["b"]}"/>'
    eye = f'<circle cx="{EYE[0]}" cy="{EYE[1]}" r="{EYE[2]}" fill="{c["w"]}"/>'
    return g + st + comb + wat + body + eye + '</g>'
