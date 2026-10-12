# Piste "geo-plumes": U géométrique épais (fond en superellipse), le bras droit devient le cou d'un coq
# dont le camail (plumes du cou) tombe en cascade de trois plumes pointues bleu / blanc / rouge.
import math
from common import sample, ring

META = dict(
    id='geo-plumes', nom='Camail',
    wordmark=('Unbounded700', 60, 4, 'b'),
    name=('Unbounded500', 13.5, 0.4, 'upper'),
    filet=True,
)

# ---- geometry (box 0..100) -------------------------------------------------------------
XL0, XL1 = 10.0, 30.0          # left arm outer / inner
XR0, XR1 = 54.0, 74.0          # right arm inner / outer (= the neck)
TOP_L = 26.0                   # left arm top (flat cut)
CX, CY = 42.0, 60.0            # bowl centre
AO, BO, NO = 32.0, 36.0, 4.6   # outer superellipse (squarish shoulders)
AI, BI, NI = 12.0, 18.0, 3.8   # inner superellipse (counter)
HX, HY, HR = 64.0, 18.0, 10.0  # crown: round top of the neck
DX = 4.5                       # optical centring

# beak: upper edge leaves the crown tangentially at FORE (forehead), softly dips, then hooks to the tip
FORE = -147.0
BEAK = (50.0, 17.8)
THROAT = 20.6                  # lower mandible meets the neck front (x = XR0) here


def _P(seg_pts):
    return [(p[0], p[1]) for p in seg_pts]


def _u(v):
    n = math.hypot(*v)
    return (v[0] / n, v[1] / n)


def _cub(p0, d0, k0, p3, d3, k3):
    """Cubic leaving p0 along d0, arriving at p3 along d3 (handle lengths k0, k3)."""
    d0, d3 = _u(d0), _u(d3)
    return ('C', p0, (p0[0] + k0 * d0[0], p0[1] + k0 * d0[1]), (p3[0] - k3 * d3[0], p3[1] - k3 * d3[1]), p3)


def _on(r, deg):
    a = math.radians(deg)
    return (HX + r * math.cos(a), HY + r * math.sin(a))


def _tan_ccw(deg):
    """Direction of travel along the crown when the angle decreases (back -> top -> forehead)."""
    a = math.radians(deg)
    return (math.sin(a), -math.cos(a))


def _tan_cw(deg):
    a = math.radians(deg)
    return (-math.sin(a), math.cos(a))


def _se(a, b, n, t0, t1, k=200):
    out = []
    for i in range(k + 1):
        t = t0 + (t1 - t0) * i / k
        c, s = math.cos(t), math.sin(t)
        out.append((CX + a * math.copysign(abs(c) ** (2 / n), c), CY + b * math.copysign(abs(s) ** (2 / n), s)))
    return out


def _arc(cx, cy, r, a0, a1, k=60):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / k), cy + r * math.sin(a0 + (a1 - a0) * i / k)) for i in range(k + 1)]


def _low_y(x):
    """Lower mandible: straight line from the beak tip to the throat."""
    return BEAK[1] + (x - BEAK[0]) * (THROAT - BEAK[1]) / (XR0 - BEAK[0])


UPPER = dict(k0=2.2, d1=(-0.82, 0.57), k1=2.4)


def _beak_upper():
    p0 = _on(HR, FORE)
    return _P(sample([_cub(p0, _tan_ccw(FORE), UPPER['k0'], BEAK, UPPER['d1'], UPPER['k1'])], 80))


def _body():
    pts = [(XL0, TOP_L), (XL0, CY)]
    pts += _se(AO, BO, NO, math.pi, 0)[1:]                     # outer bowl, left -> bottom -> right
    pts += [(XR1, HY)]
    pts += _arc(HX, HY, HR, 0, math.radians(FORE), 90)[1:]     # crown, over the top to the forehead
    pts += _beak_upper()[1:]
    pts += [(XR0, THROAT), (XR0, CY)]                          # lower mandible, throat, neck front
    pts += _se(AI, BI, NI, 0, math.pi)[1:]                     # counter, right -> bottom -> left
    pts += [(XL1, TOP_L)]
    return ring(pts)


# ---- hackles: three pointed feathers stepping down the back of the neck ----------------------
# Red (back) hangs behind the neck; white lies ON the neck, its tip over the red; blue (front)
# grows out of the crown and covers the root of the white.  Each leaf: outer edge S -> M (vertical
# tangent, widest) -> tip T, inner edge E -> T, closed by `hid` (points hidden under the layer above).
def _leaf(S, dS, kS, M, kM1, kM2, T, dT, kT, E, dE, kE, dTi, kTi, hid):
    outer = _P(sample([_cub(S, dS, kS, M, (0, 1), kM1), _cub(M, (0, 1), kM2, T, dT, kT)], 60))
    inner = _P(sample([_cub(E, dE, kE, T, dTi, kTi)], 60))
    return outer + inner[::-1][1:] + list(hid)


_AB = -40.0                    # blue leaves the crown tangentially here: the head outline flows on
FB = dict(S=_on(HR, _AB), dS=_tan_cw(_AB), kS=5.0, M=(79.0, 25.5), kM1=4.0, kM2=4.0,
          T=(80.2, 35.0), dT=(0.25, 0.97), kT=2.5,
          E=(65.5, 19.0), dE=(0.7, 0.71), kE=6.0, dTi=(0.8, 0.6), kTi=3.0,
          hid=((66.0, 16.0), (70.0, 12.5)))
FW = dict(S=(75.0, 22.0), dS=(0.45, 0.89), kS=5.0, M=(83.9, 36.0), kM1=6.0, kM2=4.0,
          T=(85.0, 46.5), dT=(0.25, 0.97), kT=3.0,
          E=(70.8, 21.0), dE=(0, 1), kE=13.0, dTi=(0.9, 0.44), kTi=5.0,
          hid=())
FR = dict(S=(76.5, 21.0), dS=(0.6, 0.8), kS=5.5, M=(88.0, 43.0), kM1=8.0, kM2=4.5,
          T=(89.2, 56.0), dT=(0.25, 0.97), kT=3.0,
          E=(XR1, 46.0), dE=(0.05, 1), kE=5.5, dTi=(0.85, 0.53), kTi=3.0,
          hid=((XR1 - 5, 46.0), (XR1 - 5, 21.5)))


def _feathers():
    return ring(_leaf(**FR)), ring(_leaf(**FW)), ring(_leaf(**FB))


# ---- comb: four rounded teeth radiating from inside the crown, distinct down to the crown ----
TEETH = ((-128, 13.8, 2.6, 1.2), (-104, 15.6, 2.9, 1.4), (-80, 15.2, 2.9, 1.35), (-57, 13.6, 2.5, 1.15))
# angle (deg), tip radius from the crown centre, half-width at the root, radius of the rounded tip


def _tooth(a, rt, hb, ht, root=8.0):
    """External tangents between a root circle (hidden in the crown) and the rounded tip."""
    th = math.radians(a)
    L = (rt - ht) - root
    beta = math.asin((hb - ht) / L)
    c1, c2 = _on(root, a), _on(rt - ht, a)
    phi = math.pi / 2 - beta
    p_l = (c1[0] + hb * math.cos(th - phi), c1[1] + hb * math.sin(th - phi))
    p_r = (c1[0] + hb * math.cos(th + phi), c1[1] + hb * math.sin(th + phi))
    return ring([p_l] + _arc(c2[0], c2[1], ht, th - phi, th + phi, 40) + [p_r])


# ---- wattle: a red drop hanging from under the beak; top and right side hidden behind the body --
WAT = dict(dxa=1.0, bulge=(49.9, 26.2), bottom=(52.2, 30.0), back=6.4)


def _wattle():
    xa = BEAK[0] + WAT['dxa']
    a = (xa, _low_y(xa))
    (lx, ly), (bx, by), ky = WAT['bulge'], WAT['bottom'], THROAT + WAT['back']
    free = _P(sample([_cub(a, (-0.12, 1), 2.0, (lx, ly), (0, 1), 1.6),
                      _cub((lx, ly), (0, 1), 2.0, (bx, by), (1, 0), 1.4),
                      _cub((bx, by), (1, 0), 1.4, (XR0 + 0.8, ky - 1.5), (0.4, -1), 1.6)], 30))
    hidden = [(XR0 + 3, ky - 4), (XR0 + 3, _low_y(XR0) - 2), (xa + 0.5, _low_y(xa) - 1.2)]
    return ring(free + hidden)


EYE = (59.6, 14.6)


def sym(c, uid):
    comb = ''.join(f'<path d="{_tooth(*t)}"/>' for t in TEETH)
    red, white, blue = _feathers()
    ex, ey = EYE
    return (f'<g transform="translate({DX},0)">'
            f'<g fill="{c["r"]}">{comb}</g>'
            f'<path d="{red}" fill="{c["r"]}"/>'
            f'<path d="{_wattle()}" fill="{c["r"]}"/>'
            f'<path d="{_body()}" fill="{c["b"]}"/>'
            f'<path d="{white}" fill="{c["w"]}"/><path d="{blue}" fill="{c["b"]}"/>'
            f'<circle cx="{ex:.2f}" cy="{ey:.2f}" r="2.2" fill="{c["w"]}"/>'
            f'<circle cx="{ex - 0.55:.2f}" cy="{ey + 0.15:.2f}" r="1.05" fill="{c["b"]}"/></g>')
