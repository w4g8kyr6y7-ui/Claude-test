# Calcule le numéro de page de chaque titre à partir du PDF rendu (pour le sommaire).
import json, re, subprocess, sys
pdf, toc_file, out = sys.argv[1:4]
toc = json.load(open(toc_file))
n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
norm = lambda s: re.sub(r'\s+', ' ', s.replace('’', "'")).strip()
texts = []
for p in range(1, n + 1):
    t = subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), pdf, '-'], capture_output=True, text=True).stdout
    texts.append(norm(' '.join(l for l in t.splitlines() if '....' not in l)))
res, cur = {}, 2
for e in toc:
    h = norm(e['text'])
    for p in range(cur, n):
        if h in texts[p]:
            res[e['anchor']] = p + 1; cur = p; break
    else:
        print('INTROUVABLE', h)
json.dump(res, open(out, 'w'))
print(n, 'pages')
