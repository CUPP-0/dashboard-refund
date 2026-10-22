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
function isTotalRow(row: string[]) {
  return row.some(v => /total nominal|total pembelian|grand total|jumlah total/i.test(v));
}
function isHeader(row: string[]) {
  return row.some(v => /nama pekerja/i.test(v)) && row.some(v => /nilai pembelian/i.test(v));
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
      if (isHeader(row)) { headerSeen = true; continue; }
      if (!headerSeen || row.every(v => !v) || isTotalRow(row)) continue;

      // Column positions follow the sheet screenshot:
      // A No.; B date; C employee; D Nopek; F Trip; G Airline/Hotel;
      // H booking; I purchase; J refund; K transfer amount; L account;
      // M company; N transfer status; O description; P/Q/R references.
      const employee = cell(row, 2);
      const date = cell(row, 1);
      const purchase = numeric(row[8]);
      const refund = numeric(row[9]);
      const hasTransaction = Boolean(employee || date || cell(row, 7)) && (purchase > 0 || refund > 0 || Boolean(cell(row, 7)));
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
        bookingCode: cell(row, 7),
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
