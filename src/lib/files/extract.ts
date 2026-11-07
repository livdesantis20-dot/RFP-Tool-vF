import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

export type FileKind = "pdf" | "pptx" | "xlsx" | "csv" | "docx" | "txt" | "unknown";

export const RESPONSE_EXTS = [".pdf", ".pptx"];
export const PRICING_EXTS = [".xlsx", ".csv", ".pdf", ".pptx"];
export const RFP_EXTS = [".pdf", ".docx", ".pptx", ".txt"];

export function kindOf(name: string, contentType = ""): FileKind {
  const n = name.toLowerCase();
  const ct = contentType.toLowerCase();
  if (n.endsWith(".pdf") || ct.includes("pdf")) return "pdf";
  if (n.endsWith(".pptx") || ct.includes("presentationml")) return "pptx";
  if (n.endsWith(".xlsx") || ct.includes("spreadsheetml")) return "xlsx";
  if (n.endsWith(".csv") || ct.includes("text/csv")) return "csv";
  if (n.endsWith(".docx") || ct.includes("wordprocessingml")) return "docx";
  if (n.endsWith(".txt") || n.endsWith(".md") || ct.startsWith("text/")) return "txt";
  return "unknown";
}

export const KIND_LABEL: Record<FileKind, string> = {
  pdf: "PDF",
  pptx: "PowerPoint",
  xlsx: "Excel",
  csv: "CSV",
  docx: "Word",
  txt: "Text",
  unknown: "File",
};

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

export async function pdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [String(text)];
  return {
    pages: totalPages,
    text: pages.map((t, i) => `--- Page ${i + 1} ---\n${t.trim()}`).join("\n\n"),
  };
}

export async function pptxText(bytes: Uint8Array): Promise<{ text: string; slides: number }> {
  const zip = await JSZip.loadAsync(bytes);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort(
      (a, b) =>
        Number(a.match(/slide(\d+)\.xml$/i)?.[1] ?? 0) -
        Number(b.match(/slide(\d+)\.xml$/i)?.[1] ?? 0)
    );
  const parts: string[] = [];
  for (let i = 0; i < slideNames.length; i++) {
    const xml = await zip.files[slideNames[i]].async("string");
    // Paragraph-aware: join runs within <a:p>, newline between paragraphs.
    const paras = xml.split(/<\/a:p>/).map((p) => {
      const runs: string[] = [];
      const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(p)) !== null) runs.push(decodeXml(m[1]));
      return runs.join("").trim();
    });
    // Speaker notes often carry the substance of a vendor deck.
    const notesName = `ppt/notesSlides/notesSlide${slideNames[i].match(/slide(\d+)\.xml$/i)?.[1]}.xml`;
    let notes = "";
    if (zip.files[notesName]) {
      const nx = await zip.files[notesName].async("string");
      const runs: string[] = [];
      const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(nx)) !== null) runs.push(decodeXml(m[1]));
      notes = runs.join(" ").replace(/\s+/g, " ").trim();
    }
    const body = paras.filter(Boolean).join("\n");
    parts.push(
      `--- Slide ${i + 1} ---\n${body || "(no text on slide)"}${notes ? `\n[Speaker notes] ${notes}` : ""}`
    );
  }
  return { text: parts.join("\n\n"), slides: slideNames.length };
}

export async function docxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const doc = zip.files["word/document.xml"];
  if (!doc) return "";
  const xml = await doc.async("string");
  return xml
    .split(/<\/w:p>/)
    .map((p) => {
      const runs: string[] = [];
      const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(p)) !== null) runs.push(m[1] != null ? decodeXml(m[1]) : "\t");
      return runs.join("");
    })
    .filter((l) => l.trim())
    .join("\n");
}

function colIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, "").toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// Minimal .xlsx reader: every sheet → pipe-delimited rows. Formula cells use their
// cached value (what the vendor saw when they saved the file).
export async function xlsxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const shared: string[] = [];
  const ss = zip.files["xl/sharedStrings.xml"];
  if (ss) {
    const xml = await ss.async("string");
    for (const si of xml.split(/<\/si>/).slice(0, -1)) {
      const ts: string[] = [];
      const re = /<t[^>]*>([\s\S]*?)<\/t>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(si)) !== null) ts.push(decodeXml(m[1]));
      shared.push(ts.join(""));
    }
  }

  const wb = (await zip.files["xl/workbook.xml"]?.async("string")) ?? "";
  const rels = (await zip.files["xl/_rels/workbook.xml.rels"]?.async("string")) ?? "";
  const relMap = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/Id="([^"]+)"/)?.[1];
    const target = m[0].match(/Target="([^"]+)"/)?.[1];
    if (id && target) relMap.set(id, target.replace(/^\/?xl\//, "").replace(/^\//, ""));
  }
  const sheets: { name: string; path: string }[] = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(m[0].match(/name="([^"]+)"/)?.[1] ?? "Sheet");
    const rid = m[0].match(/r:id="([^"]+)"/)?.[1];
    const target = rid ? relMap.get(rid) : undefined;
    if (target) sheets.push({ name, path: `xl/${target}` });
  }
  if (sheets.length === 0) {
    for (const n of Object.keys(zip.files).filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))) {
      sheets.push({ name: n.split("/").pop()!.replace(".xml", ""), path: n });
    }
  }

  const out: string[] = [];
  for (const sheet of sheets) {
    const f = zip.files[sheet.path];
    if (!f) continue;
    const xml = await f.async("string");
    const rows: string[] = [];
    for (const rowM of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const cM of rowM[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cM[1];
        const inner = cM[2] ?? "";
        const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
        const t = attrs.match(/t="([^"]+)"/)?.[1];
        let v = "";
        if (t === "s") {
          const idx = Number(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1]);
          v = Number.isFinite(idx) ? shared[idx] ?? "" : "";
        } else if (t === "inlineStr") {
          v = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => decodeXml(x[1])).join("");
        } else if (t === "b") {
          v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] === "1" ? "TRUE" : "FALSE";
        } else {
          v = decodeXml(inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
        }
        const i = ref ? colIndex(ref) : cells.length;
        while (cells.length < i) cells.push("");
        cells[i] = v.replace(/\s+/g, " ").trim();
      }
      if (cells.some((c) => c !== "")) rows.push(cells.join(" | "));
    }
    out.push(`## Sheet: ${sheet.name}\n${rows.join("\n")}`);
  }
  return out.join("\n\n");
}

export type ExtractedDoc =
  | { mode: "pdf"; bytes: Uint8Array; pages: number }
  | { mode: "text"; text: string; units: number; unitLabel: string };

// PDFs under these limits are sent to Claude as native documents (layout, charts and
// tables preserved); bigger ones fall back to extracted text.
const PDF_NATIVE_MAX_BYTES = 12 * 1024 * 1024;
const PDF_NATIVE_MAX_PAGES = 300;

export async function extractForModel(
  bytes: Uint8Array,
  name: string,
  contentType = "",
  opts: { allowNativePdf?: boolean } = {}
): Promise<ExtractedDoc> {
  const kind = kindOf(name, contentType);
  switch (kind) {
    case "pdf": {
      const pages = await pdfPageCount(bytes).catch(() => 0);
      if (
        opts.allowNativePdf !== false &&
        bytes.byteLength <= PDF_NATIVE_MAX_BYTES &&
        pages > 0 &&
        pages <= PDF_NATIVE_MAX_PAGES
      ) {
        return { mode: "pdf", bytes, pages };
      }
      const t = await pdfText(bytes);
      return { mode: "text", text: t.text, units: t.pages, unitLabel: "pages" };
    }
    case "pptx": {
      const t = await pptxText(bytes);
      return { mode: "text", text: t.text, units: t.slides, unitLabel: "slides" };
    }
    case "xlsx": {
      const text = await xlsxText(bytes);
      return { mode: "text", text, units: (text.match(/^## Sheet:/gm) ?? []).length, unitLabel: "sheets" };
    }
    case "docx": {
      const text = await docxText(bytes);
      return { mode: "text", text, units: 1, unitLabel: "document" };
    }
    case "csv":
    case "txt": {
      const text = new TextDecoder().decode(bytes);
      return { mode: "text", text, units: 1, unitLabel: kind === "csv" ? "sheet" : "document" };
    }
    default:
      throw new Error(`Unsupported file type: ${name}`);
  }
}

// Page / slide count for display and validation.
export async function countUnits(bytes: Uint8Array, name: string, contentType = ""): Promise<number | null> {
  const kind = kindOf(name, contentType);
  if (kind === "pdf") return pdfPageCount(bytes);
  if (kind === "pptx") {
    const zip = await JSZip.loadAsync(bytes);
    return Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n)).length;
  }
  return null;
}
