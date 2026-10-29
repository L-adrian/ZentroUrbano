// A small Excel (.xlsx) writer: a few sheets of text, numbers and dates, a green header row that
// stays in place, filters and column widths. Enough for the exports of Mi cuenta, with no library.

export type XlsxCell = string | number | Date | null;
export type XlsxColumn = { header: string; width?: number; format?: "text" | "number" | "money" | "date" | "datetime" | "percent" };
export type XlsxSheet = { name: string; columns: XlsxColumn[]; rows: XlsxCell[][] };

const escapeXml = (value: string) =>
  value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const columnName = (index: number) => {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  return name;
};

// Excel counts days from 1899-12-30. Dates are written in Bolivian time (UTC-4).
const excelDate = (date: Date) => (date.getTime() - 4 * 3_600_000) / 86_400_000 + 25569;

// Style ids in styles.xml: 1 header, 2 date, 3 date and time, 4 money, 5 percent, 6 number.
const styleFor: Record<NonNullable<XlsxColumn["format"]>, number> = { text: 0, number: 6, money: 4, date: 2, datetime: 3, percent: 5 };

function sheetXml(sheet: XlsxSheet) {
  const lastColumn = columnName(Math.max(0, sheet.columns.length - 1));
  const header = `<row r="1">${sheet.columns.map((column, index) => `<c r="${columnName(index)}1" t="inlineStr" s="1"><is><t>${escapeXml(column.header)}</t></is></c>`).join("")}</row>`;
  const body = sheet.rows
    .map((row, rowIndex) => {
      const r = rowIndex + 2;
      const cells = row
        .map((value, index) => {
          if (value === null || value === undefined || value === "") return "";
          const ref = `${columnName(index)}${r}`;
          const format = sheet.columns[index]?.format ?? "text";
          if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : `<c r="${ref}" s="${styleFor[format === "date" ? "date" : "datetime"]}"><v>${excelDate(value)}</v></c>`;
          if (typeof value === "number") return Number.isFinite(value) ? `<c r="${ref}" s="${styleFor[format]}"><v>${value}</v></c>` : "";
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");
  const widths = sheet.columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width ?? 16}" customWidth="1"/>`).join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${widths}</cols><sheetData>${header}${body}</sheetData>` +
    `<autoFilter ref="A1:${lastColumn}${sheet.rows.length + 1}"/></worksheet>`
  );
}

const styles =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/><numFmt numFmtId="166" formatCode="&quot;Bs&quot; #,##0"/></numFmts>` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>` +
  `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF176B4D"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

// Sheet names: at most 31 characters, none of : \ / ? * [ ].
const sheetName = (name: string) => name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Hoja";

export function buildXlsx(sheets: XlsxSheet[]) {
  const files: Array<[string, string]> = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
        `</Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
        sheets.map((sheet, index) => `<sheet name="${escapeXml(sheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("") +
        `</sheets>` +
        `<definedNames>${sheets.map((sheet, index) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">'${escapeXml(sheetName(sheet.name)).replace(/'/g, "''")}'!$A$1:$${columnName(Math.max(0, sheet.columns.length - 1))}$${sheet.rows.length + 1}</definedName>`).join("")}</definedNames>` +
        `</workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("") +
        `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    ["xl/styles.xml", styles],
    ...sheets.map((sheet, index): [string, string] => [`xl/worksheets/sheet${index + 1}.xml`, sheetXml(sheet)]),
  ];
  return zipStore(files.map(([name, text]) => [name, new TextEncoder().encode(text)]));
}

// ZIP without compression ("stored"), which every spreadsheet program reads.
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries: Array<[string, Uint8Array]>) {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  // 1 January 2026, 00:00, in DOS format; the date inside the zip is not important.
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const [name, data] of entries) {
    const nameBytes = new TextEncoder().encode(name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, data);
    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, dosTime, true);
    entry.setUint16(14, dosDate, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((sum, chunk) => sum + chunk.length, 0));
  let position = 0;
  for (const chunk of all) {
    out.set(chunk, position);
    position += chunk.length;
  }
  return out;
}

// CSV for Excel in Spanish: semicolons, a BOM so accents show right, quotes when needed.
export function buildCsv(columns: XlsxColumn[], rows: XlsxCell[][]) {
  const cell = (value: XlsxCell, format: XlsxColumn["format"]) => {
    if (value === null || value === undefined) return "";
    let text: string;
    if (value instanceof Date) {
      const local = new Date(value.getTime() - 4 * 3_600_000).toISOString();
      text = format === "date" ? local.slice(0, 10) : `${local.slice(0, 10)} ${local.slice(11, 16)}`;
    } else if (typeof value === "number") text = format === "percent" ? `${Math.round(value * 100)}%` : String(value);
    // A leading = + - @ would run as a formula in Excel; a phone number like "+591 7001" is safe.
    else text = /^[=+\-@]/.test(value) && !/^\+\d+ [\d ]+$/.test(value) ? `'${value}` : value;
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.map((column) => cell(column.header, "text")).join(";"), ...rows.map((row) => row.map((value, index) => cell(value, columns[index]?.format)).join(";"))];
  return `﻿${lines.join("\r\n")}\r\n`;
}
