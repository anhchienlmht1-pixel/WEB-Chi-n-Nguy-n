"""Xuất dữ liệu ngành bất động sản từ file Excel tổng hợp (File Bất động sản Q3-2026).

Đọc nguyên số trong file (không tính lại):
  - sheet "BDS": 6 chỉ tiêu theo quý từ Q1/2022 (người mua trả tiền trước, hàng tồn kho,
    nợ vay/VCSH, phải thu/TTS, tiền + đầu tư ngắn hạn/TTS, hàng tồn kho/TTS) và cờ đạt/không
    đạt 4 tiêu chí an toàn tài chính ở cột cuối.
  - sheet "Dữ liệu Quý": 26 khoản mục/tỷ lệ, Q4/2024 – Q3/2026.
  - sheet "Các dự án bàn giao 2026 - 2028".
  - sheet từng chủ đầu tư: hàng tồn kho theo dự án và danh sách dự án.

Ghi ra client/public/data/realestate/sector.json và detail/<MÃ>.json.
Chạy: python3 -I scripts/export_realestate.py <file.xlsx>
"""

import json
import os
import sys

import openpyxl

SYMS = ["VHM", "NVL", "KDH", "NLG", "DXG", "PDR", "DIG", "TCH", "CEO", "HDC", "HDG", "IDJ", "NTL"]


def num(x):
    return float(x) if isinstance(x, (int, float)) and x == x else None


def r(x, d=4):
    return None if x is None else round(x, d)


def blocks(rows, width):
    """Các khối [tiêu đề, (mã → giá trị)] trong sheet dạng: dòng tiêu đề, (dòng quý), 13 dòng mã."""
    out = {}
    title = None
    for row in rows:
        a = row[0]
        if a is None:
            continue
        a = str(a).strip()
        if a in SYMS and title:
            out[title][a] = row
        elif a not in SYMS:
            title = a
            out[title] = {}
    return out


def main(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

    # ---------------------------------------------------------------- BDS (Q1/2022 → Q3/2026)
    rows = list(wb["BDS"].iter_rows(values_only=True))
    years = rows[0]
    qrow = rows[1]
    long_q, y = [], None
    for i in range(1, 20):
        y = years[i] or y
        long_q.append(f"{str(qrow[i]).strip()} {y}")
    b = blocks(rows, 20)
    KEYS = {
        "Người mua trả tiền trước": "prepaid",
        "Hàng tồn kho": "inventory",
        "Nợ vay/VCSH": "debtToEq",
        "(Phải thu ngắn + dài)/Tổng tài sản": "recvToAssets",
        "(Tiền mặt + đầu tư ngắn hạn)/Tổng tài sản": "cashToAssets",
        "Hàng tồn kho/Tổng tài sản": "invToAssets",
    }
    CRIT = {"debtToEq": "debt", "recvToAssets": "recv", "cashToAssets": "cash", "invToAssets": "land"}
    criteria_text = {}
    long_series = {s: {} for s in SYMS}
    flags = {s: {} for s in SYMS}
    for title, k in KEYS.items():
        blk = b[title]
        for s in SYMS:
            row = blk.get(s)
            if not row:
                continue
            long_series[s][k] = [r(num(v)) for v in row[1:20]]
            if k in CRIT and len(row) > 20 and num(row[20]) is not None:
                flags[s][CRIT[k]] = int(num(row[20]))
    for i in [32, 48, 64, 80]:
        crit = {32: "debt", 48: "recv", 64: "cash", 80: "land"}[i]
        criteria_text[crit] = str(rows[i][20]).strip() if rows[i][20] else ""

    # ---------------------------------------------------------------- Dữ liệu Quý (Q4/2024 → Q3/2026)
    rows = list(wb["Dữ liệu Quý"].iter_rows(values_only=True))
    short_q = [str(x) for x in rows[0][1:9]]
    QKEYS = {
        "Tiền và tương đương tiền": "cash",
        "Các khoản phải thu": "receivables",
        "Hàng tồn kho": "inventory",
        "Phải thu dài hạn": "ltReceivables",
        "Tài sản cố định": "fixedAssets",
        "NỢ PHẢI TRẢ": "liabilities",
        "Vốn chủ sở hữu": "equity",
        "Nợ ngắn hạn": "stLiabilities",
        "Nợ dài hạn": "ltLiabilities",
        "Người mua trả tiền trước": "prepaid",
        "Phải thu ngắn hạn": "stReceivables",
        "DT chưa thực hiện ngắn hạn": "stUnearned",
        "DT chưa thực hiện dài hạn": "ltUnearned",
        "Vay ngắn hạn": "stDebt",
        "Vay dài hạn": "ltDebt",
        "Doanh thu thuần": "revenue",
        "Lợi nhuận gộp": "grossProfit",
        "Lợi nhuận ròng": "netProfit",
        "Lợi nhuận từ HĐKD": "opProfit",
        "Tăng tưởng người mua trả tiền trước (QoQ)": "prepaidQoq",
        "Tiền mặt/Nợ ngắn hạn": "cashToStLiab",
        "Tổng nợ vay/VCSH": "debtToEq",
        "Nợ phải trả/TTS": "liabToAssets",
        "(Phải thu ngắn + dài)/Tổng tài sản": "recvToAssets",
        "(Tiền mặt + đầu tư ngắn hạn)/Tổng tài sản": "cashToAssets",
        "Hàng tồn kho/Tổng tài sản": "invToAssets",
    }
    qb = blocks(rows, 9)
    short_series = {s: {} for s in SYMS}
    for title, k in QKEYS.items():
        blk = qb.get(title, {})
        for s in SYMS:
            row = blk.get(s)
            if row:
                short_series[s][k] = [r(num(v)) for v in row[1:9]]

    # ---------------------------------------------------------------- dự án bàn giao
    rows = list(wb["Các dự án bàn giao 2026 - 2028"].iter_rows(values_only=True))
    projects, cur = [], None
    for row in rows[1:]:
        if not any(row):
            continue
        cur = (str(row[0]).strip() if row[0] else cur)
        projects.append({
            "sym": cur, "name": (row[1] or "").strip(), "location": (row[2] or "").strip(), "launch": str(row[3] or "").strip(),
            "handover": str(row[4] or "").strip(), "progress": (row[5] or "").strip(),
        })

    # ---------------------------------------------------------------- sheet từng chủ đầu tư
    company = {}
    for s in SYMS:
        if s not in wb.sheetnames:
            continue
        rows = list(wb[s].iter_rows(values_only=True))
        inv_blocks, plist = [], []
        i = 0
        while i < len(rows):
            row = rows[i]
            nxt = rows[i + 1] if i + 1 < len(rows) else None
            if row and row[0] and str(row[0]).strip().upper() == "TÊN DỰ ÁN":
                head = [str(h).strip() for h in row if h is not None]
                for pr in rows[i + 1:]:
                    if not pr or not pr[0]:
                        continue
                    item = {}
                    for h, v in zip(head, pr[: len(head)]):
                        if isinstance(v, (int, float)) and h.upper().startswith("SỞ HỮU"):
                            v = f"{v * 100:.0f}%" if v <= 1 else f"{v:g}"
                        item[h] = "" if v is None else str(v).strip()
                    plist.append(item)
                break
            # khối tồn kho: dòng năm + dòng quý; số bắt đầu ở cột B (hoặc cột C nếu cột B là tên thương mại)
            sc = None
            if nxt:
                for c in (1, 2):
                    if c < len(row) and row[c] is not None and str(row[c]).strip().split(".")[0].isdigit() and nxt[c] and str(nxt[c]).strip().startswith("Q"):
                        sc = c
                        break
            if sc:
                title = str(row[0]).strip() if row[0] and sc == 1 else "Hàng tồn kho theo dự án"
                qs, y = [], None
                for c in range(sc, len(row)):
                    y = row[c] if row[c] is not None else y
                    q = nxt[c]
                    if q is None:
                        break
                    qs.append(f"{str(q).strip()} {int(float(y))}")
                items = []
                j = i + 2
                while j < len(rows) and rows[j] and (rows[j][0] or (sc == 2 and rows[j][1])):
                    name = str(rows[j][sc - 1] or rows[j][0]).strip()
                    if not str(rows[j][0] or "").strip().upper().startswith("TỔNG"):
                        items.append({"name": name, "values": [r(num(v), 2) for v in rows[j][sc : sc + len(qs)]]})
                    j += 1
                inv_blocks.append({"title": title, "quarters": qs, "items": items})
                i = j
                continue
            i += 1
        company[s] = {"inventory": inv_blocks, "projects": plist}

    li = len(long_q) - 1
    rows_out = []
    for s in SYMS:
        ls, ss = long_series[s], short_series[s]
        f = flags[s]
        rows_out.append({
            "sym": s,
            "flags": f,
            "score": sum(f.values()) if f else None,
            "v": {
                "prepaid": ls.get("prepaid", [None])[li], "prepaidPrev": ls.get("prepaid", [None] * 20)[li - 4],
                "prepaidQoq": ls.get("prepaid", [None] * 20)[li - 1],
                "inventory": ls.get("inventory", [None])[li], "inventoryPrev": ls.get("inventory", [None] * 20)[li - 4],
                "debtToEq": ls.get("debtToEq", [None])[li], "recvToAssets": ls.get("recvToAssets", [None])[li],
                "cashToAssets": ls.get("cashToAssets", [None])[li], "invToAssets": ls.get("invToAssets", [None])[li],
                "cashToStLiab": (ss.get("cashToStLiab") or [None])[-1], "liabToAssets": (ss.get("liabToAssets") or [None])[-1],
                "revenue": (ss.get("revenue") or [None])[-1], "revenuePrev": (ss.get("revenue") or [None] * 8)[-5],
                "grossProfit": (ss.get("grossProfit") or [None])[-1], "netProfit": (ss.get("netProfit") or [None])[-1],
                "netProfitPrev": (ss.get("netProfit") or [None] * 8)[-5], "equity": (ss.get("equity") or [None])[-1],
                "cash": (ss.get("cash") or [None])[-1], "stDebt": (ss.get("stDebt") or [None])[-1], "ltDebt": (ss.get("ltDebt") or [None])[-1],
            },
        })

    out_dir = os.path.join(os.path.dirname(__file__), "..", "client", "public", "data", "realestate")
    os.makedirs(os.path.join(out_dir, "detail"), exist_ok=True)
    sector = {
        "period": long_q[li], "periodPrev": long_q[li - 4], "quarters": long_q, "shortQuarters": short_q,
        "rows": rows_out, "criteria": criteria_text, "projects": projects,
        "series": {s: long_series[s] for s in SYMS},
    }
    with open(os.path.join(out_dir, "sector.json"), "w", encoding="utf-8") as fh:
        json.dump(sector, fh, ensure_ascii=False, separators=(",", ":"))
    for s in SYMS:
        det = {
            "symbol": s, "quarters": long_q, "series": long_series[s], "shortQuarters": short_q, "short": short_series[s],
            "inventoryByProject": company.get(s, {}).get("inventory", []), "projectList": company.get(s, {}).get("projects", []),
            "handover": [p for p in projects if p["sym"] == s], "flags": flags[s],
        }
        with open(os.path.join(out_dir, "detail", f"{s}.json"), "w", encoding="utf-8") as fh:
            json.dump(det, fh, ensure_ascii=False, separators=(",", ":"))
    print("ok", long_q[li], len(SYMS), "CĐT")


if __name__ == "__main__":
    main(sys.argv[1])
