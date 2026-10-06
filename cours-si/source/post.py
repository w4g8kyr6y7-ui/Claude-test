"""Post-process the docx-js output: inject a pre-filled, clickable Word TOC field and set French language.

Usage: python3 post.py raw.docx toc.json [pages.json] out.docx
pages.json (optional) maps bookmark id -> page number (computed from a PDF render).
"""
import json
import re
import sys
import zipfile
from xml.sax.saxutils import escape

CONTENT_W = 9638

raw, toc_path = sys.argv[1], sys.argv[2]
pages_path = sys.argv[3] if len(sys.argv) == 5 else None
out = sys.argv[-1]

entries = json.load(open(toc_path, encoding="utf-8"))
pages = json.load(open(pages_path, encoding="utf-8")) if pages_path else {}

NP = "<w:rPr><w:noProof/><w:webHidden/></w:rPr>"


def entry_xml(i, e, n):
    pg = str(pages.get(e["id"], "0"))
    ppr = (f'<w:pPr><w:pStyle w:val="TOC{e["level"]}"/>'
           f'<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="{CONTENT_W}"/></w:tabs>'
           '<w:rPr><w:noProof/></w:rPr></w:pPr>')
    begin = ""
    if i == 0:
        begin = ('<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
                 '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>'
                 '<w:r><w:fldChar w:fldCharType="separate"/></w:r>')
    link = (f'<w:hyperlink w:anchor="{e["id"]}" w:history="1">'
            f'<w:r><w:rPr><w:noProof/></w:rPr><w:t xml:space="preserve">{escape(e["text"])}</w:t></w:r>'
            f'<w:r>{NP}<w:tab/></w:r>'
            f'<w:r>{NP}<w:fldChar w:fldCharType="begin"/></w:r>'
            f'<w:r>{NP}<w:instrText xml:space="preserve"> PAGEREF {e["id"]} \\h </w:instrText></w:r>'
            f'<w:r>{NP}<w:fldChar w:fldCharType="separate"/></w:r>'
            f'<w:r>{NP}<w:t>{pg}</w:t></w:r>'
            f'<w:r>{NP}<w:fldChar w:fldCharType="end"/></w:r>'
            '</w:hyperlink>')
    end = '<w:r><w:fldChar w:fldCharType="end"/></w:r>' if i == n - 1 else ""
    return f"<w:p>{ppr}{begin}{link}{end}</w:p>"


toc_xml = "".join(entry_xml(i, e, len(entries)) for i, e in enumerate(entries))

zin = zipfile.ZipFile(raw)
zout = zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    data = zin.read(item.filename)
    if item.filename == "word/document.xml":
        xml = data.decode("utf-8")
        pat = re.compile(r"<w:p\b(?:(?!<w:p\b).)*?@@TOC@@.*?</w:p>", re.S)
        xml, n = pat.subn(lambda m: toc_xml, xml, count=1)
        assert n == 1, "TOC placeholder not found"
        # docx-js gives every bookmark w:id="1": renumber start/end pairs uniquely (bookmarks are not nested)
        counter = {"n": 0}
        def renum(m):
            if m.group(1) == "Start":
                counter["n"] += 1
            return f'<w:bookmark{m.group(1)}{m.group(2)}w:id="{counter["n"]}"'
        xml = re.sub(r'<w:bookmark(Start|End)((?:\s+w:name="[^"]*")?\s+)w:id="\d+"', renum, xml)
        # every TOC anchor must exist as a bookmark
        for e in entries:
            assert f'w:name="{e["id"]}"' in xml, e["id"]
        data = xml.encode("utf-8")
    elif item.filename == "word/styles.xml":
        xml = data.decode("utf-8")
        if "<w:lang " not in xml:
            xml = re.sub(r"(<w:rPrDefault>\s*<w:rPr>)", r'\1<w:lang w:val="fr-FR" w:eastAsia="fr-FR" w:bidi="ar-SA"/>', xml, count=1)
        data = xml.encode("utf-8")
    zout.writestr(item, data)
zout.close()
print("wrote", out, "with", len(entries), "TOC entries", "(pages filled)" if pages else "(pages = 0)")
