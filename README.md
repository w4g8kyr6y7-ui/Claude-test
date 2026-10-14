# Concours logo FFSU — planches de présentation

Planches A3 paysage (PDF vectoriel + PNG 200 dpi) des propositions de logo pour la
Fédération Française du Sport Universitaire, avec les logos redessinés en SVG.

## Contenu

| Dossier | Contenu |
|---|---|
| `planches/` | Une planche par logo : `planche-XX-nom.pdf` (impression) et `.png` (écran) |
| `logos/XX/source.png` | Image d'origine |
| `logos/XX/logo.json` | Fiche du logo : nom, concept, cadrage, palette, texte |
| `logos/XX/svg/` | Fichiers vectoriels : couleur, monochrome, négatif, noir, symbole seul |
| `tools/` | Chaîne de production (vectorisation, tracé, génération des planches) |
| `assets/fonts/` | Montserrat (licence libre OFL) |

Chaque planche présente : logo principal, concept, déclinaisons (monochrome, négatif,
symbole seul, icône d'application), palette (HEX, RVB, CMJN, Pantone approchant),
typographie, zone de protection, tailles minimales et mises en situation (polo,
carte de licence, réseaux sociaux, kakémono).

> Les valeurs CMJN et Pantone sont des conversions indicatives à valider sur nuancier.

## Ajouter un logo

1. Créer `logos/06/` avec l'image `source.png` et un `logo.json` (copier celui d'un logo
   proche : `crop` = zone du symbole dans l'image, `quantize` = couleurs mesurées,
   `palette` = couleurs finales, `wordmark` = lignes de texte avec largeur et ligne de base
   relevées sur l'image).
2. Lancer la chaîne :

```sh
pip install -r requirements.txt && npm install
python tools/vectorize.py logos/06   # découpe + quantification + masques
node tools/trace.mjs logos/06        # tracé vectoriel du symbole
node tools/build.mjs logos/06        # SVG + planche PDF/PNG
```

`node tools/build.mjs` sans argument régénère toutes les planches.
