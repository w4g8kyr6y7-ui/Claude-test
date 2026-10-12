# Variable-width strokes along smooth centrelines: outlines have no kinks or steps.
import math
def _cubic(p0, p1, p2, p3, t):
    mt = 1 - t
    x = mt**3*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t**3*p3[0]
    y = mt**3*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t**3*p3[1]
    dx = 3*mt*mt*(p1[0]-p0[0]) + 6*mt*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0])
    dy = 3*mt*mt*(p1[1]-p0[1]) + 6*mt*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1])
    return x, y, dx, dy

def sample(segs, n=60):
    """segs: ('L', p0, p1) | ('C', p0, p1, p2, p3) | ('A', (cx,cy), r, a0, a1). Returns [(x,y,tx,ty,s)]."""
    pts = []
    for sg in segs:
        for i in range(n + 1):
            if pts and i == 0: continue
            t = i / n
            if sg[0] == 'L':
                p0, p1 = sg[1], sg[2]
                x, y = p0[0] + (p1[0]-p0[0])*t, p0[1] + (p1[1]-p0[1])*t
                dx, dy = p1[0]-p0[0], p1[1]-p0[1]
            elif sg[0] == 'C':
                x, y, dx, dy = _cubic(*sg[1:], t)
            else:
                (cx, cy), r, a0, a1 = sg[1:]
                a = a0 + (a1 - a0)*t
                x, y = cx + r*math.cos(a), cy + r*math.sin(a)
                dx, dy = -math.sin(a)*(a1-a0), math.cos(a)*(a1-a0)
            L = math.hypot(dx, dy) or 1
            pts.append([x, y, dx/L, dy/L, 0.0])
    s = 0
    for i in range(1, len(pts)):
        s += math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]); pts[i][4] = s
    return pts

def outline(pts, wl, wr=None):
    """wl/wr(s, total): distance of the left/right edge from the centreline (normal = (-ty, tx))."""
    if wr is None: wr = wl
    tot = pts[-1][4]
    left = [(x - ty*wl(s, tot), y + tx*wl(s, tot)) for x, y, tx, ty, s in pts]
    right = [(x + ty*wr(s, tot), y - tx*wr(s, tot)) for x, y, tx, ty, s in pts]
    ring = left + right[::-1]
    return 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in ring) + ' Z'

def band(pts, d_in, width, side=1):
    """Crescent running parallel to a centreline: inner edge at constant distance d_in, width(s,tot) wide."""
    tot = pts[-1][4]
    inner, outer = [], []
    for x, y, tx, ty, s in pts:
        nx, ny = -ty*side, tx*side
        w = width(s, tot)
        inner.append((x + nx*d_in, y + ny*d_in)); outer.append((x + nx*(d_in + w), y + ny*(d_in + w)))
    ring = inner + outer[::-1]
    return 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in ring) + ' Z'

def taper(a, b, w0, w1, w2=0):
    """Width w0 up to fraction a, eases to w1 at b, then to w2 at the end (smoothstep)."""
    def f(s, tot):
        u = s / tot
        sm = lambda t: t*t*(3-2*t)
        if u <= a: return w0
        if u <= b: return w0 + (w1-w0)*sm((u-a)/(b-a))
        return w1 + (w2-w1)*sm((u-b)/(1-b))
    return f

def swell(peak_at, wmax):
    """0 at both ends, wmax at fraction peak_at, smooth."""
    def f(s, tot):
        u = s / tot
        t = u/peak_at if u < peak_at else (1-u)/(1-peak_at)
        t = max(0, min(1, t)); return wmax * math.sin(t*math.pi/2)**1.4
    return f
