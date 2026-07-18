"""Exports the "27 banks" .xlsm workbook's "Dữ liệu Chung" and per-bank
sheets into the static JSON files the bank detail dashboard (the
"Chi tiết mã ngân hàng" section) reads at
client/public/data/banks/detail/ — companion to export-bank-data.py, which
covers the 14-core-ratio "Cơ bản" section instead.

Usage:
    python3 scripts/export-bank-detail.py path/to/File_27_Ngan_hang.xlsm

Requires openpyxl (`pip install openpyxl`).

Every series here traces to one of two sources in the workbook, both
reverse-engineered from the "Dữ liệu Biểu đồ Ngân hàng" sheet's actual
formulas (not guessed) and cross-checked against that sheet's own cached
values for NAB:
  - ROW-BASED: a specific row number in the selected bank's own sheet
    (same 341-row template as export-bank-data.py uses), read directly —
    extendable to yearly by reading the year columns (B:I) instead of the
    quarterly ones (K:AQ), same as export-bank-data.py already does for
    the 14 core ratios.
  - LABEL-BASED (via "Dữ liệu Chung"): a pre-computed ratio block, laid
    out as one label row + 27 bank rows (fixed order, matching BANKS
    below) + a "TB Nganh" industry-average row
    (=AGGREGATE(1,6,...), i.e. plain mean ignoring errors) + a blank row,
    repeated per metric — this table is NOT tied to whichever bank the
    workbook's own dropdown was last set to, so it can be read once for
    every bank and metric in a single pass. It only has quarterly columns
    (Q1 2018..Q1 2026), no yearly ones, and the underlying formulas for a
    handful of these (Nợ nhóm 2/dưới TC/nghi ngờ/mất vốn %, Nợ xấu hình
    thành mới %, Trích lập/Cho vay %, SMLR %, and the 5 sector-loan %
    series) aren't independently derivable from the raw statement rows —
    for the yearly view those use the Q4-of-year quarterly value as an
    end-of-year snapshot (a standard convention for stock-type ratios;
    "hình thành mới"/"Trích lập" are flow ratios so this is an
    approximation for those two specifically, not the deliberate stock
    snapshot it is for the others — flagged in code below).

If a future version of the workbook reorders rows, adds/removes bank
sheets, or changes the "Dữ liệu Chung" block layout, this script's row
numbers and DC_LABELS need re-deriving from that sheet's formulas again.
"""

import json
import math
import os
import sys
import openpyxl
from openpyxl.utils import column_index_from_string

SRC = sys.argv[1] if len(sys.argv) > 1 else "File_27_Ngan_hang.xlsm"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "client/public/data/banks/detail")
os.makedirs(OUT_DIR, exist_ok=True)

wb = openpyxl.load_workbook(SRC, data_only=True, keep_vba=True)

formula_ws = wb["Công thức"]
BANKS = []
for r in range(2, 29):
    symbol = formula_ws.cell(row=r, column=2).value
    if symbol:
        BANKS.append(symbol)
print(f"{len(BANKS)} banks:", BANKS)

QUARTER_COLS = list(range(column_index_from_string("K"), column_index_from_string("AQ") + 1))
YEAR_COLS = [column_index_from_string(c) for c in ["B", "C", "D", "E", "F", "G", "H", "I"]]
YEAR_LABELS = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]


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


def add(cur, other):
    if cur is None and other is None:
        return None
    return (cur or 0) + (other or 0)


def sub(a, b):
    if a is None or b is None:
        return None
    return a - b


def shares(*series_list):
    """Per-index share of each series relative to their sum; an entire
    period is null (not just zeroed) if any component is missing, since a
    partial stack would misrepresent the composition rather than just
    omitting a bar."""
    n = len(series_list[0])
    out = [[] for _ in series_list]
    for i in range(n):
        vals = [s[i] for s in series_list]
        if any(v is None for v in vals):
            for o in out:
                o.append(None)
            continue
        total = sum(vals)
        for j, v in enumerate(vals):
            out[j].append(safe_div(v, total))
    return out


# ---- "Dữ liệu Chung" sheet: a flat table of 48 pre-computed ratio blocks,
# each block = 1 label row + 27 bank rows (same order as BANKS) + 1 "TB
# Nganh" row + 1 blank row = 30 rows/block, all on 33 quarterly columns
# (Q1 2018..Q1 2026), bank-agnostic (not tied to the workbook's own
# dropdown selection).
dc_ws = wb["Dữ liệu Chung"]
DC_QUARTER_COLS = list(range(2, 35))  # B..AH, 33 quarters


def dc_block_row(label: str) -> int:
    r = 1
    while r <= dc_ws.max_row:
        if dc_ws.cell(row=r, column=1).value == label:
            return r
        r += 30
    raise ValueError(f"block not found: {label}")


def dc_series(label: str, bank_index: int | None) -> list:
    start = dc_block_row(label)
    row = start + 28 if bank_index is None else start + 1 + bank_index
    return [num(dc_ws.cell(row=row, column=c).value) for c in DC_QUARTER_COLS]


DC_LABELS = [
    "npl2", "Nợ nhóm 2 (%)",
    "npl3", "Nợ dưới tiêu chuẩn (%)",
    "npl4", "Nợ nghi ngờ (%)",
    "npl5", "Nợ có khả năng mất vốn (%)",
    "newNplFormation", "Nợ xấu hình thành mới (%)",
    "provisionToLoan", "Trích lập/Cho vay (%)",
    "smlr", "SMLR (%)",
    "sectorTrade", "Cho vay Thương mại (%)",
    "sectorMfg", "Cho vay Sản xuất (%)",
    "sectorConstruction", "Cho vay Xây dựng (%)",
    "sectorService", "Cho vay Dịch vụ cộng đồng và cá nhân (%)",
    "sectorRealEstate", "Cho vay Bất động sản và tư vấn (%)",
]
DC_MAP = dict(zip(DC_LABELS[0::2], DC_LABELS[1::2]))
DC_ONLY_KEYS = list(DC_MAP.keys())  # no independent yearly derivation — Q4-snapshot for the year view

# Year-to-date (từ đầu năm) growth at quarterly granularity — resets each
# Q1, per the source workbook's own convention (verified against cached
# values: monotonically climbs within a year then drops back down at Q1).
# Independently derivable for the yearly view (a full year's YTD growth
# *is* that year's YoY growth), so these are fetched separately from
# DC_MAP/DC_ONLY_KEYS rather than Q4-snapshotted.
DC_GROWTH_MAP = {"creditGrowth": "Tăng trưởng tín dụng (%)", "depositGrowth": "Tăng trưởng tiền gửi (%)"}


class BankSheet:
    def __init__(self, ws):
        self.ws = ws

    def row(self, r, col_idx):
        return num(self.ws.cell(row=r, column=col_idx).value)


def compute_bank_series(sheet: BankSheet, cols: list, is_quarterly: bool, bank_index: int) -> dict:
    n = len(cols)

    def r(row_num, i):
        return sheet.row(row_num, cols[i]) if 0 <= i < n else None

    def r_sum4(row_num, i):
        if not is_quarterly or i - 3 < 0:
            return None
        vals = [r(row_num, k) for k in range(i - 3, i + 1)]
        return None if any(v is None for v in vals) else sum(vals)

    def series(row_num):
        return [r(row_num, i) for i in range(n)]

    def prev_index(i):
        return i - 4 if is_quarterly else i - 1

    lag = 4 if is_quarterly else 1

    s = {}

    # Core ratios — same formulas as export-bank-data.py's annual vs.
    # quarterly branches (roe4q/roa4q collapse to the single-period
    # roe/roa once a period already spans a full year).
    nim, cof, casa, ldr, cir, roe4q, roa4q = [], [], [], [], [], [], []
    for i in range(n):
        totalAssets, loans, deposits, equity = r(3, i), r(14, i), r(57, i), r(66, i)
        toi_v, opex = r(107, i), r(108, i)
        f55, f60, r54v = r(55, i), r(60, i), r(54, i)
        casa.append(safe_div(r(243, i), deposits))
        funding = (f55 + deposits + f60) if None not in (f55, deposits, f60) else None
        ldr.append(safe_div(loans, funding))
        cir.append(safe_div(-opex if opex is not None else None, toi_v))

        earning_assets = None
        e6, e10, e14, e20 = r(6, i), r(10, i), r(14, i), r(20, i)
        if None not in (e6, e10, e14, e20):
            earning_assets = e6 + e10 + e14 + e20
        earning_assets_prev1 = None
        if i - 1 >= 0:
            p6, p10, p14, p20 = r(6, i - 1), r(10, i - 1), r(14, i - 1), r(20, i - 1)
            if None not in (p6, p10, p14, p20):
                earning_assets_prev1 = p6 + p10 + p14 + p20
        ea_avg1 = (
            (earning_assets + earning_assets_prev1) / 2.0
            if earning_assets is not None and earning_assets_prev1 is not None
            else None
        )
        funding_cof = r54v + deposits + f60 if None not in (r54v, deposits, f60) else None
        funding_cof_prev1 = None
        if i - 1 >= 0:
            p54, p57, p60 = r(54, i - 1), r(57, i - 1), r(60, i - 1)
            if None not in (p54, p57, p60):
                funding_cof_prev1 = p54 + p57 + p60
        funding_cof_avg1 = (
            (funding_cof + funding_cof_prev1) / 2.0
            if funding_cof is not None and funding_cof_prev1 is not None
            else None
        )
        r96 = r(96, i)

        if is_quarterly:
            nii_4q = r_sum4(94, i)
            r96_4q = r_sum4(96, i)
            nim.append(safe_div(nii_4q, ea_avg1))
            cof.append(safe_div(-r96_4q if r96_4q is not None else None, funding_cof_avg1))
        else:
            nim.append(safe_div(r(94, i), ea_avg1))
            cof.append(safe_div(-r96 if r96 is not None else None, funding_cof_avg1))

        if is_quarterly:
            equity_prev = r(66, i - 4) if i - 4 >= 0 else None
            assets_prev = r(3, i - 4) if i - 4 >= 0 else None
            netProfit_period = r_sum4(115, i)
        else:
            equity_prev = r(66, i - 1) if i - 1 >= 0 else None
            assets_prev = r(3, i - 1) if i - 1 >= 0 else None
            netProfit_period = r(115, i)
        equity_avg = (equity + equity_prev) / 2.0 if equity is not None and equity_prev is not None else None
        assets_avg = (totalAssets + assets_prev) / 2.0 if totalAssets is not None and assets_prev is not None else None
        roe4q.append(safe_div(netProfit_period, equity_avg))
        roa4q.append(safe_div(netProfit_period, assets_avg))

    s["nim"], s["cof"], s["casa"], s["ldr"], s["cir"] = nim, cof, casa, ldr, cir
    s["roe4q"], s["roa4q"] = roe4q, roa4q

    # NII / TOI / PBT / income structure
    nii = series(94)
    toi = series(107)
    opex = [(-v if v is not None else None) for v in series(108)]
    pbt = series(111)
    provisionExpense = series(110)
    nonii = [sub(t, x) for t, x in zip(toi, nii)]
    s["nii"], s["toi"], s["nonii"], s["pbt"] = nii, toi, nonii, pbt
    s["operatingExpense"], s["provisionExpense"] = opex, provisionExpense
    s["provisionToToi"] = [safe_div(p, t) for p, t in zip(provisionExpense, toi)]
    s["niiShare"] = [safe_div(a, b) for a, b in zip(nii, toi)]
    s["noniiShare"] = [safe_div(a, b) for a, b in zip(nonii, toi)]
    s["niiGrowth"] = [growth(nii[i], nii[i - lag]) if i >= lag else None for i in range(n)]
    s["noniiGrowth"] = [growth(nonii[i], nonii[i - lag]) if i >= lag else None for i in range(n)]
    s["toiGrowth"] = [growth(toi[i], toi[i - lag]) if i >= lag else None for i in range(n)]

    # Non-interest income composition (absolute). "Kinh doanh & Đầu tư
    # Chứng khoán" is trading-securities gains (row 101) PLUS
    # investment-securities gains (row 102) combined, per the source
    # formula — not row 101 alone.
    s["feeIncome"] = series(97)
    s["fxIncome"] = series(100)
    s["securitiesIncome"] = [add(a, b) for a, b in zip(series(101), series(102))]
    s["otherIncome"] = series(103)

    # Funding (huy động). The interbank component uses row 55 ("Tiền gửi
    # của các TCTD khác", deposits only) in the source's quarterly branch —
    # narrower than the row-54 "Tiền gửi VÀ VAY các TCTD khác" used for the
    # COF calc in the 14-core-metric export, which is a distinct concept.
    depositsCustomer = series(57)
    depositsInterbank = series(55)
    valuablePapers = series(60)
    s["depositsCustomer"], s["depositsInterbank"], s["valuablePapers"] = (
        depositsCustomer, depositsInterbank, valuablePapers,
    )
    s["depositsCustomerShare"], s["depositsInterbankShare"], s["valuablePapersShare"] = shares(
        depositsCustomer, depositsInterbank, valuablePapers
    )

    # Period-over-period growth per funding component — QoQ at quarterly
    # granularity (matching the source's "Tăng trưởng huy động từng mảng"
    # chart) or YoY once the period itself is a full year.
    def pop(vals):
        return [growth(vals[i], vals[i - 1]) if i >= 1 else None for i in range(n)]

    s["depositsCustomerGrowthQoQ"] = pop(depositsCustomer)
    s["depositsInterbankGrowthQoQ"] = pop(depositsInterbank)
    s["valuablePapersGrowthQoQ"] = pop(valuablePapers)
    fundingTotal = [add(add(a, b), c) for a, b, c in zip(depositsCustomer, depositsInterbank, valuablePapers)]
    s["fundingGrowth"] = pop(fundingTotal)

    # Credit by customer segment / term. "Tín dụng KHDN" is row 206 (loans
    # by customer-group total) MINUS row 211 (personal), per the source
    # formula — row 206 alone is not corporate credit.
    grossLoans = series(15)
    loansPersonal = series(211)
    loansCorporate = [sub(a, b) for a, b in zip(series(206), series(211))]
    s["loansPersonal"], s["loansCorporate"] = loansPersonal, loansCorporate
    loansOther = [sub(g, add(p, c)) for g, p, c in zip(grossLoans, loansPersonal, loansCorporate)]
    s["loansPersonalShare"], s["loansCorporateShare"], s["loansOtherShare"] = shares(
        loansPersonal, loansCorporate, loansOther
    )

    # creditGrowth / depositGrowth: YTD (từ đầu năm) at quarterly
    # granularity, from "Dữ liệu Chung" (see DC_MAP below); once a period
    # is itself a full year, YTD growth *is* the year's own YoY growth, so
    # derive it directly from the year-column gross-loan/deposit levels.
    if not is_quarterly:
        s["creditGrowth"] = [growth(grossLoans[i], grossLoans[i - 1]) if i >= 1 else None for i in range(n)]
        s["depositGrowth"] = [growth(depositsCustomer[i], depositsCustomer[i - 1]) if i >= 1 else None for i in range(n)]

    loansShort = series(194)
    loansMedium = series(195)
    loansLong = series(196)
    s["loansShortTerm"], s["loansMediumTerm"], s["loansLongTerm"] = loansShort, loansMedium, loansLong
    s["loansShortTermShare"], s["loansMediumTermShare"], s["loansLongTermShare"] = shares(
        loansShort, loansMedium, loansLong
    )

    # Asset quality
    s["npl2Abs"], s["npl3Abs"], s["npl4Abs"], s["npl5Abs"] = series(189), series(190), series(191), series(192)

    # Investment portfolio
    govBonds = [add(a, b) for a, b in zip(series(216), series(217))]
    creditInstBonds = series(218)
    corpBonds = series(219)
    s["investGovBonds"], s["investCreditInst"], s["investCorpBonds"] = govBonds, creditInstBonds, corpBonds
    s["investGovBondsShare"], s["investCreditInstShare"], s["investCorpBondsShare"] = shares(
        govBonds, creditInstBonds, corpBonds
    )

    # Earning-assets composition
    earningLoan, earningInterbank, earningInvestment, earningOther = series(15), series(8), series(20), series(7)
    s["earningAssetsLoan"], s["earningAssetsInterbank"], s["earningAssetsInvestment"], s["earningAssetsOther"] = (
        earningLoan, earningInterbank, earningInvestment, earningOther,
    )
    s["earningAssetsLoanShare"], s["earningAssetsInterbankShare"], s["earningAssetsInvestmentShare"], s[
        "earningAssetsOtherShare"
    ] = shares(earningLoan, earningInterbank, earningInvestment, earningOther)

    # Interest-bearing-liabilities composition (same 3 components as funding)
    s["liabDepositsShare"], s["liabInterbankShare"], s["liabPapersShare"] = shares(
        depositsCustomer, depositsInterbank, valuablePapers
    )

    # Equity & liabilities structure (Vốn chủ & Nợ phải trả). "Nghĩa vụ
    # phải trả khác" is a residual: total assets minus customer deposits
    # minus equity — i.e. total liabilities minus deposits, via the
    # assets = liabilities + equity identity — per the validated source
    # formula (=TotalAssets - B144(deposits) - B146(equity)), not a direct
    # row reference.
    totalAssetsSeries = series(3)
    equitySeries = series(66)
    capitalOtherLiab = [
        sub(sub(t, d), e) for t, d, e in zip(totalAssetsSeries, depositsCustomer, equitySeries)
    ]
    s["capitalDeposits"], s["capitalOtherLiab"], s["capitalEquity"] = (
        depositsCustomer, capitalOtherLiab, equitySeries,
    )
    s["capitalDepositsShare"], s["capitalOtherLiabShare"], s["capitalEquityShare"] = shares(
        depositsCustomer, capitalOtherLiab, equitySeries
    )

    # Deposit structure
    depositsDemand = series(243)
    depositsTerm = series(244)
    depositsMargin = series(246)
    depositsOther = [
        sub(t, add(add(a, b), c)) for t, a, b, c in zip(depositsCustomer, depositsDemand, depositsTerm, depositsMargin)
    ]
    s["depositsDemand"], s["depositsTerm"], s["depositsMargin"], s["depositsOther"] = (
        depositsDemand, depositsTerm, depositsMargin, depositsOther,
    )

    # Provisions (balance-sheet impairment allowances; source rows are
    # negative/contra-asset, negated here to plot as positive magnitudes).
    def neg(vals):
        return [(-v if v is not None else None) for v in vals]

    s["provisionInterbank"] = neg(series(9))
    s["provisionTrading"] = neg(series(12))
    s["provisionLoan"] = neg(series(16))
    s["provisionInvestment"] = neg(series(23))
    s["provisionLongTerm"] = neg(series(30))

    if is_quarterly:
        # From "Dữ liệu Chung" (bank-agnostic, same 33 quarters). The
        # DC_ONLY_KEYS metrics have no independent yearly formula — the
        # caller Q4-snapshots these quarterly values for the year view.
        for key, label in DC_MAP.items():
            s[key] = dc_series(label, bank_index)
        for key, label in DC_GROWTH_MAP.items():
            s[key] = dc_series(label, bank_index)
        s["creditDepositGap"] = [sub(a, b) for a, b in zip(s["creditGrowth"], s["depositGrowth"])]
    else:
        s["creditDepositGap"] = [sub(a, b) for a, b in zip(s["creditGrowth"], s["depositGrowth"])]

    return s


all_quarter_series = {}
all_year_series = {}
quarter_periods = None

for bank_index, symbol in enumerate(BANKS):
    if symbol not in wb.sheetnames:
        print("MISSING SHEET:", symbol)
        continue
    ws = wb[symbol]
    sheet = BankSheet(ws)
    quarter_periods = [ws.cell(row=2, column=c).value for c in QUARTER_COLS]

    q = compute_bank_series(sheet, QUARTER_COLS, True, bank_index)

    # Q4-of-year snapshot lookup for the DC-only, quarter-only metrics —
    # built once per bank from its own just-computed quarterly series.
    q4_index_by_year = {yr: quarter_periods.index(f"Q4 {yr}") for yr in YEAR_LABELS if f"Q4 {yr}" in quarter_periods}
    y = compute_bank_series(sheet, YEAR_COLS, False, bank_index)
    for key in DC_ONLY_KEYS:
        y[key] = [q[key][q4_index_by_year[yr]] if yr in q4_index_by_year else None for yr in YEAR_LABELS]

    all_quarter_series[symbol] = q
    all_year_series[symbol] = y

# Industry averages (simple mean across the 27 banks, ignoring nulls) for
# the "so sánh với TB ngành" charts — matches the source workbook's own
# =AGGREGATE(1,6,...) definition of "TB Nganh".
def industry_avg(all_series, key, n):
    out = []
    for i in range(n):
        vals = [all_series[b][key][i] for b in BANKS if b in all_series and all_series[b][key][i] is not None]
        out.append(sum(vals) / len(vals) if vals else None)
    return out


INDUSTRY_KEYS = ["nim", "casa", "cir", "cof", "roe4q", "roa4q", "ldr"]
quarter_industry = {k: industry_avg(all_quarter_series, k, len(quarter_periods)) for k in INDUSTRY_KEYS}
year_industry = {k: industry_avg(all_year_series, k, len(YEAR_LABELS)) for k in INDUSTRY_KEYS}

for symbol in BANKS:
    if symbol not in all_quarter_series:
        continue
    out = {
        "symbol": symbol,
        "quarter": {"periods": quarter_periods, "industry": quarter_industry, "bank": all_quarter_series[symbol]},
        "year": {"periods": YEAR_LABELS, "industry": year_industry, "bank": all_year_series[symbol]},
    }
    with open(f"{OUT_DIR}/{symbol}.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(symbol, "done")

print("DONE ->", OUT_DIR)
