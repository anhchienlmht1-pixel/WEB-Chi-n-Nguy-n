import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchKbsReport, KbsPeriodType, KbsReportType } from "../../server/src/providers/kbsFinancials.js";
import { cached } from "../_lib/cache.js";
import { sendError } from "../_lib/errors.js";

const VALID_REPORT_TYPES: KbsReportType[] = ["KQKD", "CDKT", "LCTT", "CSTC"];
const VALID_PERIOD_TYPES: KbsPeriodType[] = ["year", "quarter"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const symbol = String(req.query.symbol ?? "").toUpperCase();
  const reportType = (req.query.type as KbsReportType) || "CSTC";
  const periodType = (req.query.periodType as KbsPeriodType) || "year";

  if (!VALID_REPORT_TYPES.includes(reportType)) {
    res.status(400).json({ error: `Invalid type. Use one of: ${VALID_REPORT_TYPES.join(", ")}` });
    return;
  }
  if (!VALID_PERIOD_TYPES.includes(periodType)) {
    res.status(400).json({ error: `Invalid periodType. Use one of: ${VALID_PERIOD_TYPES.join(", ")}` });
    return;
  }

  try {
    const data = await cached(`financials:${symbol}:${reportType}:${periodType}`, 3600, () =>
      fetchKbsReport(symbol, reportType, periodType)
    );
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
}
