// Build SecureInbox licenta .docx from chapter Markdown, formatted to UPT spec.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType, ShadingType,
  TableOfContents, Header, Footer, PageNumber, PageBreak,
} = require('docx');

const THESIS_DIR = path.resolve(__dirname, '..');
const CM = 566.93; // DXA per cm
const CONTENT_WIDTH = Math.round(11906 - 2 * 2 * CM); // A4 width - 2cm L - 2cm R

// ── inline parser: **bold**, `code`, *italic* ───────────────────────────────
function parseInline(text, base = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0, m;
  const push = (t, extra) => { if (t) runs.push(new TextRun({ text: t, font: base.font, size: base.size, ...extra })); };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index), {});
    const tok = m[0];
    if (tok.startsWith('**')) push(tok.slice(2, -2), { bold: true });
    else if (tok.startsWith('`')) runs.push(new TextRun({ text: tok.slice(1, -1), font: 'Consolas', size: base.size ? base.size - 2 : 20 }));
    else push(tok.slice(1, -1), { italics: true });
    last = re.lastIndex;
  }
  push(text.slice(last), {});
  return runs.length ? runs : [new TextRun({ text: '', size: base.size })];
}

const bodyPara = (text) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 276, lineRule: 'auto', after: 120 },
  indent: { firstLine: Math.round(1.5 * CM) },
  children: parseInline(text),
});

const noteBorder = { style: BorderStyle.SINGLE, size: 12, color: 'B0A000', space: 6 };
const notePara = (lines) => new Paragraph({
  spacing: { line: 276, lineRule: 'auto', before: 80, after: 120 },
  shading: { fill: 'FFF8E1', type: ShadingType.CLEAR },
  border: { left: noteBorder },
  indent: { left: 200 },
  children: lines.flatMap((l, i) => {
    const r = parseInline(l, { size: 20 }).map(run => run);
    return i === 0 ? r : [new TextRun({ break: 1 }), ...parseInline(l, { size: 20 })];
  }).map(r => r),
});

const codePara = (lines) => new Paragraph({
  spacing: { line: 240, lineRule: 'auto', before: 80, after: 120 },
  shading: { fill: 'F4F4F4', type: ShadingType.CLEAR },
  border: {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 6 },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 6 },
  },
  children: lines.flatMap((l, i) => {
    const run = new TextRun({ text: l.length ? l : ' ', font: 'Consolas', size: 18 });
    return i === 0 ? [run] : [new TextRun({ break: 1, font: 'Consolas', size: 18, text: l.length ? l : ' ' })];
  }),
});

function buildTable(rows) {
  const cols = rows[0].length;
  const w = Math.floor(CONTENT_WIDTH / cols);
  const widths = Array(cols).fill(w);
  widths[cols - 1] = CONTENT_WIDTH - w * (cols - 1);
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((cells, r) => new TableRow({
      tableHeader: r === 0,
      children: cells.map((c, ci) => new TableCell({
        borders,
        width: { size: widths[ci], type: WidthType.DXA },
        shading: r === 0 ? { fill: 'E3EEF7', type: ShadingType.CLEAR } : undefined,
        margins: { top: 60, bottom: 60, left: 110, right: 110 },
        children: [new Paragraph({ spacing: { after: 0 }, children: parseInline(c, { size: 21 }).map(run => { run.root && (run.root); return run; }) , })],
      })),
    })),
  });
}

// ── markdown → docx blocks ──────────────────────────────────────────────────
function convert(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  const flushTableBuf = (buf) => {
    const rows = buf.map(r => r.replace(/^\||\|$/g, '').split('|').map(s => s.trim()));
    const filtered = rows.filter(r => !r.every(c => /^:?-+:?$/.test(c) || c === ''));
    if (filtered.length) out.push(buildTable(filtered));
    out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
  };
  while (i < lines.length) {
    let line = lines[i];
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(codePara(buf));
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { buf.push(lines[i].trim()); i++; }
      flushTableBuf(buf);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(notePara(buf.filter(l => l.trim().length)));
      continue;
    }
    let m;
    if ((m = line.match(/^#\s+(.*)/))) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: parseInline(m[1]) }));
      i++; continue;
    }
    if ((m = line.match(/^##\s+(.*)/))) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: parseInline(m[1]) }));
      i++; continue;
    }
    if ((m = line.match(/^###\s+(.*)/))) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: parseInline(m[1]) }));
      i++; continue;
    }
    if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
      out.push(new Paragraph({ numbering: undefined, bullet: { level: 0 }, spacing: { line: 276, lineRule: 'auto', after: 60 }, children: parseInline(m[1]) }));
      i++; continue;
    }
    if ((m = line.match(/^\s*\d+\.\s+(.*)/))) {
      out.push(new Paragraph({ numbering: { reference: 'nums', level: 0 }, spacing: { line: 276, lineRule: 'auto', after: 60 }, children: parseInline(m[1]) }));
      i++; continue;
    }
    if (line.trim() === '') { i++; continue; }
    // gather a paragraph (until blank or block start)
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^(#|>|```|\s*\||\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    out.push(bodyPara(para.join(' ')));
  }
  return out;
}

// ── front matter ────────────────────────────────────────────────────────────
const center = (children, extra = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, ...extra, children });
const t = (text, opts = {}) => new TextRun({ text, font: 'Arial', ...opts });

const cover = [
  center([t('UNIVERSITATEA POLITEHNICA TIMIȘOARA', { bold: true, size: 28 })], { spacing: { before: 240, after: 60 } }),
  center([t('Facultatea de Automatică și Calculatoare', { size: 24 })]),
  center([t('Programul de studii: Calculatoare și Tehnologia Informației', { size: 24 })], { spacing: { after: 1200 } }),
  center([t('LUCRARE DE LICENȚĂ', { bold: true, size: 36 })], { spacing: { after: 1000 } }),
  center([t('SECUREINBOX — SISTEM DE DETECȚIE A EMAILURILOR DE PHISHING', { bold: true, size: 40 })], { spacing: { after: 60 } }),
  center([t('CU MOTOR HIBRID ȘI INTELIGENȚĂ ARTIFICIALĂ LOCALĂ EXPLICABILĂ', { bold: true, size: 40 })], { spacing: { after: 1400 } }),
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 60, before: 600 }, indent: { left: 1200 }, children: [t('Coordonator științific:', { size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 400 }, indent: { left: 1200 }, children: [t('[Titlu + Nume coordonator]', { bold: true, size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 60 }, indent: { left: 1200 }, children: [t('Absolvent:', { size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 1000 }, indent: { left: 1200 }, children: [t('Andrei Stolojan', { bold: true, size: 28 })] }),
  center([t('Timișoara, 2026', { size: 28 })], { spacing: { before: 800 } }),
];

const rezumat = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun('Rezumat')] }),
  bodyPara('[ANDREI] — rezumatul (maximum o pagină) se scrie la final, după ce corpul lucrării este complet. Trebuie să cuprindă pe scurt: problema (phishingul), soluția propusă (SecureInbox — motor hibrid reguli + AI local explicabil), metoda și rezultatele principale.'),
];

const tocPage = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun('Cuprins')] }),
  new TableOfContents('Cuprins', { hyperlink: true, headingStyleRange: '1-3' }),
];

// ── assemble ────────────────────────────────────────────────────────────────
const cap4 = convert(fs.readFileSync(path.join(THESIS_DIR, 'cap4-proiectare.md'), 'utf8'));
const cap5 = convert(fs.readFileSync(path.join(THESIS_DIR, 'cap5-implementare.md'), 'utf8'));

const headingStyle = (id, name, size, lvl) => ({
  id, name, basedOn: 'Normal', next: 'Normal', quickFormat: true,
  run: { font: 'Arial', size, bold: true, color: '000000' },
  paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: lvl, indent: { firstLine: 0 } },
});

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 24 }, paragraph: { spacing: { line: 276, lineRule: 'auto' } } } },
    paragraphStyles: [
      headingStyle('Heading1', 'Heading 1', 32, 0),
      headingStyle('Heading2', 'Heading 2', 28, 1),
      headingStyle('Heading3', 'Heading 3', 26, 2),
    ],
  },
  numbering: { config: [{ reference: 'nums', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [
    // Cover — no header/footer
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1417, bottom: 1134, left: 1134, right: 1134 } } },
      children: [...cover, ...rezumat, ...tocPage],
    },
    // Body — header + page numbers
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1417, bottom: 1134, left: 1134, right: 1134 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } }, children: [new TextRun({ text: 'UPT · CTIRO 2026 · Andrei Stolojan · SecureInbox', font: 'Arial', size: 16, color: '666666' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ font: 'Arial', size: 18, children: [PageNumber.CURRENT] })] })] }) },
      children: [...cap4, ...cap5],
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  const outPath = path.join(THESIS_DIR, 'SecureInbox-licenta.docx');
  fs.writeFileSync(outPath, buf);
  console.log('WROTE', outPath, buf.length, 'bytes');
});
