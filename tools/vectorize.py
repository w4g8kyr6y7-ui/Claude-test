"""Prépare la vectorisation d'un symbole de logo.

Découpe le symbole dans l'image source, l'agrandit, ramène chaque pixel à la
palette déclarée dans logo.json puis écrit un masque noir et blanc par couleur,
prêt à être tracé par tools/trace.mjs.

Usage : python tools/vectorize.py logos/01
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SCALE = 4
SMOOTH = 7          # taille du filtre majoritaire (en pixels agrandis)
MIN_AREA = 600      # îlots plus petits supprimés (en pixels agrandis)


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def srgb_to_lab(rgb):
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805],
                  [0.2126, 0.7152, 0.0722],
                  [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16,
                     500 * (f[..., 0] - f[..., 1]),
                     200 * (f[..., 1] - f[..., 2])], axis=-1)


def main(folder):
    folder = Path(folder)
    cfg = json.loads((folder / "logo.json").read_text())
    x0, y0, x1, y1 = cfg["crop"]
    src = Image.open(folder / "source.png").convert("RGB").crop((x0, y0, x1, y1))
    big = src.resize((src.width * SCALE, src.height * SCALE), Image.LANCZOS)
    px = np.asarray(big).astype(float)

    entries = cfg["quantize"]
    keys = ["bg" if e.get("bg") else e["as"] for e in entries]
    lab_px = srgb_to_lab(px)
    lab_pal = srgb_to_lab(np.stack([hex_rgb(e["hex"]) for e in entries]))
    dist = np.stack([((lab_px - c) ** 2).sum(-1) for c in lab_pal])
    idx = dist.argmin(0)

    classes = sorted(set(keys), key=keys.index)
    cls_of_entry = np.array([classes.index(k) for k in keys])
    lab = cls_of_entry[idx]

    # Filtre majoritaire : lisse les franges d'anticrénelage.
    votes = np.stack([ndimage.uniform_filter((lab == c).astype(float), SMOOTH)
                      for c in range(len(classes))])
    lab = votes.argmax(0)

    # Supprime les îlots minuscules (bruit de compression JPEG/IA).
    for c in range(len(classes)):
        comp, n = ndimage.label(lab == c)
        if n == 0:
            continue
        sizes = np.bincount(comp.ravel())
        for i, sl in enumerate(ndimage.find_objects(comp), start=1):
            if sizes[i] >= MIN_AREA:
                continue
            sl = tuple(slice(max(s.start - 3, 0), s.stop + 3) for s in sl)
            region = comp[sl] == i
            ring = ndimage.binary_dilation(region, iterations=2) & ~region
            if ring.any():
                lab[sl][region] = np.bincount(lab[sl][ring]).argmax()

    fg = [c for c in classes if c != "bg"]
    areas = {c: int((lab == classes.index(c)).sum()) for c in fg}
    order = sorted(fg, key=lambda c: -areas[c])

    out = folder / "build"
    out.mkdir(exist_ok=True)
    layers = []
    for i, key in enumerate(order):
        # Chaque couche couvre aussi les couches posées au-dessus d'elle :
        # pas de liseré blanc entre deux couleurs adjacentes.
        mask = np.isin(lab, [classes.index(k) for k in order[i:]])
        img = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8))
        name = f"mask-{i:02d}-{key}.png"
        img.save(out / name)
        layers.append({"key": key, "mask": name, "area": areas[key]})

    preview = np.full(px.shape, 255, dtype=np.uint8)
    for e, k in reversed(list(zip(entries, keys))):
        if k != "bg":
            preview[lab == classes.index(k)] = hex_rgb(e["hex"]).astype(np.uint8)
    Image.fromarray(preview).save(out / "quantized.png")

    ys, xs = np.nonzero(lab != classes.index("bg"))
    bbox = [x0 + xs.min() / SCALE, y0 + ys.min() / SCALE,
            x0 + (xs.max() + 1) / SCALE, y0 + (ys.max() + 1) / SCALE]
    (out / "layers.json").write_text(json.dumps({
        "width": px.shape[1], "height": px.shape[0], "scale": SCALE,
        "bbox": [round(v, 2) for v in bbox],
        "layers": layers}, indent=2))
    print(folder, "→", ", ".join(f"{l['key']}({l['area']})" for l in layers))


if __name__ == "__main__":
    for f in sys.argv[1:]:
        main(f)
