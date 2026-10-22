import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { getTransactions } from "@/lib/sheets";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 60_000;
let cachedData: Awaited<ReturnType<typeof getTransactions>> | null = null;
let cachedAt = 0;
let pendingRequest: Promise<Awaited<ReturnType<typeof getTransactions>>> | null = null;

async function getCachedTransactions() {
  const now = Date.now();
  if (cachedData && now - cachedAt < CACHE_TTL_MS) return cachedData;

  // Share one in-flight Google Sheets read across simultaneous dashboard requests.
  if (!pendingRequest) {
    pendingRequest = getTransactions()
      .then((data) => {
        cachedData = data;
        cachedAt = Date.now();
        return data;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }

  return pendingRequest;
}

export async function GET() {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  }

  try {
    const data = await getCachedTransactions();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=30" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data spreadsheet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
