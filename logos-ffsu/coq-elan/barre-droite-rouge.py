# Paint the whole right bar of the U in red (it was red at the bottom and blue at the top), on every coloured logo
# of the board. Nothing else is touched. Usage: python3 -I rouge.py board.png out.png
import sys, json
import numpy as np
from PIL import Image

SRC, DST = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
a = im.astype(int); R, G, B = a[..., 0], a[..., 1], a[..., 2]
red = (R > 140) & (G < 110) & (B < 120) & (R > G + 60)
blue = (B > 110) & (B > R + 50) & (R < 120)
rb = red | blue
REG = {'main': (190, 200, 530, 525), 'symb': (1410, 200, 1545, 340), 'icon': (1775, 228, 1846, 305),
       'tm_complet': (1395, 775, 1488, 856), 'zone': (805, 790, 888, 875), 'tm_reduc': (1568, 810, 1640, 868),
       'tm_symb': (1727, 830, 1798, 910), 'carte': (620, 1068, 718, 1156), 'phone': (1178, 1100, 1224, 1146),
       'maillot': (318, 1092, 393, 1172), 'kakemono': (1765, 1095, 1866, 1187)}
inkness = 255 - im.min(-1)
out = im.copy(); report = {}

def runs(y, x0, x1):
    """Ink runs on row y, split at valleys between touching strokes. Returns [(start, stop)] in image x."""
    v = inkness[y, x0:x1]; res = []; x = 0; n = len(v)
    while x < n:
        if v[x] <= 40: x += 1; continue
        s = x; peak = v[x]
        while x < n and v[x] > 40:
            peak = max(peak, v[x])
            if peak > 120 and x + 1 < n and v[x] < 0.6 * peak and v[x + 1] > v[x] + 8:   # valley: next stroke begins
                break
            x += 1
        res.append((x0 + s, x0 + x)); x += 1 if x < n and v[x] <= 40 else 0
        if res and res[-1][1] == x0 + x and x < n and v[x] > 40: x += 1
    return [r for r in res if r[1] > r[0]]

def paint(y, r0, r1, col, cb):
    xs = np.arange(r0, r1); orig = a[y, xs]
    own = np.where((orig[:, 0] > orig[:, 2])[:, None], col[None, :], cb[None, :])
    al = np.clip(inkness[y, xs] / (255 - own.min(1)), 0, 1)
    inner = np.nonzero(al > 0.5)[0]
    if len(inner) > 4: al[inner[0] + 1: inner[-1]] = 1.0
    out[y, xs] = 255 * (1 - al[:, None]) + col * al[:, None]

for k, (x0, y0, x1, y1) in REG.items():
    ys, xs = np.nonzero(rb[y0:y1, x0:x1])
    top, bot = y0 + ys.min(), y0 + ys.max() + 1
    lft, rgt = x0 + xs.min(), x0 + xs.max() + 1
    h = bot - top
    # transition row: first row (mid-height) where the rightmost ribbon is red
    T = None
    for y in range(int(top + 0.25 * h), int(top + 0.75 * h)):
        rr = runs(y, lft, rgt)
        if not rr: continue
        seg = a[y, rr[-1][0]:rr[-1][1]]
        if (seg[:, 0] > seg[:, 2] + 40).sum() > (seg[:, 2] > seg[:, 0] + 40).sum(): T = y; break
    if T is None: report[k] = 'no transition'; continue
    # reference red: solid pixels of the bar just below the transition; reference blue: just above
    def ref(rows, want):
        px = []
        for y in rows:
            rr = runs(y, lft, rgt)
            if not rr: continue
            seg = im[y, rr[-1][0]:rr[-1][1]]; v = inkness[y, rr[-1][0]:rr[-1][1]]
            for p in seg[v > 0.85 * v.max()]:
                if (want == 'r' and p[0] > p[2] + 40) or (want == 'b' and p[2] > p[0] + 40): px.append(p)
        return np.median(np.array(px), 0) if px else None
    cr = ref(range(T + 3, T + 3 + max(4, h // 15)), 'r'); cb = ref(range(T - 3 - max(4, h // 15), T - 3), 'b')
    if cr is None: cr = np.array([186, 34, 41.])
    if cb is None or cb.sum() < 220: cb = np.array([22, 82, 154.])
    # track the bar upwards from just below the transition, row by row, following its centre
    rr = runs(T + 3, lft, rgt)[-1]; prev = (rr[0] + rr[1]) / 2; widths = [rr[1] - rr[0]]
    rows = 0; y = T + 3
    while y > top:
        cand = runs(y, lft, rgt)
        if not cand: break
        best = min(cand, key=lambda r: abs((r[0] + r[1]) / 2 - prev))
        c = (best[0] + best[1]) / 2; w = best[1] - best[0]; wm = np.median(widths)
        if abs(c - prev) > max(2.5, 0.8 * wm) or w > 1.9 * wm + 2: break          # lost it / merged with the neck
        seg = a[y, best[0]:best[1]]
        if (seg[:, 2] > seg[:, 0] + 40).sum() == 0 and y < T - 2 and (seg[:, 0] > seg[:, 2] + 40).sum() > 0 and rows > 3 \
           and abs(y - T) > 0.4 * h: break                                          # reached something already red (the comb)
        paint(y, best[0], best[1], cr, cb)
        prev = c; widths.append(w); rows += 1; y -= 1
    report[k] = dict(T=int(T), top_painted=int(y + 1), rows=rows, red=[int(v) for v in cr])
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(DST)
json.dump(report, open('rouge_report.json', 'w'), indent=1)
for k, v in report.items(): print(k, v)
