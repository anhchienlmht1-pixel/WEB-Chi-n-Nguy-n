"""Xuất dữ liệu ngành chứng khoán từ file Excel tổng hợp (File Chứng khoán Q3-2026).

Đọc sheet báo cáo tài chính của từng CTCK (mỗi sheet một mã, dòng = khoản mục,
cột = quý) và tính lại các chỉ số đúng theo công thức trong sheet "Dữ liệu Chung"
(cùng số dòng khoản mục). Riêng các tỷ lệ theo quý (ROA, ROE, chi phí vốn) được
quy năm bằng cách nhân 4 để so sánh với lãi suất cho vay margin (vốn đã quy năm).

Ghi ra:
  client/public/data/securities/sector.json   bảng ngành, quy mô, thị phần, tăng vốn
  client/public/data/securities/detail/<MÃ>.json   chuỗi theo quý cho trang mã

Chạy: python3 -I scripts/export_securities.py <file.xlsm>
"""

import json
import math
import os
import sys

import openpyxl

SYMS = ["SSI", "VND", "HCM", "VCI", "VIX", "MBS", "FTS", "SHS", "BSI", "DSE", "CTS",
        "VDS", "ORS", "VCK", "VPX", "TCX", "LPS", "KAI"]
# Nhóm theo sheet "Tổng quan" của file; LPS, KAI không có trong sheet đó.
GROUP = {s: "Cho vay margin" for s in ["SSI", "HCM", "MBS", "FTS", "BSI", "DSE", "CTS", "VCK", "VPX", "TCX"]}
GROUP.update({s: "Tự doanh" for s in ["VND", "VCI", "VIX", "SHS", "VDS", "ORS"]})
GROUP.update({"LPS": "Khác", "KAI": "Khác"})

# Số dòng khoản mục trong sheet từng CTCK (giống hàm Indexs trong file).
R = dict(
    fvtpl=8, htm=9, loans=10, afs=11, tts=91, liab=92, stBorrow=94, ffBorrow=97, sfBorrow=100,
    repo=119, eq=142, charter=144, nci=162, shares=176,
    revFvtpl=219, revHtm=223, revLoan=224, revAfs=225, revBroker=227, rev=237,
    lossFvtpl=239, lossHtm=243, lossAfs=245, costProp=248, costBroker=249, gross=257,
    interest=265, pbt=273, pat=279, patParent=280, tradeValue=564, margin=615,
)

FIRST_Q = "Q1 2022"  # chuỗi trên trang mã bắt đầu từ quý này


def num(x):
    if isinstance(x, (int, float)) and not (isinstance(x, float) and math.isnan(x)):
        return float(x)
    return None


def div(a, b):
    if a is None or b is None or b == 0:
        return None
    return a / b


def main(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    header = next(wb["SSI"].iter_rows(min_row=2, max_row=2, values_only=True))
    qcols = [(i, h) for i, h in enumerate(header) if isinstance(h, str) and h.startswith("Q")]
    quarters = [h for _, h in qcols]
    nq = len(quarters)

    raw = {}
    for s in SYMS:
        rows = list(wb[s].iter_rows(min_row=1, max_row=620, values_only=True))
        raw[s] = {k: [num(rows[r - 1][i]) for i, _ in qcols] for k, r in R.items()}

    def metrics(s):
        d = raw[s]
        z = lambda k, i: d[k][i] if d[k][i] is not None else 0.0
        est = {}  # quý -> các chỉ số tạm tính (ước tính)
        out = {k: [None] * nq for k in [
            "roe", "roa", "pbtMargin", "grossMargin", "brokerMargin", "brokerShare", "takeRate",
            "marginYield", "fundingCost", "spread", "marginGrowth", "marginToEq", "propToEq",
            "propToAssets", "propProfit", "propProfitShare", "propRev", "leverage", "revYoy", "pbtYoy",
            "prop", "borrow", "brokerProfit", "revOther", "bvps"]}
        for i in range(nq):
            eq, eq0 = d["eq"][i], d["eq"][i - 1] if i else None
            tts, tts0 = d["tts"][i], d["tts"][i - 1] if i else None
            rev = d["rev"][i]
            prop = z("fvtpl", i) + z("htm", i) + z("afs", i)
            borrow = z("stBorrow", i) + z("ffBorrow", i) + z("sfBorrow", i) + z("repo", i)
            propRev = z("revFvtpl", i) + z("revHtm", i) + z("revAfs", i)
            propProfit = propRev + z("lossFvtpl", i) + z("lossHtm", i) + z("lossAfs", i) + z("costProp", i)
            o = out
            o["prop"][i] = prop
            o["borrow"][i] = borrow
            o["propRev"][i] = propRev
            o["propProfit"][i] = propProfit
            o["brokerProfit"][i] = z("revBroker", i) + z("costBroker", i)
            seg = sum(z(k, i) for k in ["revFvtpl", "revHtm", "revLoan", "revAfs", "revBroker"])
            o["revOther"][i] = rev - seg if rev is not None else None
            if eq is not None and eq0 is not None and eq + eq0:
                o["roe"][i] = div(d["patParent"][i], (eq + eq0) / 2) * 4 if d["patParent"][i] is not None else None
            if tts is not None and tts0 is not None and tts + tts0:
                o["roa"][i] = div(d["pat"][i], (tts + tts0) / 2) * 4 if d["pat"][i] is not None else None
            o["pbtMargin"][i] = div(d["pbt"][i], rev)
            o["grossMargin"][i] = div(d["gross"][i], rev)
            if d["revBroker"][i]:
                o["brokerMargin"][i] = div(o["brokerProfit"][i], d["revBroker"][i])
            o["brokerShare"][i] = div(d["revBroker"][i], rev)
            o["takeRate"][i] = div(d["revBroker"][i], d["tradeValue"][i])
            my = div(d["revLoan"][i], d["loans"][i])
            # Chi phí lãi vay bằng 0 (CTCK hạch toán lãi vay ở khoản khác) → không tính.
            fc = div(-z("interest", i), borrow) if borrow and z("interest", i) else None
            o["marginYield"][i] = my * 4 if my is not None else None
            o["fundingCost"][i] = fc * 4 if fc is not None else None
            if my is not None and fc is not None:
                o["spread"][i] = (my - fc) * 4
            if i and d["margin"][i - 1] and d["margin"][i] is not None:
                o["marginGrowth"][i] = div(d["margin"][i], d["margin"][i - 1]) - 1
            elif i and d["loans"][i - 1] and d["loans"][i] is not None and (d["margin"][i] is None or not d["margin"][i - 1]):
                # Thiếu dư nợ margin (thuyết minh chưa có): tạm tính theo tổng cho vay
                # (margin + ứng trước), đánh dấu là ước tính.
                o["marginGrowth"][i] = div(d["loans"][i], d["loans"][i - 1]) - 1
                est.setdefault(i, set()).add("marginGrowth")
            o["marginToEq"][i] = div(d["loans"][i], eq)
            o["propToEq"][i] = div(prop, eq)
            o["propToAssets"][i] = div(prop, tts)
            o["propProfitShare"][i] = div(propProfit, d["gross"][i]) if d["gross"][i] else None
            o["leverage"][i] = div(tts, eq)
            if i >= 4:
                if d["rev"][i - 4]:
                    o["revYoy"][i] = div(rev, d["rev"][i - 4]) - 1 if rev is not None else None
                if d["pbt"][i - 4] and d["pbt"][i] is not None:
                    o["pbtYoy"][i] = (d["pbt"][i] - d["pbt"][i - 4]) / abs(d["pbt"][i - 4])
            sh = d["shares"][i]
            o["bvps"][i] = div(eq, sh) if sh else None  # nghìn đồng/cp? (eq tỷ / cp tỷ) = đồng
        out["_est"] = est
        return out

    M = {s: metrics(s) for s in SYMS}

    # ---------------------------------------------------------------- bảng ngành
    li = nq - 1
    yi = li - 4
    table_keys = ["roe", "roa", "pbtMargin", "brokerMargin", "brokerShare", "takeRate", "marginYield",
                  "fundingCost", "spread", "marginGrowth", "marginToEq", "propToEq", "propProfitShare",
                  "leverage", "revYoy", "pbtYoy"]
    as_ratio = {"leverage", "marginToEq", "propToEq"}  # lần

    def val(s, k, i):
        v = M[s][k][i]
        if v is None:
            return None
        return round(v if k in as_ratio else v * 100, 4)

    rows = []
    for s in SYMS:
        rows.append({
            "sym": s,
            "group": GROUP[s],
            "v": {k: val(s, k, li) for k in table_keys},
            "p": {k: val(s, k, yi) for k in table_keys},
            **({"est": sorted(M[s]["_est"][li])} if li in M[s]["_est"] else {}),
        })

    def r2(x):
        return None if x is None else round(x, 3)

    scale = []
    for s in SYMS:
        d = raw[s]
        scale.append({
            "sym": s,
            "tts": r2(d["tts"][li]), "eq": r2(d["eq"][li]), "charter": r2(d["charter"][li]),
            "margin": r2(d["margin"][li]), "loans": r2(d["loans"][li]), "prop": r2(M[s]["prop"][li]),
            "borrow": r2(M[s]["borrow"][li]),
            "rev": r2(d["rev"][li]), "pbt": r2(d["pbt"][li]), "pat": r2(d["pat"][li]),
            "pbtPrev": r2(d["pbt"][yi]), "patPrev": r2(d["pat"][yi]),
            "revBroker": r2(d["revBroker"][li]), "revLoan": r2(d["revLoan"][li]), "propRev": r2(M[s]["propRev"][li]),
            "marginPrev": r2(d["margin"][yi]), "ttsPrev": r2(d["tts"][yi]),
        })

    # Thị phần môi giới HOSE (sheet "Thị phần"): theo năm (cột B–I) và theo quý (cột K–S).
    ws = wb["Thị phần"]
    tp = list(ws.iter_rows(values_only=True))
    head = tp[0]
    years = [str(h) for h in head[1:9]]
    qlabels = [str(h) for h in head[10:19]]
    share = []
    for r in tp[1:]:
        if not r[0] or str(r[0]).startswith("Tổng"):
            continue
        share.append({
            "name": str(r[0]).strip(),
            "years": [r2(num(x) * 100) if num(x) is not None else None for x in r[1:9]],
            "quarters": [r2(num(x) * 100) if num(x) is not None else None for x in r[10:19]],
        })
    total_row = next(r for r in tp if r[0] and str(r[0]).startswith("Tổng"))
    share_total = {
        "years": [r2(num(x) * 100) if num(x) is not None else None for x in total_row[1:9]],
        "quarters": [r2(num(x) * 100) if num(x) is not None else None for x in total_row[10:19]],
    }

    # Kế hoạch tăng vốn
    ws = wb["Kế hoạch tăng vốn"]
    plans = []
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if not r[0] or str(r[0]).startswith("Tổng"):
            continue
        plans.append({
            "sym": str(r[0]).strip(), "method": r[1], "pct": r2(num(r[2]) * 100) if num(r[2]) is not None else None,
            "shares": r2(num(r[3])), "value": r2(num(r[4])), "status": r[5],
        })

    out_dir = os.path.join(os.path.dirname(__file__), "..", "client", "public", "data", "securities")
    os.makedirs(os.path.join(out_dir, "detail"), exist_ok=True)
    sector = {
        "period": quarters[li], "periodPrev": quarters[yi], "rows": rows, "scale": scale,
        "share": {"years": years, "quarters": qlabels, "rows": share, "total": share_total},
        "capitalPlans": plans,
    }
    with open(os.path.join(out_dir, "sector.json"), "w", encoding="utf-8") as f:
        json.dump(sector, f, ensure_ascii=False, separators=(",", ":"))

    # ---------------------------------------------------------------- chi tiết từng mã
    start = quarters.index(FIRST_Q)
    detail_keys = {
        "raw": ["tts", "eq", "margin", "loans", "fvtpl", "htm", "afs", "rev", "revFvtpl", "revHtm", "revLoan",
                "revAfs", "revBroker", "pbt", "pat", "interest", "tradeValue", "gross"],
        "calc": ["roe", "roa", "pbtMargin", "brokerMargin", "brokerShare", "takeRate", "marginYield", "fundingCost",
                 "spread", "marginToEq", "propToEq", "propProfit", "propProfitShare", "propRev", "leverage", "revYoy",
                 "pbtYoy", "prop", "borrow", "brokerProfit", "revOther"],
    }
    ind_keys = ["roe", "roa", "pbtMargin", "brokerMargin", "marginYield", "fundingCost", "spread", "propToEq",
                "propProfitShare", "leverage", "takeRate"]
    industry = {}
    for k in ind_keys:
        arr = []
        for i in range(start, nq):
            xs = [M[s][k][i] for s in SYMS if M[s][k][i] is not None]
            # Trung vị (không dùng trung bình): vài CTCK quy mô rất nhỏ làm trung bình nhảy vọt.
            xs.sort()
            n = len(xs)
            arr.append((xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2) if xs else None)
        industry[k] = [None if v is None else round(v, 5) for v in arr]
    share_by = {r["name"]: r for r in share}
    for s in SYMS:
        series = {}
        for k in detail_keys["raw"]:
            series[k] = [r2(x) for x in raw[s][k][start:]]
        for k in detail_keys["calc"]:
            series[k] = [None if x is None else round(x, 5) for x in M[s][k][start:]]
        det = {
            "symbol": s, "group": GROUP[s], "quarters": quarters[start:], "series": series, "industry": industry,
            "share": share_by.get(s), "shareQuarters": qlabels
        }
        with open(os.path.join(out_dir, "detail", f"{s}.json"), "w", encoding="utf-8") as f:
            json.dump(det, f, ensure_ascii=False, separators=(",", ":"))
    print("ok", quarters[li], len(SYMS), "CTCK")


if __name__ == "__main__":
    main(sys.argv[1])
