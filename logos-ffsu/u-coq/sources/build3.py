# Builds the final files of the U-Coq family from the project modules and writes out/manifest3.json.
# Usage: python3 build3.py <texts.json>   (texts.json: list of {module, nom, titre, texte, note, couleurs, typo})
import sys, os, json, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import C, SCRATCH
from lockup import vertical, horizontal, svg

OUTDIR = os.path.join(SCRATCH, 'out')
ORDER = ['geo_bandes', 'geo_plumes', 'didone_filet', 'didone_tricolore',
         'italique_vitesse', 'italique_souligne', 'mono_trois_lignes', 'mono_ligne_continue']
texts = {t['module']: t for t in json.load(open(sys.argv[1]))}
manifest = []
for mod_name in ORDER:
    if mod_name not in texts: continue
    mod = importlib.import_module(mod_name)
    pid = 'ucoq-' + mod_name.replace('_', '-')
    t = texts[mod_name]
    e = dict(id=pid, nom=f"U-Coq · {t['nom']}", coq=True, files={}, texts=t)
    for kind in ('long', 'court', 'symbole'):
        uid = f'{pid}-{kind}-'
        if kind == 'long':
            inner, W, H = vertical(mod, uid); doc = svg(inner, W, H, title='Fédération Française du Sport Universitaire')
        elif kind == 'court':
            inner, W, H = horizontal(mod, uid); doc = svg(inner, W, H)
        else:
            doc = svg(f'<g>{mod.sym(C, uid)}</g>', 100, 100, pad=8)
        fname = f'ffsu-{pid}-{kind}.svg'
        open(os.path.join(OUTDIR, fname), 'w').write(doc)
        e['files'][kind] = dict(file=fname)
    manifest.append(e)
json.dump(manifest, open(os.path.join(OUTDIR, 'manifest3.json'), 'w'), ensure_ascii=False, indent=1)
print('built', len(manifest))
