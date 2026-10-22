import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { getTransactions } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await hasSession())) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  try {
    const data = await getTransactions();
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data spreadsheet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
