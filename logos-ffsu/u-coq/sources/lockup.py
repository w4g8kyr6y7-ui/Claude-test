# Lockups built from a project module: META + sym(c, uid) drawn in a 100 x 100 box.
from common import C, text_path, cap_height

def _filet(x0, y, w, c, h=5):
    third = w / 3
    return (f'<rect x="{x0:.2f}" y="{y:.2f}" width="{third:.2f}" height="{h}" fill="{c["b"]}"/>'
            f'<rect x="{x0+third:.2f}" y="{y:.2f}" width="{third:.2f}" height="{h}" fill="{c["p"]}"/>'
            f'<rect x="{x0+2*third:.2f}" y="{y:.2f}" width="{third:.2f}" height="{h}" fill="{c["r"]}"/>')

def _text(font, txt, size, tr, y_base):
    d, w = text_path(font, txt, 0, y_base, size, tr)
    return d, w

def vertical(mod, uid, c=C):
    """Symbol on top, FFSU below, full name in two lines, optional tricolour filet. Returns (svg_inner, W, H)."""
    M = mod.META
    SYM = 150
    wf, wsize, wtr, wcol = M['wordmark']          # font, size, tracking, colour key
    nf, nsize, ntr, ncase = M['name']             # font, size, tracking, 'upper' | 'mixed'
    l1, l2 = ('FÉDÉRATION FRANÇAISE', 'DU SPORT UNIVERSITAIRE') if ncase == 'upper' else \
             ('Fédération Française', 'du Sport Universitaire')
    y = SYM + 30 + cap_height(wf) * wsize
    dW, wW = _text(wf, 'FFSU', wsize, wtr, y)
    y1 = y + 26 + cap_height(nf) * nsize
    d1, w1 = _text(nf, l1, nsize, ntr, y1)
    y2 = y1 + nsize * 0.5 + cap_height(nf) * nsize
    d2, w2 = _text(nf, l2, nsize, ntr, y2)
    W = max(SYM, wW, w1, w2) + 40
    parts = [f'<g transform="translate({(W-SYM)/2:.2f},0) scale(1.5)">{mod.sym(c, uid)}</g>',
             f'<path transform="translate({(W-wW)/2:.2f},0)" d="{dW}" fill="{c[wcol]}"/>',
             f'<path transform="translate({(W-w1)/2:.2f},0)" d="{d1}" fill="{c["n"]}"/>',
             f'<path transform="translate({(W-w2)/2:.2f},0)" d="{d2}" fill="{c["n"]}"/>']
    H = y2 + 16
    if M.get('filet'):
        fw = min(w2, 220)
        parts.append(_filet((W - fw) / 2, y2 + 20, fw, c))
        H = y2 + 20 + 5 + 14
    return ''.join(parts), W, H

def horizontal(mod, uid, c=C):
    """Symbol left, FFSU right. Returns (svg_inner, W, H)."""
    M = mod.META
    wf, wsize, wtr, wcol = M['wordmark']
    ch = cap_height(wf) * wsize
    y = 50 + ch / 2
    d, w = _text(wf, 'FFSU', wsize, wtr, y)
    inner = (f'<g>{mod.sym(c, uid)}</g>'
             f'<path transform="translate(118,0)" d="{d}" fill="{c[wcol]}"/>')
    return inner, 118 + w + 4, 100

def svg(inner, W, H, pad=12, title='FFSU'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {W+2*pad:.1f} {H+2*pad:.1f}" '
            f'width="{W+2*pad:.0f}" height="{H+2*pad:.0f}" role="img" aria-label="{title}"><title>{title}</title>{inner}</svg>')
