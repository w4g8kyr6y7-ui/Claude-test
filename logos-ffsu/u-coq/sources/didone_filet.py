# Piste "didone-filet": a Didone U (Bodoni spirit). Thick left stem with bracket flares under a flat red serif,
# a bowl that thins from thick to hairline, and a hairline right stroke that rises straight into the neck,
# ending in a Didone "ball terminal" = the rooster's head lifted 9 deg (fine beak, red blade comb, red wattle, white eye).
# Tricolour: the Didone serif is itself a red filet, cut from the blue stem by a white channel (red / white / blue),
# it rhymes with the red comb + wattle at the same height; white eye/counter; tricolour filet under the name.
import math

META = dict(
    id='didone-filet', nom='Filet Didone',
    wordmark=('DF_BodoniModa18_700', 50, 9, 'b'),
    name=('DF_BodoniModa11_500', 15, 2.4, 'upper'),
    filet=True,
)

# ---- grid (box 0..100) ----
XL, SW = 29.0, 8.6          # left stem axis, half width (stem 17.2 wide)
XR, HL = 72.0, 2.2          # right hairline axis, half width (hairline 4.4 wide)
TOP = 13.4                  # flat top of the stem, 1.0 under the red serif (white channel)
SERIF = (9.8, 12.4, 7.0)    # red serif bar: top, bottom, overhang beyond the stem
FLARE = (2.2, 4.2)          # the stem widens by 2.2 each side, concave bracket curves over 4.2
YJ = 46.0                   # where the drawn U hands over to the neck + head outline
RH = 5.8                    # head radius
HC = (XR - HL + RH, 17.5)   # head centre: its back sits exactly on the hairline (nape = straight line)
DX, DY = 2.5, 3.0           # optical centring: the heavy stem sits left, the head balances right
COMB = dict(a0=-48.0, a1=-130.0, base=1.9, amps=(2.4, 3.3, 3.2, 1.7), p=1.45, lean=7.0)
# comb = one fleshy blade (solid base 1.9 above the skull) with four crisp points leaning back
TILT = -9.0                 # head features lifted about the head centre (proud, looking up)
SCALE = (1.1, 51.6, 49.5)   # global scale about the ink centre
THROAT_A = 60.0             # where the throat meets the head circle (deg, screen coords)
THROAT_Y = 36.0             # where the throat starts to flare
THROAT_K = (6.0, 4.0)       # handle lengths of the throat curve
BEAK = (-26.0, 16.0, 18.0, 3.0)   # upper base angle, tip angle, mouth angle, length beyond the head
BH = (1.0, 0.8, 1.2)          # beak upper-edge handles (forehead dip, then a slight downward hook)


def P(x, y): return f'{x:.2f},{y:.2f}'


def _cubic_pts(p0, p1, p2, p3, n=90):
    out = []
    for k in range(1, n + 1):
        t = k / n; m = 1 - t
        out.append((m**3*p0[0] + 3*m*m*t*p1[0] + 3*m*t*t*p2[0] + t**3*p3[0],
                    m**3*p0[1] + 3*m*m*t*p1[1] + 3*m*t*t*p2[1] + t**3*p3[1]))
    return out


def _neck_head():
    """Right hairline rising straight into the head: the nape is the hairline itself (no step), the
    throat flares out in one concave curve that meets the head circle tangentially (Didone ball terminal)."""
    cx, cy = HC
    xo = XR + HL
    a = math.radians(THROAT_A)
    J = (cx + RH * math.cos(a), cy + RH * math.sin(a))
    tj = (math.sin(a), -math.cos(a))                     # circle tangent at J, running towards the front
    throat = _cubic_pts((xo, THROAT_Y), (xo, THROAT_Y - THROAT_K[0]),
                        (J[0] - tj[0] * THROAT_K[1], J[1] - tj[1] * THROAT_K[1]), J)
    # head circle from J over the front and the top down to the nape point (leftmost, tangent vertical)
    a_end = -math.pi
    n = 120
    arc = [(cx + RH * math.cos(a + (a_end - a) * k / n), cy + RH * math.sin(a + (a_end - a) * k / n))
           for k in range(1, n + 1)]
    return [(xo, THROAT_Y)] + throat + arc


def _ring(pts): return ' L'.join(P(x, y) for x, y in pts)


def sym(c, uid):
    xo, xi = XR + HL, XR - HL
    a, b = XL - SW, XL + SW
    fl, fh = FLARE
    body = (f'M{P(a - fl, TOP)} Q{P(a, TOP)} {P(a, TOP + fh)} L{P(a, 54)} C{P(a, 76)} {P(31.5, 88)} {P(48.5, 88)} '
            f'C{P(62.5, 88)} {P(xo, 79)} {P(xo, 63)} L{P(xo, YJ)} '
            f'L{_ring(_neck_head())} L{P(xi, YJ)} '
            f'L{P(xi, 63)} C{P(xi, 76)} {P(61.5, 83.7)} {P(51.5, 83.7)} '
            f'C{P(43.5, 83.7)} {P(b, 79)} {P(b, 66)} L{P(b, TOP + fh)} Q{P(b, TOP)} {P(b + fl, TOP)} Z')
    # the Didone serif as a red filet: a flat bar, separated from the stem by a white channel
    s0, s1, e = SERIF
    serif = f'<rect x="{a - e:.2f}" y="{s0}" width="{b - a + 2 * e:.2f}" height="{s1 - s0:.2f}" fill="{c["r"]}"/>'
    cx, cy = HC
    pol = lambda r, deg: (cx + r * math.cos(math.radians(deg)), cy + r * math.sin(math.radians(deg)))
    # beak: upper edge leaves the head tangentially (forehead line), slight hook, lower edge meets at the mouth
    BU, BT, BM, BL = BEAK
    ub = pol(RH, BU); tip = pol(RH + BL, BT); mb = pol(RH, BM)
    tdir = (-math.sin(math.radians(BU)), math.cos(math.radians(BU)))     # circle tangent at ub (clockwise)
    beak = (f'M{P(*pol(RH - 2, BU))} L{P(*ub)} C{P(ub[0] + tdir[0] * BH[0], ub[1] + tdir[1] * BH[0])} '
            f'{P(tip[0] - BH[1], tip[1] - BH[2])} {P(*tip)} C{P(tip[0] - 1.5, tip[1] - 0.1)} '
            f'{P(mb[0] + 1.0, mb[1] - 0.2)} {P(*mb)} L{P(*pol(RH - 2, BM))} Z')
    # comb: one blade grown from the skull, points crisp (fleshy convex flanks), notches well above the skull
    a0c, a1c, base, amps, pw, lean = (COMB[k] for k in ('a0', 'a1', 'base', 'amps', 'p', 'lean'))
    sm = lambda t: (lambda t: t * t * (3 - 2 * t))(max(0.0, min(1.0, t)))
    nt, N, cp = len(amps), 480, []
    for i in range(N + 1):
        u = i / N
        f = u * nt; k = min(int(f), nt - 1); g = 1 - abs(2 * (f - k) - 1) ** pw
        r = RH + base * sm(u / 0.14) * sm((1 - u) / 0.22) + amps[k] * g
        cp.append(pol(r, a0c + (a1c - a0c) * u - lean * g))
    inner = [pol(RH - 1.8, a1c + (a0c - a1c) * j / 20) for j in range(21)]
    d = 'M' + ' L'.join(P(*q_) for q_ in cp + inner) + ' Z'
    comb = f'<path d="{d}" fill="{c["r"]}"/>'
    # wattle: a rounded lobe hanging under the beak, its top tucked under the head and beak
    q = lambda dx, dy: P(cx + dx, cy + dy)
    wattle = (f'<path d="M{q(2.6, 2.6)} C{q(2.2, 6.4)} {q(3.0, 9.3)} {q(4.3, 9.3)} '
              f'C{q(5.7, 9.3)} {q(6.3, 6.4)} {q(5.1, 1.2)} Z" fill="{c["r"]}"/>')
    eye = f'<circle cx="{cx + 1.6:.2f}" cy="{cy - 1.4:.2f}" r="1.15" fill="{c["w"]}"/>'
    k, ox, oy = SCALE
    rot = f'rotate({TILT} {cx:.2f} {cy:.2f})'
    return (f'<g transform="translate({ox} {oy}) scale({k}) translate({-ox} {-oy}) translate({DX} {DY})">'
            f'<g transform="{rot}">' + comb + wattle + '</g>' + f'<path d="{body}" fill="{c["b"]}"/>' +
            f'<g transform="{rot}"><path d="{beak}" fill="{c["b"]}"/>' + eye + '</g>' + serif + '</g>')
