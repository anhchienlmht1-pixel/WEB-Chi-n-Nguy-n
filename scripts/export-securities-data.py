"""Exports the securities-industry .xlsm workbook into the static JSON
files the "Cơ bản" (Fundamentals) section for securities companies reads
at client/public/data/securities/ — companion to export-bank-data.py,
same architecture, different industry (16 listed securities firms
instead of 27 banks).

Usage:
    python3 scripts/export-securities-data.py path/to/File_Chung_khoan.xlsm

Requires openpyxl (`pip install openpyxl`).

Row numbers below are hardcoded against this workbook's specific layout
(one uniform ~1098-row template shared by all 16 company sheets) and its
"Công thức" sheet's per-metric "Theo dòng" formulas. Every ratio was
cross-checked against that sheet's own precomputed "Dữ liệu Chung" table
for VND/SSI before being trusted — see git history. Growth metrics use a
plain (current-prior)/prior convention computed directly here rather than
the "Công thức" sheet's `*` prior-period notation, whose exact sign
convention couldn't be confirmed unambiguously from the plain-text
formula alone.
"""

import json
import math
import os
import sys
import openpyxl
from openpyxl.utils import column_index_from_string

SRC = sys.argv[1] if len(sys.argv) > 1 else "File_Chung_khoan.xlsm"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "client/public/data/securities")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(f"{OUT_DIR}/statements", exist_ok=True)

wb = openpyxl.load_workbook(SRC, data_only=True, keep_vba=True)

formula_ws = wb["Công thức"]
COMPANIES = []
for r in range(2, 18):
    symbol = formula_ws.cell(row=r, column=2).value
    if not symbol:
        continue
    COMPANIES.append({
        "symbol": symbol,
        "name": formula_ws.cell(row=r, column=3).value,
        "exchange": formula_ws.cell(row=r, column=4).value or "",
    })
print(f"{len(COMPANIES)} companies:", [c["symbol"] for c in COMPANIES])

YEAR_COLS = [column_index_from_string(c) for c in ["B", "C", "D", "E", "F", "G", "H", "I"]]
YEAR_LABELS = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]
QUARTER_COLS = list(range(column_index_from_string("K"), column_index_from_string("AQ") + 1))


def num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return v
    return None


def safe_div(a, b):
    if a is None or b is None or b == 0:
        return None
    return a / b


def growth(cur, prev):
    if cur is None or prev is None or prev == 0:
        return None
    return (cur - prev) / abs(prev)


class Sheet:
    def __init__(self, ws):
        self.ws = ws

    def row(self, r, col_idx):
        return num(self.ws.cell(row=r, column=col_idx).value)


# The 37 "Công thức" ratios, computed the same way for both quarterly and
# yearly columns — see module docstring for the handful of formulas
# resolved from "Dữ liệu Biểu đồ Chi tiết" instead of the (occasionally
# ambiguous, in the case of sign/precedence) plain-text "Theo dòng" column.
def compute_metrics(sheet: Sheet, cols: list, is_quarterly: bool) -> dict:
    n = len(cols)

    def r(row_num, i):
        return sheet.row(row_num, cols[i]) if 0 <= i < n else None

    def avg1(row_num, i):
        cur, prev = r(row_num, i), r(row_num, i - 1) if i - 1 >= 0 else None
        return (cur + prev) / 2.0 if cur is not None and prev is not None else None

    m = {k: [] for k in [
        "propAssets", "propAssetsGrowth", "bvps", "assetsToEquity", "liabToEquity",
        "roa", "roe", "grossMargin", "pretaxMargin", "netMargin",
        "revenueGrowth", "pretaxProfitGrowth", "netProfitGrowth",
        "epsBasic", "epsDiluted", "sharesOutstanding",
        "brokerageMargin", "brokerageRevenueShare", "brokerageTakeRate", "stockTakeRate",
        "marginBalance", "marginGrowth", "propToTotalAssets", "propToEquity",
        "propRevenue", "propProfit", "propRevenueShare", "propProfitShare", "propMargin",
        "marginRate", "fundingCost", "marginSpread", "marginUtilization",
    ]}

    for i in range(n):
        propAssets = None
        f8, f9, f11 = r(8, i), r(9, i), r(11, i)
        if None not in (f8, f9, f11):
            propAssets = f8 + f9 + f11
        m["propAssets"].append(propAssets)

        equity, shares, totalAssets, liabilities = r(142, i), r(176, i), r(91, i), r(92, i)
        m["bvps"].append(safe_div(equity, shares))
        m["assetsToEquity"].append(safe_div(totalAssets, equity))
        m["liabToEquity"].append(safe_div(liabilities, equity))

        m["roa"].append(safe_div(r(279, i), avg1(91, i)))
        m["roe"].append(safe_div(r(280, i), avg1(142, i)))

        revenue, grossProfit, pretax, netProfit = r(237, i), r(257, i), r(273, i), r(279, i)
        m["grossMargin"].append(safe_div(grossProfit, revenue))
        m["pretaxMargin"].append(safe_div(pretax, revenue))
        m["netMargin"].append(safe_div(netProfit, revenue))

        m["epsBasic"].append(r(296, i) * 1e9 if r(296, i) is not None else None)
        m["epsDiluted"].append(r(297, i) * 1e9 if r(297, i) is not None else None)
        m["sharesOutstanding"].append(shares * 1e9 if shares is not None else None)

        brokerageRevenue, brokerageCost = r(227, i), r(249, i)
        m["brokerageMargin"].append(
            safe_div(add(brokerageRevenue, brokerageCost), brokerageRevenue)
        )
        m["brokerageRevenueShare"].append(safe_div(brokerageRevenue, revenue))
        m["brokerageTakeRate"].append(safe_div(brokerageRevenue, r(564, i)))
        m["stockTakeRate"].append(safe_div(brokerageRevenue, r(565, i)))

        marginBalance = r(615, i)
        m["marginBalance"].append(marginBalance)
        m["propToTotalAssets"].append(safe_div(propAssets, totalAssets))
        m["propToEquity"].append(safe_div(propAssets, equity))

        propRevenue = None
        f219, f223, f225 = r(219, i), r(223, i), r(225, i)
        if None not in (f219, f223, f225):
            propRevenue = f219 + f223 + f225
        m["propRevenue"].append(propRevenue)

        # Loss line items (239/243/245/248) are already negative in the raw
        # statement, so profit is a plain sum — matches the validated
        # "Dữ liệu Biểu đồ Chi tiết" LN-mảng formulas (rows 30-35), not the
        # "Công thức" sheet's own text, which alternates +/- ambiguously.
        propProfit = None
        f239, f243, f245, f248 = r(239, i), r(243, i), r(245, i), r(248, i)
        if propRevenue is not None and None not in (f239, f243, f245, f248):
            propProfit = f219 + f223 + f225 + f239 + f243 + f245 + f248
        m["propProfit"].append(propProfit)
        m["propRevenueShare"].append(safe_div(propRevenue, revenue))
        m["propProfitShare"].append(safe_div(propProfit, grossProfit))
        m["propMargin"].append(safe_div(propProfit, propRevenue))

        # Margin lending yield / funding cost / spread — annualized (×4 at
        # quarterly granularity; already a full year at yearly granularity,
        # so no multiplier there), matching "Dữ liệu Biểu đồ Chi tiết"
        # rows 119/120/132/134 exactly (not the simpler unaveraged/
        # unannualized "Công thức" sheet text for these three).
        annualize = 4 if is_quarterly else 1
        marginInterest = r(224, i)
        m["marginRate"].append(safe_div(marginInterest * annualize if marginInterest is not None else None, marginBalance))

        # Row 265 ("Chi phí lãi vay") is a negative expense line like every
        # other cost row in this statement — negated here so "funding
        # cost" reads as a positive % and margin spread (yield minus cost)
        # comes out as a plain subtraction, instead of literally replicating
        # the source chart-data sheet's own unnegated division (which would
        # make a negative "cost" that *inflates* the spread when subtracted).
        interestExpense = r(265, i)
        shortDebt, longDebt = r(94, i), r(121, i)
        shortDebtPrev, longDebtPrev = (r(94, i - 1), r(121, i - 1)) if i - 1 >= 0 else (None, None)
        avgDebt = None
        if None not in (shortDebt, longDebt, shortDebtPrev, longDebtPrev):
            avgDebt = (shortDebt + longDebt + shortDebtPrev + longDebtPrev) / 2.0
        fundingCost = safe_div(-interestExpense if interestExpense is not None else None, avgDebt)
        m["fundingCost"].append(fundingCost)
        marginRateVal = m["marginRate"][-1]
        m["marginSpread"].append(
            marginRateVal - fundingCost if marginRateVal is not None and fundingCost is not None else None
        )
        m["marginUtilization"].append(safe_div(marginBalance, equity))

    m["propAssetsGrowth"] = [growth(m["propAssets"][i], m["propAssets"][i - 1]) if i >= 1 else None for i in range(n)]
    m["revenueGrowth"] = [
        growth(r(237, i), r(237, i - 1)) if i >= 1 else None for i in range(n)
    ]
    m["pretaxProfitGrowth"] = [
        growth(r(273, i), r(273, i - 1)) if i >= 1 else None for i in range(n)
    ]
    m["netProfitGrowth"] = [
        growth(r(279, i), r(279, i - 1)) if i >= 1 else None for i in range(n)
    ]
    m["marginGrowth"] = [
        growth(r(615, i), r(615, i - 1)) if i >= 1 else None for i in range(n)
    ]

    return m


def add(a, b):
    if a is None or b is None:
        return None
    return a + b


CORE_METRIC_KEYS = [
    "roe", "roa", "epsBasic", "bvps",
    "grossMargin", "pretaxMargin", "netMargin", "brokerageMargin",
    "brokerageRevenueShare", "marginRate", "fundingCost", "marginSpread",
    "propProfitShare", "marginBalance",
]

overview_rows = []

for c in COMPANIES:
    symbol = c["symbol"]
    if symbol not in wb.sheetnames:
        print("MISSING SHEET:", symbol)
        continue
    ws = wb[symbol]
    sheet = Sheet(ws)

    quarter_labels = [ws.cell(row=2, column=col).value for col in QUARTER_COLS]
    quarterly = {"periods": quarter_labels, "metrics": compute_metrics(sheet, QUARTER_COLS, True)}
    yearly = {"periods": YEAR_LABELS, "metrics": compute_metrics(sheet, YEAR_COLS, False)}

    out = {"symbol": symbol, "name": c["name"], "exchange": c["exchange"], "quarter": quarterly, "year": yearly}
    with open(f"{OUT_DIR}/{symbol}.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    # Raw statement export (all rows with a label), quarterly + yearly.
    raw_items = []
    max_row = ws.max_row
    for row_i in range(1, max_row + 1):
        label = ws.cell(row=row_i, column=1).value
        if not label:
            continue
        raw_items.append({
            "row": row_i,
            "name": label,
            "quarter": [sheet.row(row_i, col) for col in QUARTER_COLS],
            "year": [sheet.row(row_i, col) for col in YEAR_COLS],
        })
    with open(f"{OUT_DIR}/statements/{symbol}.json", "w", encoding="utf-8") as f:
        json.dump(
            {"symbol": symbol, "quarterPeriods": quarter_labels, "yearPeriods": YEAR_LABELS, "items": raw_items},
            f,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    last = len(quarter_labels) - 1
    while last >= 0 and all(quarterly["metrics"][k][last] is None for k in CORE_METRIC_KEYS):
        last -= 1
    qm = quarterly["metrics"]
    overview_rows.append({
        "symbol": symbol,
        "name": c["name"],
        "exchange": c["exchange"],
        "period": quarter_labels[last] if last >= 0 else quarter_labels[-1],
        **{k: qm[k][last] if last >= 0 else None for k in CORE_METRIC_KEYS},
    })
    print(f"{symbol}: {len(quarter_labels)} quarters, {len(YEAR_LABELS)} years, {len(raw_items)} statement rows — done")

with open(f"{OUT_DIR}/overview.json", "w", encoding="utf-8") as f:
    json.dump(
        {"period": overview_rows[0]["period"] if overview_rows else None, "companies": overview_rows},
        f, ensure_ascii=False, separators=(",", ":"),
    )

with open(f"{OUT_DIR}/meta.json", "w", encoding="utf-8") as f:
    json.dump({"companies": COMPANIES}, f, ensure_ascii=False, indent=2)

print("DONE ->", OUT_DIR)
