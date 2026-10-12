# Piste "geo-bandes": a bold compass-drawn U split lengthwise like a jersey stripe:
# blue outer band, red inner band, one continuous white channel. The right arm rises into the neck;
# the blue band ends in a round head, the red band wraps over the back of the head and becomes the comb.
# Every edge is a line or a compass arc (plus two smooth tapers); every join is tangent.
import math

META = dict(
    id='geo-bandes', nom='Bandes',
    # GB_Jost900U = Jost 900 with F/S advances tightened (optical kerning) and a U split by a channel
    # in the same 1/5 proportion as the symbol (built by scratchpad/gb_tools/mkfont.py)
    wordmark=('GB_Jost900U', 62, 1.5, 'n'),
    name=('GB_Jost600', 16, 1.6, 'upper'),
    filet=True,
)

# ---- grid (box 0..100) ----
H = 10.0             # half stroke: stems are 20 wide
G = 2.0              # half channel: white channel 4 wide
BW = H - G           # each band is 8 wide
XL, XR = 26.0, 68.0  # stem axes
R = (XR - XL) / 2    # bowl centreline radius 21: perfect semicircle
XM = (XL + XR) / 2
YC = 65.0            # bowl centre -> outer bottom at 96
YE = 31.0            # the right arm becomes the head here
Q = (XR + H, YE)     # head centre, on the front line of the neck
RH = H - G           # head radius 8: tangent to the channel edge of the blue band
YT = YE - RH         # left stem top = top of the head: the blue U has two arms of equal height
RG = H + G           # inner edge of the red hood: the channel stays 4 wide around the head
RF = 3.5             # throat fillet radius (neck front -> head)
HOOD = 1.90          # sweep of the red hood around the head (radians, from the nape)
WEND = 5.0           # hood width at its front end (8 on the U, smooth taper)
# comb: three lobes + front cap, all compass circles
LOBES = [2.5, 2.9, 3.1]  # back to front
E = 0.5              # lobe centres sit this far beyond the hood edge
OV = 1.3             # overlap between neighbouring lobes
CAP = 3.2            # front lobe radius (tangent to the channel edge)
BEAK = (RH - 1.0, -0.32, 0.42, RH + 4.6, 0.16)   # base radius, base angles, tip radius, tip angle
WAT = (89.4, 38.6, 1.4, 88.6, 44.0, 3.0)        # wattle drop: tip circle (x, y, r) -> round end (x, y, r)
EYE = (3.4, -0.72, 1.4)                          # distance, angle, radius


def _pt(c, r, a):
    return (c[0] + r * math.cos(a), c[1] + r * math.sin(a))

def _f(p):
    return f'{p[0]:.3f},{p[1]:.3f}'

def _arc(r, p, large=0, sweep=1):
    return f' A{r:.3f},{r:.3f} 0 {large} {sweep} {_f(p)}'

def _sm(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def _hood_w(a):
    return BW + (WEND - BW) * _sm((a - math.pi) / HOOD)

def _blue():
    """U blue band + throat fillet + head, one outline."""
    xo, xi = XL - H, XL - G          # left stem: outer / channel edge
    xro, xri = XR + H, XR + G        # right stem
    ro, ri = R + H, R + G            # bowl: outer radius 31, channel edge 23
    dy = math.sqrt(RH * RH + 2 * RH * RF)
    F = (xro + RF, YE + dy)                        # fillet centre
    T = (Q[0] + (F[0] - Q[0]) * RH / (RH + RF), Q[1] + (F[1] - Q[1]) * RH / (RH + RF))
    d = f'M{_f((xo, YT))} L{_f((xo, YC))}'
    d += _arc(ro, (XM, YC + ro), 0, 0) + _arc(ro, (xro, YC), 0, 0)
    d += f' L{_f((xro, F[1]))}' + _arc(RF, T, 0, 1)
    d += _arc(RH, (Q[0] - RH, YE), 1, 0)
    d += f' L{_f((xri, YC))}' + _arc(ri, (XM, YC + ri), 0, 1) + _arc(ri, (xi, YC), 0, 1)
    d += f' L{_f((xi, YT))} Z'
    return d

def _red():
    """U red band + tapered hood around the head + round front cap, one outline."""
    xi, xo = XL + G, XL + H          # left stem: channel edge / counter edge
    xri, xro = XR - G, XR - H
    ri, ro = R - G, R - H            # bowl: 19 / 11
    a_end = math.pi + HOOD
    d = f'M{_f((xi, YT))} L{_f((xi, YC))}'
    d += _arc(ri, (XM, YC + ri), 0, 0) + _arc(ri, (xri, YC), 0, 0)
    d += f' L{_f((xri, YE))}' + _arc(RG, _pt(Q, RG, a_end), 0, 1)
    rc = WEND / 2
    M = _pt(Q, RG + rc, a_end)
    t = (-math.sin(a_end), math.cos(a_end))
    d += _arc(rc, (M[0] + rc * t[0], M[1] + rc * t[1]), 0, 0) + _arc(rc, _pt(Q, RG + WEND, a_end), 0, 0)
    n = 120
    for i in range(1, n + 1):
        a = a_end - HOOD * i / n
        d += f' L{_f(_pt(Q, RG + _hood_w(a), a))}'
    d += f' L{_f((xro, YC))}' + _arc(ro, (XM, YC + ro), 0, 1) + _arc(ro, (xo, YC), 0, 1)
    d += f' L{_f((xo, YT))} Z'
    return d

def _cap():
    """Front lobe = round end of the hood: tangent to the channel edge at the end of the hood."""
    a_end = math.pi + HOOD
    return _pt(Q, RG + CAP, a_end), CAP

def _lobes():
    """Comb lobes, placed from the front cap backwards: each circle sits E beyond the hood edge and
    overlaps its neighbour by OV, so neighbours meet in a clean V above the edge (no bare band edge)."""
    out = []
    prev_c, prev_r = _cap()
    a = math.pi + HOOD
    for rho in reversed(LOBES):
        target = prev_r + rho - OV
        lo, hi = a - 1.2, a
        for _ in range(60):
            mid = (lo + hi) / 2
            c = _pt(Q, RG + _hood_w(mid) + E, mid)
            if math.hypot(c[0] - prev_c[0], c[1] - prev_c[1]) > target: lo = mid
            else: hi = mid
        a = (lo + hi) / 2
        prev_c, prev_r = _pt(Q, RG + _hood_w(a) + E, a), rho
        out.append((prev_c, rho))
    return out[::-1]

def _pear(c1, r1, c2, r2):
    """Two compass circles joined by their outer tangents (small one on top)."""
    dx, dy = c2[0] - c1[0], c2[1] - c1[1]; d = math.hypot(dx, dy)
    phi = math.atan2(dy, dx); th = math.acos((r1 - r2) / d)
    a1, a2 = phi + th, phi - th
    return (f'M{_f(_pt(c1, r1, a1))} L{_f(_pt(c2, r2, a1))}' + _arc(r2, _pt(c2, r2, a2), 1, 0)
            + f' L{_f(_pt(c1, r1, a2))}' + _arc(r1, _pt(c1, r1, a1), 0, 0) + ' Z')

def _wattle():
    """Wattle: a compass teardrop (two circles joined by their outer tangents), its point aimed up at the
    beak it hangs from; the white channel width keeps it off the head and the beak."""
    x1, y1, r1, x2, y2, r2 = WAT
    return _pear((x1, y1), r1, (x2, y2), r2)

def comb_check():
    """Print, for each pair of neighbouring comb circles, the two intersections vs the hood edge."""
    circ = _lobes() + [_cap()]
    for (c1, r1), (c2, r2) in zip(circ, circ[1:]):
        dx, dy = c2[0] - c1[0], c2[1] - c1[1]; dd = math.hypot(dx, dy)
        a = (r1 * r1 - r2 * r2 + dd * dd) / (2 * dd); hh = math.sqrt(max(r1 * r1 - a * a, 0))
        mx, my = c1[0] + a * dx / dd, c1[1] + a * dy / dd
        print(f'd={dd:.2f} r1+r2={r1 + r2:.2f}', end='')
        for sg in (1, -1):
            px, py = mx - sg * hh * dy / dd, my + sg * hh * dx / dd
            ang = math.atan2(py - Q[1], px - Q[0]) % (2 * math.pi)
            r = math.hypot(px - Q[0], py - Q[1])
            print(f'  r={r:.2f} vs edge {RG + _hood_w(ang):.2f}', end='')
        print()
    for c, r in circ:
        print(f'  lobe ({c[0]:.2f},{c[1]:.2f}) r={r} top y={c[1] - r:.2f} ang={math.degrees(math.atan2(c[1] - Q[1], c[0] - Q[0])) % 360:.1f}')

def sym(c, uid):
    out = [f'<path d="{_blue()}" fill="{c["b"]}"/>', f'<path d="{_red()}" fill="{c["r"]}"/>']
    out += [f'<circle cx="{p[0]:.3f}" cy="{p[1]:.3f}" r="{rho}" fill="{c["r"]}"/>' for p, rho in _lobes() + [_cap()]]
    rb, ab0, ab1, rt, at = BEAK
    out.append(f'<path d="M{_f(_pt(Q, rb, ab0))} L{_f(_pt(Q, rt, at))} L{_f(_pt(Q, rb, ab1))} Z" fill="{c["b"]}"/>')
    out.append(f'<path d="{_wattle()}" fill="{c["r"]}"/>')
    e = _pt(Q, EYE[0], EYE[1])
    out.append(f'<circle cx="{e[0]:.3f}" cy="{e[1]:.3f}" r="{EYE[2]}" fill="{c["w"]}"/>')
    return ''.join(out)
