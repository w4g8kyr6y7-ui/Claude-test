import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import os
FONT_DIR = os.path.join(os.path.dirname(__file__), '..', 'fonts')
_cache = {}
def _load(name):
    if name not in _cache:
        p = os.path.join(FONT_DIR, name + '.ttf')
        blob = hb.Blob.from_file_path(p)
        face = hb.Face(blob)
        _cache[name] = (TTFont(p), hb.Font(face), face.upem)
    return _cache[name]

def measure(name, text, size, tracking=0.0):
    tt, f, upem = _load(name)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(f, buf, {"kern": True, "liga": False})
    s = size / upem
    w = sum(p.x_advance * s for p in buf.glyph_positions) + tracking * (len(buf.glyph_positions) - 1)
    return w

def text_path(name, text, x, y, size, tracking=0.0):
    """Return (svg path d, width). y is the baseline."""
    tt, f, upem = _load(name)
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(f, buf, {"kern": True, "liga": False})
    s = size / upem
    cx = x; ds = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        g = order[info.codepoint]
        pen = SVGPathPen(gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, cx + pos.x_offset * s, y - pos.y_offset * s)))
        d = pen.getCommands()
        if d: ds.append(d)
        cx += pos.x_advance * s + tracking
    return ''.join(ds), cx - tracking - x

def cap_height(name):
    tt, f, upem = _load(name)
    os2 = tt['OS/2']
    ch = getattr(os2, 'sCapHeight', 0) or int(upem * 0.7)
    return ch / upem
