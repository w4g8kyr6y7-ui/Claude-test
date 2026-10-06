"""Read heading pages from the PDF outline (LibreOffice exports headings as bookmarks).

Usage: python3 pages.py doc.pdf toc.json pages.json
"""
import json
import sys
import unicodedata

from pypdf import PdfReader

pdf, toc_path, out = sys.argv[1:4]
entries = json.load(open(toc_path, encoding="utf-8"))
reader = PdfReader(pdf)

flat = []


def walk(items):
    for it in items:
        if isinstance(it, list):
            walk(it)
        else:
            flat.append((it.title, reader.get_destination_page_number(it) + 1))


walk(reader.outline)


def norm(s):
    s = unicodedata.normalize("NFKC", s).replace(" ", " ").replace(" ", " ")
    return " ".join(s.split())


pages = {}
j = 0
for e in entries:
    while j < len(flat) and norm(flat[j][0]) != norm(e["text"]):
        j += 1
    if j == len(flat):
        sys.exit(f"heading not found in outline: {e['text']}")
    pages[e["id"]] = flat[j][1]
    j += 1

json.dump(pages, open(out, "w"), indent=1)
print(len(pages), "pages mapped; outline entries:", len(flat), "; last page:", len(reader.pages))
