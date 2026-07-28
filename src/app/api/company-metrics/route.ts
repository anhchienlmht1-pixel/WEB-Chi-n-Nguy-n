import { NextRequest, NextResponse } from "next/server";
import { fetchCompanyMetrics } from "@/lib/companyMetrics";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }

  try {
    const metrics = await fetchCompanyMetrics(symbol);
    return NextResponse.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định khi tải chỉ số cơ bản";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
