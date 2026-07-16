import { NextRequest, NextResponse } from "next/server";
import { fetchVciRatios } from "@/lib/vciFinancials";
import { fetchVciIncomeStatement } from "@/lib/vciStatements";

export const maxDuration = 30;

// Safety cap only — full history back to whatever Vietcap has (typically
// since listing), not a rolling recent-quarters window.
const MAX_PERIODS = 200;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }

  const [ratiosResult, statementResult] = await Promise.allSettled([
    fetchVciRatios(symbol),
    fetchVciIncomeStatement(symbol),
  ]);

  // The ratio table is the primary payload — fail the request if that
  // fails. The income-statement rows (Thu nhập lãi thuần, Lợi nhuận sau
  // thuế) are a bonus on top; if that guessed endpoint/field mapping is
  // wrong, degrade to showing the ratio table without them rather than
  // failing the whole section.
  if (ratiosResult.status === "rejected") {
    const err = ratiosResult.reason;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi không xác định" },
      { status: 502 }
    );
  }

  const points = ratiosResult.value.slice(-MAX_PERIODS);
  const statement = statementResult.status === "fulfilled" ? statementResult.value.slice(-MAX_PERIODS) : [];
  const statementError = statementResult.status === "rejected" ? String(statementResult.reason) : null;

  return NextResponse.json({ symbol, points, statement, statementError });
}
