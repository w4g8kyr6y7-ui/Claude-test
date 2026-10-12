# Piste "didone-tricolore": a wide Didone U where colour follows the stroke contrast.
# Thick left stem (with a bracketed hairline serif) = blue; the bowl thins to a hairline that turns red,
# rises as the thin right stroke and becomes the rooster's neck; ONE white hairline cut separates blue from red
# in the bowl (the white of the flag). The red hairline ends, like a Bodoni 'r' or 'J', on a red BALL TERMINAL:
# that ball is the rooster's head (fine beak, white eye). Each neck edge lands TANGENT on the ball through a
# concave fillet (C1, no notch, no collar). Comb (4 graduated lobes leaning back) and wattle (hanging under the
# beak) are red too, held off the head by a white hairline of constant width.
import math
from common import sample

META = dict(
    id='didone-tricolore', nom='Didone tricolore',
    wordmark=('DT_Playfair800', 58, 4, 'n'),
    name=('DT_Playfair500', 15, 2.4, 'upper'),
    filet=False,
)

# ---- grid (box 0..100) ----
HH = 2.9               # hairline half width (hairline 5.8 wide); also the constant OUTER offset of the U
STEM = 24.0            # left stem width (contrast about 1:4.1)
XL = 20.0              # left centreline (outer edge of the stem at XL - HH)
XR = 78.0              # right centreline
XC = (XL + XR) / 2     # bowl axis
YB = 62.0              # where the stems hand over to the bowl
RY = 29.0              # bowl depth (centreline) -> outer bottom at YB + RY + HH = 93.9
KB = 0.60              # bowl handle (0.552 = circle, more = squarer Didone bowl)
TOP = 30.0             # top edge of the serif
HC = (82.5, 22.0)      # head centre (ball terminal)
RB = 5.2               # ball radius
GAP = 2.0              # the white hairline of the flag (bowl cut)
GAP_H = 1.6            # white hairline between the ball and the comb / wattle
R0 = RB + GAP_H        # the comb stops on this circle
LEAN = 12.0            # lean of the neck where it meets the head (degrees from vertical)
WF, LF = 3.6, 30.0     # neck flare: half width reached at the ball, length of the swelling
PHI_O, PHI_I = 62.0, 64.0   # where each neck edge lands TANGENT on the ball (degrees from the neck axis):
                         # throat side (outer) and nape side (inner)
LJ = 4.6               # length of the concave fillet that carries each edge from the neck onto the ball
CUT_U = 0.46           # where (fraction of the bowl, from the left) blue hands over to red
J_U = 0.62             # where the drawn counter joins the hairline offset (fraction of the bowl)
Y1_DROP = 2.0          # the stem's inner edge drops this far below YB before curving
H1, H2 = 0.62, 0.55    # handles of the counter's cubic
N = 200                # samples per segment


def P(x, y): return f'{x:.2f},{y:.2f}'


def poly(pts):
    return 'M' + ' L'.join(P(x, y) for x, y in pts) + ' Z'


def smooth(t):
    """smootherstep: zero slope AND zero curvature at both ends -> no visible break where a swelling starts"""
    t = max(0.0, min(1.0, t)); return t * t * t * (t * (6 * t - 15) + 10)


def clip_half(poly_pts, p, n):
    """Sutherland-Hodgman: keep the part of the polygon where (q - p) . n >= 0."""
    f = lambda q: (q[0] - p[0]) * n[0] + (q[1] - p[1]) * n[1]
    out = []
    for i in range(len(poly_pts)):
        a, b = poly_pts[i - 1], poly_pts[i]
        fa, fb = f(a), f(b)
        if fb >= 0:
            if fa < 0:
                t = fa / (fa - fb); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            out.append(b)
        elif fa >= 0:
            t = fa / (fa - fb); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def _geometry():
    # ONE continuous centreline: stem down, Didone bowl, right stroke up, neck leaning forward, then a straight
    # run of length RB into the ball centre (so the ball part of the outline is an exact circle)
    hx, ry = XC - XL, RY
    bot = (XC, YB + RY)
    lx, ly = math.sin(math.radians(LEAN)), -math.cos(math.radians(LEAN))
    Q = (HC[0] - lx * RB, HC[1] - ly * RB)          # bottom of the ball on the neck axis
    span = YB - Q[1]
    segs = [('L', (XL, TOP + 2), (XL, YB)),
            ('C', (XL, YB), (XL, YB + KB * ry), (XC - KB * hx, bot[1]), bot),
            ('C', bot, (XC + KB * hx, bot[1]), (XR, YB + KB * ry), (XR, YB)),
            ('C', (XR, YB), (XR, YB - 0.45 * span), (Q[0] - lx * 0.40 * span, Q[1] - ly * 0.40 * span), Q),
            ('L', Q, HC)]
    pts = sample(segs, N)
    s_at = [pts[i * N][4] for i in range(len(segs) + 1)]
    s_b0, s_b1, s_end = s_at[1], s_at[3], s_at[-1]

    def neck(s, w):                         # the hairline swells gently towards the ball
        d = s_end - s
        return w + (WF - w) * smooth((RB + LF - d) / LF) if d < RB + LF else w

    def terminal(s, phi):
        """Bodoni ball terminal: the neck edge runs into the ball through a convex-monotone cubic fillet that
        lands on the circle with the circle's own slope (C1): no notch, no collar."""
        d = s_end - s
        ph = math.radians(phi)
        dt = RB * math.cos(ph)
        if d <= dt:
            return math.sqrt(max(RB * RB - d * d, 0.0))
        da = dt + LJ
        if d >= da:
            return neck(s, HH)
        sa = s_end - da
        p0, p1 = neck(sa, HH), RB * math.sin(ph)
        m0 = (neck(sa + 1e-3, HH) - neck(sa - 1e-3, HH)) / 2e-3 * LJ
        m1 = (dt / (RB * math.sin(ph))) * LJ
        t = (da - d) / LJ
        return ((2 * t ** 3 - 3 * t ** 2 + 1) * p0 + (t ** 3 - 2 * t ** 2 + t) * m0
                + (-2 * t ** 3 + 3 * t ** 2) * p1 + (t ** 3 - t ** 2) * m1)

    def w_out(s):                           # outer side: constant hairline offset -> clean outer contour
        return terminal(s, PHI_O)

    def w_in(s):                            # stem weight; the bowl's inner contour is drawn separately
        return STEM - HH if s <= s_b0 else terminal(s, PHI_I)

    left = [(x - ty * w_out(s), y + tx * w_out(s)) for x, y, tx, ty, s in pts]
    right = [(x + ty * w_in(s), y - tx * w_in(s)) for x, y, tx, ty, s in pts]
    # Didone counter: the stem's inner edge drops straight, then one cubic sweeps into the hairline offset
    s_j = s_b0 + J_U * (s_b1 - s_b0)
    ij = next(i for i, p in enumerate(pts) if p[4] >= s_j)
    J = right[ij]; tx, ty = pts[ij][2], pts[ij][3]
    xi = XL - HH + STEM
    p0 = (xi, YB + Y1_DROP)
    p1 = (xi, p0[1] + H1 * (J[1] - p0[1]))
    p2 = (J[0] - tx * H2 * (J[0] - xi), J[1] - ty * H2 * (J[0] - xi))
    cub = [q[:2] for q in sample([('C', p0, p1, p2, J)], 120)]
    i_b0 = next(i for i, p in enumerate(pts) if p[4] > s_b0)
    inner = right[:i_b0] + cub[:-1] + right[ij:]
    # both edges end exactly on the ball (at the centre's normal); close over the top with the true circle
    aL = math.atan2(left[-1][1] - HC[1], left[-1][0] - HC[0])
    top = [(HC[0] + RB * math.cos(aL - math.pi * i / 240), HC[1] + RB * math.sin(aL - math.pi * i / 240))
           for i in range(1, 240)]
    ring = left + top + inner[::-1]
    return pts, ring, left, s_b0, s_b1


def _at(pts, s):
    for p in pts:
        if p[4] >= s: return p
    return pts[-1]


def _polar_union(centre, r0, circles, a0, a1, band=None, n=1600):
    """Union of circles (and an optional base band (a_from, a_to, height) on the circle r0),
    seen from 'centre' and kept beyond radius r0: returns the outline polygon."""
    hx, hy = centre
    outer, inner = [], []
    for i in range(n + 1):
        deg = a0 + (a1 - a0) * i / n
        phi = math.radians(deg)
        ux, uy = math.cos(phi), math.sin(phi)
        ivs = []
        if band and band[0] <= deg <= band[1]:
            ivs.append((r0, r0 + band[2]))
        for cx, cy, rr in circles:
            ddx, ddy = cx - hx, cy - hy
            proj = ddx * ux + ddy * uy
            disc = rr * rr - (ddx * ddx + ddy * ddy - proj * proj)
            if disc >= 0:
                ivs.append((proj - math.sqrt(disc), proj + math.sqrt(disc)))
        if ivs:
            lo = max(r0, min(v[0] for v in ivs)); hi = max(v[1] for v in ivs)
            if hi > lo + 0.01:
                outer.append((hx + hi * ux, hy + hi * uy)); inner.append((hx + lo * ux, hy + lo * uy))
    return outer + inner[::-1]


def _finger(base, tip, n=24):
    """A lobe = swept circle from base (x, y, r) to tip (x, y, r): the convex hull of the two circles."""
    return [(base[0] + (tip[0] - base[0]) * i / n, base[1] + (tip[1] - base[1]) * i / n,
             base[2] + (tip[2] - base[2]) * i / n) for i in range(n + 1)]


def _cubic_pts(p0, p1, p2, p3, n=60):
    return [q[:2] for q in sample([('C', p0, p1, p2, p3)], n)]


def _hull2(c1, r1, c2, r2, n=90):
    """Smooth convex hull of two circles (external tangents): a capsule / drop outline."""
    th = math.atan2(c2[1] - c1[1], c2[0] - c1[0])
    al = math.acos((r1 - r2) / math.hypot(c2[0] - c1[0], c2[1] - c1[1]))
    arc = lambda c, r, a0, a1: [(c[0] + r * math.cos(a0 + (a1 - a0) * i / n), c[1] + r * math.sin(a0 + (a1 - a0) * i / n))
                                for i in range(n + 1)]
    return arc(c1, r1, th + al, th + 2 * math.pi - al) + arc(c2, r2, th - al, th + al)


def _seg_dist(p, a, b):
    vx, vy = b[0] - a[0], b[1] - a[1]
    L2 = vx * vx + vy * vy or 1e-12
    t = max(0.0, min(1.0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2))
    return math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy)


def _keep_off(blob, centre, rings, g, n=480):
    """Polar outline (seen from 'centre', inside the blob) of the blob MINUS everything closer than g to the
    given outlines: the white hairline then keeps the same width all along the throat and the gape."""
    segs = []
    for rg in rings:
        for i in range(len(rg)):
            a, b = rg[i - 1], rg[i]
            if min(math.hypot(a[0] - centre[0], a[1] - centre[1]), math.hypot(b[0] - centre[0], b[1] - centre[1])) < 14:
                segs.append((a, b))
    near = lambda q: min(_seg_dist(q, a, b) for a, b in segs) < g
    out = []
    for i in range(n):
        th = 2 * math.pi * i / n
        ux, uy = math.cos(th), math.sin(th)
        # where the ray leaves the convex blob
        r_b = 0.0
        for j in range(len(blob)):
            a, b = blob[j - 1], blob[j]
            ex, ey = b[0] - a[0], b[1] - a[1]
            den = ux * ey - uy * ex
            if abs(den) < 1e-12: continue
            wx, wy = a[0] - centre[0], a[1] - centre[1]
            r = (wx * ey - wy * ex) / den; t = (wx * uy - wy * ux) / den
            if r > 0 and -1e-9 <= t <= 1 + 1e-9: r_b = max(r_b, r)
        # first point along the ray that comes within g of the red
        r, step, r_hit = 0.0, 0.2, None
        while r < r_b:
            r = min(r + step, r_b)
            if near((centre[0] + r * ux, centre[1] + r * uy)):
                lo, hi = r - step, r
                for _ in range(22):
                    m = (lo + hi) / 2
                    (lo, hi) = (lo, m) if near((centre[0] + m * ux, centre[1] + m * uy)) else (m, hi)
                r_hit = lo; break
        rr = r_b if r_hit is None else r_hit
        out.append((centre[0] + rr * ux, centre[1] + rr * uy))
    return out


def _soften(poly_pts, step=0.32, it=4):
    """Resample a closed outline every 'step' units, then Chaikin corner cutting: the cut corners of the
    wattle get a small round (radius about 'step'), smooth curves are left as they are."""
    res = []
    for i in range(len(poly_pts)):
        a, b = poly_pts[i - 1], poly_pts[i]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        k = max(1, int(L / step))
        res += [(a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k) for j in range(k)]
    # drop points closer than step/2 to the previous kept one
    pts = [res[0]]
    for q in res[1:]:
        if math.hypot(q[0] - pts[-1][0], q[1] - pts[-1][1]) >= step * 0.5: pts.append(q)
    for _ in range(it):
        nxt = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            nxt += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = nxt
    return pts


def _polar(deg, d):
    return HC[0] + d * math.cos(math.radians(deg)), HC[1] + d * math.sin(math.radians(deg))


# comb: 4 graduated lobes, each swept from a base on the band to a rounded tip rotated backwards
# (angle of the base, base radius, angle of the tip, distance of the tip, tip radius)
COMB = [(-72, 1.25, -80, R0 + 2.3, 1.2),
        (-97, 1.45, -108, R0 + 3.2, 1.45),
        (-122, 1.55, -135, R0 + 3.4, 1.6),
        (-146, 1.45, -160, R0 + 2.6, 1.45)]
COMB_BAND = (-150, -70, 1.8)
# wattle drop: (upper centre, upper radius, lower centre, lower radius)
WAT = ((HC[0] + 6.0, HC[1] + 5.0), 1.8, (HC[0] + 6.3, HC[1] + 8.7), 2.2)


def ring_head(poly_pts):
    return [q for q in poly_pts if q[1] < HC[1] + 16]


def pieces():
    """All shapes as polygons: {name: (colour key, [points])}."""
    pts, ring, left, s_b0, s_b1 = _geometry()
    # the white cut (blue | red) on the bowl, perpendicular to the stroke; its line runs up through the counter
    s_cut = s_b0 + CUT_U * (s_b1 - s_b0)
    x, y, tx, ty, _ = _at(pts, s_cut)
    blue_u = clip_half(ring, (x - tx * GAP / 2, y - ty * GAP / 2), (-tx, -ty))
    red = clip_half(ring, (x + tx * GAP / 2, y + ty * GAP / 2), (tx, ty))

    hx, hy = HC
    # beak: upper edge leaves the ball tangentially, gently convex; lower edge = the mouth; closed through the
    # ball centre so it overlaps the red ball (no seam)
    a1, a2 = math.radians(-56), math.radians(30)
    T = _polar(9, RB + 3.2)
    t1 = (hx + RB * math.cos(a1), hy + RB * math.sin(a1))
    d1 = (-math.sin(a1), math.cos(a1))
    dT = (math.cos(math.radians(60)), math.sin(math.radians(60)))
    upper = _cubic_pts(t1, (t1[0] + d1[0] * 2.4, t1[1] + d1[1] * 2.4), (T[0] - dT[0] * 1.9, T[1] - dT[1] * 1.9), T)
    t2 = (hx + RB * math.cos(a2), hy + RB * math.sin(a2))
    beak = upper + [t2, (hx + RB * 0.3 * math.cos(a2), hy + RB * 0.3 * math.sin(a2)),
                    (hx + RB * 0.3 * math.cos(a1), hy + RB * 0.3 * math.sin(a1))]

    circles = []
    for ab, rb, at, dt, rt in COMB:
        bx, by = _polar(ab, R0 + COMB_BAND[2] * 0.5)
        tx_, ty_ = _polar(at, dt)
        circles += _finger((bx, by, rb), (tx_, ty_, rt))
    comb = _polar_union(HC, R0, circles, -178, -50, band=COMB_BAND)
    # wattle: a hanging drop = hull of two circles, held off the throat and the gape by a white hairline of
    # constant width GAP_H (the cut follows the red outline, not a circle)
    drop = _hull2(WAT[0], WAT[1], WAT[2], WAT[3])
    wattle = _soften(_keep_off(drop, (WAT[2][0], WAT[2][1] - 0.6), [ring_head(red), beak], GAP_H + 0.1))
    return dict(blue_u=('b', blue_u), red=('r', red), beak=('r', beak), comb=('r', comb), wattle=('r', wattle))


def sym(c, uid):
    pc = pieces()
    hx, hy = HC
    # serif: flat slab at the hairline's weight, lightly bracketed (Didone)
    a, b = XL - HH, XL - HH + STEM
    sl, sr, st, sh, br = a - 7.0, b + 7.0, TOP, 3.8, 2.5
    serif = (f'M{P(sl, st)} L{P(sr, st)} L{P(sr, st + sh)} L{P(b + br, st + sh)} '
             f'Q{P(b, st + sh)} {P(b, st + sh + br)} L{P(b, st + sh + br + 3)} L{P(a, st + sh + br + 3)} '
             f'L{P(a, st + sh + br)} Q{P(a, st + sh)} {P(a - br, st + sh)} L{P(sl, st + sh)} Z')
    blue = ''.join(f'<path d="{poly(v)}"/>' for k, (col, v) in pc.items() if col == 'b')
    red = ''.join(f'<path d="{poly(v)}"/>' for k, (col, v) in pc.items() if col == 'r')
    eye = f'<circle cx="{hx + 1.8:.2f}" cy="{hy - 1.3:.2f}" r="1.1" fill="{c["w"]}"/>'
    return (f'<g fill="{c["b"]}">{blue}<path d="{serif}"/></g>'
            f'<g fill="{c["r"]}">{red}</g>' + eye)
