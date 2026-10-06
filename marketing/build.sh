#!/bin/sh
# Construit le .docx en deux passes (la 2e insère les numéros de page du sommaire).
set -e
cd "$(dirname "$0")"
T=$(mktemp -d)
node build.js
soffice --headless --convert-to pdf --outdir "$T" Cours_Marketing.docx >/dev/null 2>&1
python3 find_pages.py "$T/Cours_Marketing.pdf" toc.json "$T/pages.json"
node build.js "$T/pages.json"
soffice --headless --convert-to pdf --outdir "$T" Cours_Marketing.docx >/dev/null 2>&1
python3 find_pages.py "$T/Cours_Marketing.pdf" toc.json "$T/pages2.json"
cmp -s "$T/pages.json" "$T/pages2.json" || node build.js "$T/pages2.json"
cp "$T/Cours_Marketing.pdf" "${1:-/tmp}/apercu.pdf"
rm -rf "$T" toc.json
