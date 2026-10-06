#!/usr/bin/env bash
# Full pipeline: build docx -> inject TOC -> render -> read heading pages -> inject TOC with pages -> render.
set -euo pipefail
cd "$(dirname "$0")"
SK=/root/.claude/skills/synced/a5bde216-afce-4fdf-986f-55ace705b19f_984fd961-ebc4-48fc-931f-7fe2a503efd3/docx
export NODE_PATH=/opt/node22/lib/node_modules
rm -rf out && mkdir -p out
node build.js
python3 post.py out/raw.docx out/toc.json out/pass1.docx
(cd out && timeout 180 python3 "$SK/scripts/office/soffice.py" --headless --convert-to pdf pass1.docx >/dev/null 2>&1)
python3 pages.py out/pass1.pdf out/toc.json out/pages.json
python3 post.py out/raw.docx out/toc.json out/pages.json out/final.docx
(cd out && timeout 180 python3 "$SK/scripts/office/soffice.py" --headless --convert-to pdf final.docx >/dev/null 2>&1)
python3 pages.py out/final.pdf out/toc.json out/pages2.json
cmp -s out/pages.json out/pages2.json && echo "TOC page numbers stable" || echo "WARNING: page numbers moved"
pdftoppm -jpeg -r 70 out/final.pdf out/pg
