import { google } from "googleapis";

export type Transaction = {
  id: string;
  entity: string;
  rowNumber: number;
  date: string;
  employee: string;
  nopek: string;
  tripNumber: string;
  airline: string;
  bookingCode: string;
  purchase: number;
  refund: number;
  transferAmount: number;
  accountNumber: string;
  company: string;
  transfer: string;
  description: string;
  ra: string;
  dn: string;
  cn: string;
};

function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let credentials: Record<string, unknown> | undefined;
  if (raw) {
    try { credentials = JSON.parse(raw); }
    catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON yang valid."); }
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    // Local development only. Do not commit the credential file.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    credentials = require("node:" + "fs").existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE)
      ? JSON.parse(require("node:" + "fs").readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf8"))
      : undefined;
  }
  if (!credentials) throw new Error("Kredensial Google belum diatur. Isi GOOGLE_SERVICE_ACCOUNT_JSON atau GOOGLE_SERVICE_ACCOUNT_FILE.");
  const auth = new google.auth.GoogleAuth({
    credentials: credentials as never,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
  return google.sheets({ version: "v4", auth });
}

function normalize(value: unknown): string {
  return String(value ?? "").replace(/\u00a0/g, " ").trim();
}

function numeric(value: unknown): number {
  if (typeof value === "number") return value;
  let s = normalize(value).replace(/Rp/gi, "").replace(/\s/g, "");
  if (!s) return 0;
  // Indonesian number format: 1.234.567,89
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Sheets may contain visually separated transaction groups, each with a
 * repeated header and a subtotal row. Keep only actual transaction rows.
 */
function isTotalRow(row: string[]) {
  const text = row.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
  return /total\s+nominal\s+setelah\s+di\s+potong\s+biaya\s+admin\s+mtt|total\s+nominal|total\s+pembelian|grand\s+total|jumlah\s+total|subtotal/i.test(text);
}

function isHeader(row: string[]) {
  const text = row.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
  // Header names can be repeated in the middle of a tab. Detect common
  // variants without depending on the exact spacing or punctuation.
  const hasEmployee = /nama\s*pekerja|nama\s*karyawan/i.test(text);
  const hasPurchase = /nilai\s*pembelian|pembelian/i.test(text);
  return hasEmployee && hasPurchase;
}

function cell(row: string[], idx: number) { return normalize(row[idx]); }

export async function getTransactions(): Promise<{ transactions: Transaction[]; sheets: string[]; updatedAt: string }> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_ID belum diatur.");
  const api = getSheetsClient();
  const meta = await api.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  const sheetNames = (meta.data.sheets ?? [])
    .map(s => s.properties?.title)
    .filter((s): s is string => Boolean(s));
  const transactions: Transaction[] = [];

  // Read each tab; data ranges are bounded to A:Z to avoid pulling unused columns.
  for (const sheetName of sheetNames) {
    const safeName = "'" + sheetName.replace(/'/g, "''") + "'!A1:Z";
    const result = await api.spreadsheets.values.get({
      spreadsheetId,
      range: safeName,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING"
    });
    const rows = (result.data.values ?? []) as string[][];
    let headerSeen = false;
    let logicalRow = 0;
    for (const rowRaw of rows) {
      logicalRow += 1;
      const row = rowRaw.map(normalize);

      // A repeated header starts another visual group; skip it and continue
      // flattening all groups into the same transaction list.
      if (isHeader(row)) { headerSeen = true; continue; }
      // Ignore everything before the first header, blank rows, and subtotal rows.
      if (!headerSeen || row.every(v => !v) || isTotalRow(row)) continue;

      // Column positions follow the sheet layout:
      // A No.; B date; C employee; D Nopek; F Trip; G Airline/Hotel;
      // H booking; I purchase; J refund; K transfer amount; L account;
      // M company; N transfer status; O description; P/Q/R references.
      const employee = cell(row, 2);
      const date = cell(row, 1);
      const purchase = numeric(row[8]);
      const refund = numeric(row[9]);
      const bookingCode = cell(row, 7);
      const hasTransaction = Boolean(employee || date || bookingCode) &&
        (purchase > 0 || refund > 0 || Boolean(bookingCode));
      if (!hasTransaction) continue;

      transactions.push({
        id: `${sheetName}-${logicalRow}`,
        entity: sheetName,
        rowNumber: logicalRow,
        date,
        employee,
        nopek: cell(row, 3),
        tripNumber: cell(row, 5),
        airline: cell(row, 6),
        bookingCode,
        purchase,
        refund,
        transferAmount: numeric(row[10]),
        accountNumber: cell(row, 11),
        company: cell(row, 12),
        transfer: cell(row, 13),
        description: cell(row, 14),
        ra: cell(row, 15),
        dn: cell(row, 16),
        cn: cell(row, 17)
      });
    }
  }
  return { transactions, sheets: sheetNames, updatedAt: new Date().toISOString() };
}
