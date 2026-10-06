# Sources du cours de SI

`make.sh` régénère `out/final.docx` : `build.js` (contenu) + `lib.js` (mise en page) → `post.py` (sommaire Word cliquable, langue fr-FR) → rendu PDF LibreOffice → `pages.py` (numéros de page du sommaire).

Pour ajouter une séance : ajouter un bloc `H1('Séance N – …')` dans `build.js` avant la section « Assemble », puis relancer `make.sh`. Les schémas générés viennent de `gen/*.html` (`node gen/render.js <nom>`).
