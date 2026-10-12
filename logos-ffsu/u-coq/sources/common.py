# Shared workshop for the "U-Coq" family (pistes 17-24).
import os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.dirname(HERE)
SCRATCH = os.path.dirname(GEN)
sys.path.insert(0, GEN)
from textpath import text_path, cap_height, measure          # noqa: E402
from stroke import sample, outline, band, taper, swell       # noqa: E402

# Palette: bleu France soutenu, rouge, blanc, encre (texte), gris pâle (le "blanc" visible sur fond blanc)
C = dict(b='#1A3DA8', r='#E3242B', w='#FFFFFF', n='#0E1B45', p='#DCE2EC')
FONTS = os.path.join(SCRATCH, 'fonts')
OUT = os.path.join(SCRATCH, 'out', 'ucoq')
os.makedirs(OUT, exist_ok=True)

def ring(pts):
    return 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in pts) + ' Z'
