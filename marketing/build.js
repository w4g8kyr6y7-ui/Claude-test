// Génère Cours_Marketing.docx à partir de content.js.
// Usage : node build.js [pages.json]  (pages.json = numéros de page du sommaire, calculés par build.sh)
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, LevelFormat, Bookmark, InternalHyperlink,
  TabStopType, Footer, PageNumber,
} = require('docx');

const content = require('./content.js');
const pages = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2])) : {};

const C = { primary: '1F4E79', accent: '2E75B6', light: 'DEEAF6', retenir: 'FFF2CC', retenirBorder: 'BF9000', grey: '595959' };
const CONTENT_W = 9638; // A4, marges de 2 cm

function runs(text, base = {}) {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(t =>
    t.startsWith('**') ? new TextRun({ ...base, text: t.slice(2, -2), bold: true }) : new TextRun({ ...base, text: t }));
}

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };

function cellParas(text, opts = {}) {
  return String(text).split('\n').map(line => new Paragraph({ spacing: { before: 20, after: 20 }, children: runs(line, opts) }));
}

function table(headers, rows) {
  const n = headers.length;
  const w = Math.floor(CONTENT_W / n);
  const widths = Array(n).fill(w);
  const mk = (cells, head) => new TableRow({
    tableHeader: head,
    children: cells.map((c, i) => new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      shading: head ? { fill: C.light, type: ShadingType.CLEAR, color: 'auto' } : undefined,
      children: cellParas(c, head ? { bold: true, color: C.primary, size: 20 } : { size: 20 }),
    })),
  });
  return new Table({
    width: { size: w * n, type: WidthType.DXA }, columnWidths: widths,
    rows: [mk(headers, true), ...rows.map(r => mk(r, false))],
  });
}

function box(title, lines, fill, borderColor, numbered) {
  const b = { style: BorderStyle.SINGLE, size: 8, color: borderColor };
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: b, bottom: b, left: b, right: b }, width: { size: CONTENT_W, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR, color: 'auto' },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      children: [
        ...(title ? [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, bold: true, color: borderColor })] })] : []),
        ...lines.map(l => numbered
          ? new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 40 }, children: runs(l) })
          : new Paragraph({ spacing: { after: 40 }, children: runs(l) })),
      ],
    })] })],
  });
}

function image(file, cm, caption) {
  const p = path.join(__dirname, 'images', file);
  const buf = fs.readFileSync(p);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20); // PNG IHDR
  const px = Math.round(cm / 2.54 * 96);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }, keepNext: true,
      children: [new ImageRun({ type: 'png', data: buf, transformation: { width: px, height: Math.round(px * h / w) } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [new TextRun({ text: caption, italics: true, size: 18, color: C.grey })] }),
  ];
}

// ---- Corps + collecte des titres pour le sommaire
const toc = [];
const body = [];
let id = 0;
const space = () => new Paragraph({ spacing: { after: 0 }, children: [] });
for (const item of content) {
  const [kind, a, b, c] = item;
  if (kind === 'h1' || kind === 'h2' || kind === 'h3') {
    const level = { h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3 }[kind];
    const anchor = `t${++id}`;
    toc.push({ kind, text: a, anchor });
    body.push(new Paragraph({ heading: level, pageBreakBefore: kind === 'h1',
      children: [new Bookmark({ id: anchor, children: [new TextRun(a)] })] }));
  } else if (kind === 'p') body.push(new Paragraph({ children: runs(a) }));
  else if (kind === 'b') body.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: runs(a) }));
  else if (kind === 'b2') body.push(new Paragraph({ numbering: { reference: 'bullets', level: 1 }, children: runs(a) }));
  else if (kind === 'img') body.push(...image(a, b, c));
  else if (kind === 'table') { body.push(table(a, b), space()); }
  else if (kind === 'ret') { body.push(space(), box('📌 À retenir', a, C.retenir, C.retenirBorder, true), space()); }
  else if (kind === 'note') { body.push(box(null, [a], 'FBE5D6', 'C55A11', false), space()); }
  else if (kind === 'glo') body.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: a + ' : ', bold: true, color: C.primary }), ...runs(b)] }));
  else throw new Error('Type inconnu : ' + kind);
}

// ---- Page de titre + sommaire cliquable
const title = [
  new Paragraph({ spacing: { before: 3000, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Fondamentaux du marketing', bold: true, size: 56, color: C.primary })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: 'Cours de L2 Économie-Gestion', size: 28, color: C.accent })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Partie 1 : séances 1 à 5 · Partie 2 : le prix · Partie 3 : CM 6', size: 22, color: C.grey })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400 }, children: [new TextRun({ text: 'Cliquer sur un titre du sommaire renvoie à la partie correspondante.', italics: true, size: 20, color: C.grey })] }),
];
const tocParas = [
  new Paragraph({ pageBreakBefore: true, spacing: { after: 240 }, children: [new TextRun({ text: 'Sommaire', bold: true, size: 36, color: C.primary })] }),
  ...toc.map(t => {
    const ind = { h1: 0, h2: 360, h3: 720 }[t.kind];
    const style = t.kind === 'h1' ? { bold: true, color: C.primary, size: 24 } : t.kind === 'h2' ? { bold: true, size: 21 } : { size: 20, color: '404040' };
    return new Paragraph({
      indent: { left: ind }, spacing: { before: t.kind === 'h1' ? 200 : 30, after: 30 },
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: 'dot' }],
      children: [new InternalHyperlink({ anchor: t.anchor, children: [
        new TextRun({ ...style, text: t.text }), new TextRun({ ...style, bold: false, text: '\t' + (pages[t.anchor] || '00') }),
      ] })],
    });
  }),
];
fs.writeFileSync(path.join(__dirname, 'toc.json'), JSON.stringify(toc));

const doc = new Document({
  creator: 'Cours de marketing',
  title: 'Fondamentaux du marketing',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22 }, paragraph: { spacing: { after: 100, line: 276, lineRule: 'auto' } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, color: C.primary }, paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.primary, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: C.accent }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: C.primary }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: { config: [{ reference: 'bullets', levels: [
    { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 260 } } } },
    { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 260 } } } },
  ] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: C.grey })] })] }) },
    children: [...title, ...tocParas, ...body],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(__dirname, 'Cours_Marketing.docx'), buf);
  console.log('OK', toc.length, 'titres');
});
