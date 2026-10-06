// Helpers shared by the course builder: styles, inline markup, blocks, tables, images.
const fs = require('fs');
const path = require('path');
const {
  Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, ImageRun, Bookmark, LevelFormat, VerticalAlign, LineRuleType,
} = require('docx');

const C = {
  primary: '0B4F6C', accent: '1A8FB0', light: 'E6F2F7', text: '1F2D36', muted: '5B6770',
  gold: 'E0A526', goldLight: 'FFF6DB', row: 'F4F8FA', border: 'C9D9E1', white: 'FFFFFF',
};
const FONT = 'Calibri';
const PAGE_W = 11906;
const MARGIN = 1134;
const CONTENT = PAGE_W - 2 * MARGIN; // 9638 DXA
const IMG_DIR = path.join(__dirname, 'img');

// French typography: typographic apostrophe, non-breaking space before : ; ? ! » and after «.
function fr(s) {
  return s
    .replace(/'/g, '’')
    .replace(/ ([:;?!»])/g, ' $1')
    .replace(/« /g, '« ');
}

// Inline markup: **bold**, *italic*, ^{superscript}.
function runs(s, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\^\{[^}]+\})/g;
  const str = fr(s);
  let last = 0;
  let m;
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(new TextRun({ text: str.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith('^{')) out.push(new TextRun({ text: tok.slice(2, -1), ...base, superScript: true }));
    else if (tok.startsWith('**')) out.push(new TextRun({ text: tok.slice(2, -2), ...base, bold: true }));
    else out.push(new TextRun({ text: tok.slice(1, -1), ...base, italics: true }));
    last = m.index + tok.length;
  }
  if (last < str.length) out.push(new TextRun({ text: str.slice(last), ...base }));
  return out;
}

const body = [];
const toc = [];
let bookmarkCount = 0;
let listInstance = 0;

function headingPara(level, text) {
  const id = '_Toc' + (100000 + ++bookmarkCount);
  toc.push({ level, text: fr(text), id });
  return new Paragraph({
    heading: [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][level],
    pageBreakBefore: level === 1,
    children: [new Bookmark({ id, children: [new TextRun(fr(text))] })],
  });
}
const H1 = (t) => body.push(headingPara(1, t));
const H2 = (t) => body.push(headingPara(2, t));
const H3 = (t) => body.push(headingPara(3, t));

// Source line under a séance title.
const SRC = (t) => body.push(new Paragraph({
  spacing: { after: 160 },
  children: runs(t, { italics: true, size: 19, color: C.muted }),
}));

const P = (t, opts = {}) => body.push(new Paragraph({ spacing: { after: 100 }, ...opts, children: runs(t) }));

function bulletParas(items, level = 0, ref = 'bul', size) {
  const out = [];
  for (const it of items) {
    const [text, sub] = Array.isArray(it) ? it : [it, null];
    out.push(new Paragraph({
      numbering: { reference: ref, level },
      spacing: { after: 40 },
      children: runs(text, size ? { size } : {}),
    }));
    if (sub) out.push(...bulletParas(sub, level + 1, ref, size));
  }
  return out;
}
const UL = (items) => {
  body.push(...bulletParas(items));
  body.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
};

function OL(items) {
  const instance = ++listInstance;
  for (const t of items) {
    body.push(new Paragraph({
      numbering: { reference: 'num', level: 0, instance },
      spacing: { after: 40 },
      children: runs(t),
    }));
  }
  body.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
}

// Definition box: blue left border + light fill. Accepts one or several paragraphs.
function DEF(texts) {
  const list = Array.isArray(texts) ? texts : [texts];
  list.forEach((t, i) => body.push(new Paragraph({
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: C.accent, space: 8 } },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.light },
    indent: { left: 170, right: 113 },
    spacing: { before: i === 0 ? 80 : 0, after: i === list.length - 1 ? 140 : 40 },
    children: runs(t),
  })));
}

// Key idea: arrow + bold-ish emphasis.
const KEY = (t) => body.push(new Paragraph({
  spacing: { before: 60, after: 120 },
  indent: { left: 170 },
  children: [new TextRun({ text: '→ ', bold: true, color: C.accent }), ...runs(t, { color: C.primary })],
}));

const NOTE = (t) => body.push(new Paragraph({
  spacing: { after: 100 },
  children: runs(t, { italics: true, size: 18, color: C.muted }),
}));

function pngSize(file) {
  const buf = fs.readFileSync(file);
  return { buf, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function IMG(name, widthPx, caption) {
  const { buf, w, h } = pngSize(path.join(IMG_DIR, name));
  body.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    spacing: { before: 120, after: 40 },
    children: [new ImageRun({
      type: 'png', data: buf,
      transformation: { width: widthPx, height: Math.round(widthPx * h / w) },
      altText: { title: caption, description: caption, name },
    })],
  }));
  body.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: runs(caption, { italics: true, size: 17, color: C.muted }),
  }));
}

// ---- Tables ---------------------------------------------------------------
const thin = { style: BorderStyle.SINGLE, size: 4, color: C.border };
const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function widthsFrom(fracs) {
  const ws = fracs.map((f) => Math.round(f * CONTENT));
  ws[ws.length - 1] = CONTENT - ws.slice(0, -1).reduce((a, b) => a + b, 0);
  return ws;
}

function cellContent(c, base = {}) {
  if (Array.isArray(c)) return bulletParas(c, 0, 'tbul', 19);
  return String(c).split('\n').map((line) => new Paragraph({ spacing: { after: 20 }, children: runs(line, { size: 19, ...base }) }));
}

function TBL(headers, fracs, rows, { firstColBold = true, headerFill = C.primary } = {}) {
  const ws = widthsFrom(fracs);
  const trs = [];
  if (headers) {
    trs.push(new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: headers.map((h, i) => new TableCell({
        width: { size: ws[i], type: WidthType.DXA },
        borders: cellBorders, margins: cellMargins,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: headerFill },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: runs(h, { bold: true, color: C.white, size: 19 }) })],
      })),
    }));
  }
  rows.forEach((r, ri) => {
    trs.push(new TableRow({
      cantSplit: true,
      children: r.map((c, i) => new TableCell({
        width: { size: ws[i], type: WidthType.DXA },
        borders: cellBorders, margins: cellMargins,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: ri % 2 ? C.row : C.white },
        children: cellContent(c, i === 0 && firstColBold ? { bold: true, color: C.primary } : {}),
      })),
    }));
  });
  body.push(new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: ws, rows: trs }));
  body.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
}

// SWOT matrix (2x2 with row/col labels).
function SWOT(cells) {
  const ws = widthsFrom([0.14, 0.43, 0.43]);
  const hdr = (t, fill, w, color = C.white) => new TableCell({
    width: { size: w, type: WidthType.DXA }, borders: cellBorders, margins: cellMargins,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill }, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: t ? runs(t, { bold: true, color, size: 19 }) : [] })],
  });
  const box = ([title, text], fill, w) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: cellBorders, margins: { top: 100, bottom: 100, left: 120, right: 120 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: runs(title, { bold: true, color: C.primary, size: 20 }) }),
      new Paragraph({ children: runs(text, { size: 19 }) }),
    ],
  });
  const rows = [
    new TableRow({ children: [hdr('', C.white, ws[0], C.text), hdr('Positif', C.accent, ws[1]), hdr('Négatif', C.primary, ws[2])] }),
    new TableRow({ children: [hdr('Interne', C.accent, ws[0]), box(cells[0], 'E8F5E9', ws[1]), box(cells[1], 'FDECEA', ws[2])] }),
    new TableRow({ children: [hdr('Externe', C.primary, ws[0]), box(cells[2], 'E6F2F7', ws[1]), box(cells[3], 'FFF3D6', ws[2])] }),
  ];
  body.push(new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: ws, rows }));
  body.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
}

// "À retenir" call-out: single-cell table, gold left rule, heading inside (appears in the TOC).
function RETENIR(items) {
  const gold = { style: BorderStyle.SINGLE, size: 4, color: C.gold };
  body.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
  body.push(new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        width: { size: CONTENT, type: WidthType.DXA },
        borders: { top: gold, bottom: gold, right: gold, left: { style: BorderStyle.SINGLE, size: 36, color: C.gold } },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.goldLight },
        children: [headingPara(2, 'À retenir'), ...bulletParas(items)],
      })],
    })],
  }));
  body.push(new Paragraph({ spacing: { after: 0 }, children: [] }));
}

function numberingConfig() {
  const bullet = (ref, levels) => ({ reference: ref, levels });
  return {
    config: [
      bullet('bul', [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 240 } }, run: { color: C.accent, bold: true } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 240 } }, run: { color: C.accent } } },
      ]),
      bullet('tbul', [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 200, hanging: 170 } }, run: { color: C.accent } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 170 } } } },
      ]),
      { reference: 'num', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 300 } }, run: { bold: true, color: C.accent } } },
      ] },
    ],
  };
}

function stylesConfig() {
  const base = { basedOn: 'Normal', next: 'Normal' };
  return {
    default: {
      document: { run: { font: FONT, size: 21, color: C.text }, paragraph: { spacing: { after: 80, line: 264, lineRule: LineRuleType.AUTO } } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', ...base, quickFormat: true,
        run: { font: FONT, size: 36, bold: true, color: C.primary },
        paragraph: { spacing: { before: 0, after: 80 }, outlineLevel: 0, keepNext: true,
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.accent, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', ...base, quickFormat: true,
        run: { font: FONT, size: 27, bold: true, color: C.accent },
        paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', ...base, quickFormat: true,
        run: { font: FONT, size: 23, bold: true, color: C.primary },
        paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 2, keepNext: true } },
      { id: 'TOC1', name: 'toc 1', ...base, run: { bold: true, color: C.primary, size: 22 },
        paragraph: { spacing: { before: 140, after: 20 } } },
      { id: 'TOC2', name: 'toc 2', ...base, run: { size: 20 },
        paragraph: { indent: { left: 260 }, spacing: { before: 0, after: 0 } } },
      { id: 'TOC3', name: 'toc 3', ...base, run: { size: 18, color: C.muted },
        paragraph: { indent: { left: 520 }, spacing: { before: 0, after: 0 } } },
    ],
  };
}

module.exports = {
  C, FONT, PAGE_W, MARGIN, CONTENT, fr, runs, body, toc,
  H1, H2, H3, SRC, P, UL, OL, DEF, KEY, NOTE, IMG, TBL, SWOT, RETENIR,
  numberingConfig, stylesConfig,
};
