import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import JSZip from "jszip";

// Generates simple but real documents (PDF decks, XLSX pricing sheets) for the demo.

export type PdfSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
};

const PAGE_W = 792; // landscape letter, deck-like
const PAGE_H = 612;
const MARGIN = 54;
const NAVY = rgb(0.12, 0.2, 0.31);
const GRAY = rgb(0.32, 0.36, 0.42);
const ACCENT = rgb(0.65, 0.49, 0.25);

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > width && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function makeDeckPdf(opts: {
  title: string;
  subtitle: string;
  footer: string;
  brandColor?: [number, number, number];
  sections: PdfSection[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(opts.title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const brand = opts.brandColor ? rgb(...opts.brandColor) : NAVY;
  let pageNo = 0;

  const newPage = (): PDFPage => {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    pageNo++;
    p.drawRectangle({ x: 0, y: PAGE_H - 10, width: PAGE_W, height: 10, color: brand });
    p.drawText(opts.footer, { x: MARGIN, y: 24, size: 8, font, color: GRAY });
    p.drawText(String(pageNo), { x: PAGE_W - MARGIN, y: 24, size: 8, font, color: GRAY });
    return p;
  };

  // Title slide
  const cover = newPage();
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H - 10, color: brand });
  let y = PAGE_H / 2 + 40;
  for (const l of wrap(opts.title, bold, 30, PAGE_W - MARGIN * 2)) {
    cover.drawText(l, { x: MARGIN, y, size: 30, font: bold, color: rgb(1, 1, 1) });
    y -= 38;
  }
  for (const l of wrap(opts.subtitle, font, 14, PAGE_W - MARGIN * 2)) {
    cover.drawText(l, { x: MARGIN, y: y - 6, size: 14, font, color: rgb(0.9, 0.92, 0.95) });
    y -= 20;
  }

  const width = PAGE_W - MARGIN * 2;
  for (const s of opts.sections) {
    let page = newPage();
    y = PAGE_H - MARGIN - 10;
    page.drawText(s.heading, { x: MARGIN, y, size: 20, font: bold, color: NAVY });
    page.drawRectangle({ x: MARGIN, y: y - 10, width: 48, height: 2.5, color: ACCENT });
    y -= 36;
    const ensure = (h: number) => {
      if (y - h < 50) {
        page = newPage();
        y = PAGE_H - MARGIN - 10;
        page.drawText(`${s.heading} (cont.)`, { x: MARGIN, y, size: 14, font: bold, color: NAVY });
        y -= 26;
      }
    };
    for (const para of s.paragraphs ?? []) {
      for (const l of wrap(para, font, 11, width)) {
        ensure(15);
        page.drawText(l, { x: MARGIN, y, size: 11, font, color: rgb(0.1, 0.12, 0.16) });
        y -= 15;
      }
      y -= 8;
    }
    for (const b of s.bullets ?? []) {
      const lines = wrap(b, font, 11, width - 16);
      lines.forEach((l, i) => {
        ensure(15);
        if (i === 0) page.drawText("•", { x: MARGIN, y, size: 11, font: bold, color: ACCENT });
        page.drawText(l, { x: MARGIN + 14, y, size: 11, font, color: rgb(0.1, 0.12, 0.16) });
        y -= 15;
      });
      y -= 3;
    }
    if (s.table) {
      y -= 4;
      const cols = s.table.headers.length;
      const colW = width / cols;
      const drawRow = (cells: string[], isHeader: boolean) => {
        const f = isHeader ? bold : font;
        const wrapped = cells.map((c) => wrap(c, f, 9.5, colW - 8));
        const h = Math.max(...wrapped.map((w) => w.length)) * 12 + 8;
        ensure(h);
        if (isHeader) page.drawRectangle({ x: MARGIN, y: y - h + 10, width, height: h, color: rgb(0.93, 0.94, 0.96) });
        wrapped.forEach((lines, ci) => {
          lines.forEach((l, li) => {
            page.drawText(l, { x: MARGIN + ci * colW + 4, y: y - li * 12, size: 9.5, font: f, color: NAVY });
          });
        });
        y -= h;
        page.drawLine({ start: { x: MARGIN, y: y + 8 }, end: { x: MARGIN + width, y: y + 8 }, thickness: 0.5, color: rgb(0.85, 0.87, 0.9) });
      };
      drawRow(s.table.headers, true);
      for (const r of s.table.rows) drawRow(r, false);
    }
  }
  return doc.save();
}

type Cell = string | number | null;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function colName(i: number): string {
  let s = "";
  i++;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

// Minimal valid .xlsx writer (inline strings + numbers; bold header row).
export async function makeXlsx(sheets: { name: string; rows: Cell[][] }[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
</workbook>`
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );
  zip.file(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
</styleSheet>`
  );
  sheets.forEach((s, si) => {
    const rows = s.rows
      .map((r, ri) => {
        const cells = r
          .map((c, ci) => {
            if (c == null || c === "") return "";
            const ref = `${colName(ci)}${ri + 1}`;
            if (typeof c === "number") return `<c r="${ref}" s="${ri === 0 ? 1 : 2}"><v>${c}</v></c>`;
            return `<c r="${ref}" t="inlineStr"${ri === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${esc(c)}</t></is></c>`;
          })
          .join("");
        return `<row r="${ri + 1}">${cells}</row>`;
      })
      .join("");
    zip.file(
      `xl/worksheets/sheet${si + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="44" customWidth="1"/><col min="2" max="12" width="16" customWidth="1"/></cols><sheetData>${rows}</sheetData></worksheet>`
    );
  });
  return zip.generateAsync({ type: "uint8array" });
}
