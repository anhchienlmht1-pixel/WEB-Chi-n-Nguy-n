"""Xuất dữ liệu trang "Chi tiết ngân hàng" từ file Excel Ngân hàng (bank.xlsm).

Đọc giá trị đã tính sẵn (data_only) từ:
  - sheet "Dữ liệu Chung": các chỉ số theo quý cho 16 ngân hàng (+ TB ngành)
  - sheet riêng của từng ngân hàng: khoản mục bảng cân đối (tiền gửi, cho vay…)
và ghi client/public/data/banks/detail/<MÃ>.json cho từng ngân hàng.

Chạy: python3 scripts/export_bank_detail.py <đường-dẫn-bank.xlsm>
"""
import json
import math
import os
import sys

import openpyxl

BANKS = ["VCB", "BID", "CTG", "TCB", "VPB", "MBB", "ACB", "HDB", "STB", "SHB", "LPB", "VIB", "TPB", "EIB", "MSB", "OCB"]
FROM = "Q1 2022"

# Chỉ số lấy từ "Dữ liệu Chung" (tên khối trong sheet -> khoá JSON).
METRICS = {
    "CASA (%)": "casa",
    "NIM (%)": "nim",
    "ROE (%)": "roe",
    "ROA (%)": "roa",
    "LDR (%)": "ldr",
    "LLR (%)": "llr",
    "CIR (%)": "cir",
    "NPL (%)": "npl",
    "YOEA (%)": "yoea",
    "COF (%)": "cof",
    "Nợ nhóm 2 (%)": "g2",
    "Tăng trưởng tín dụng YTD (%)": "creditYtd",
    "Tăng trưởng tiền gửi YTD (%)": "depositYtd",
    "Lợi nhuận trước thuế (PBT)": "pbt",
    "Lợi nhuận sau thuế (PAT)": "pat",
    "Thu nhập lãi thuần (NII)": "nii",
    "Thu nhập ngoài lãi (NonII)": "nonii",
    "Tổng thu nhập hoạt động (TOI)": "toi",
    "Cho vay KHCN (%)": "loanRetail",
    "Cho vay KHDN (%)": "loanCorp",
    "Cho vay KH khác (%)": "loanOther",
    "Cho vay Ngắn hạn (%)": "loanShort",
    "Cho vay Trung hạn (%)": "loanMid",
    "Cho vay Dài hạn (%)": "loanLong",
    "Cho vay Bất động sản và tư vấn (%)": "secRealEstate",
    "Cho vay Thương mại (%)": "secTrade",
    "Cho vay Sản xuất (%)": "secManufacturing",
    "Cho vay Xây dựng (%)": "secConstruction",
    "Cho vay Dịch vụ cộng đồng và cá nhân (%)": "secPersonal",
    "Cho vay Ngành khác (%)": "secOther",
}

# Khoản mục bảng cân đối trong sheet của từng ngân hàng (lấy dòng xuất hiện ĐẦU TIÊN,
# trừ khi ghi số thứ tự: "Cho vay khách hàng" dòng 2 là dư nợ gộp, chưa trừ dự phòng).
ITEMS = {
    "deposits": ("Tiền gửi của khách hàng", 1),
    "interbank": ("Tiền gửi của các tổ chức tín dụng khác", 1),
    "papers": ("Phát hành giấy tờ có giá", 1),
    "loans": ("Cho vay khách hàng", 1),  # dư nợ thuần (sau dự phòng), như sheet Chi tiết
    "assets": ("TỔNG TÀI SẢN", 1),
}


def num(v):
    if isinstance(v, (int, float)) and not (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return v
    return None


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    out_dir = os.path.join(os.path.dirname(__file__), "..", "client", "public", "data", "banks", "detail")
    os.makedirs(out_dir, exist_ok=True)

    # ---- Dữ liệu Chung: khối = tiêu đề (cột A = tên chỉ số, B.. = quý) + 16 dòng mã + TB Nganh
    ws = wb["Dữ liệu Chung"]
    rows = list(ws.iter_rows(values_only=True))
    series = {b: {} for b in BANKS}
    industry = {}
    quarters = None
    i = 0
    while i < len(rows):
        r = rows[i]
        name = r[0]
        if name in METRICS:
            q = [c for c in r[1:] if isinstance(c, str) and c.startswith("Q")]
            if quarters is None:
                quarters = q
            start = q.index(FROM)
            key = METRICS[name]
            j = i + 1
            while j < len(rows) and rows[j][0] and rows[j][0] != name and (rows[j][0] in BANKS or rows[j][0] == "TB Nganh"):
                vals = [num(c) for c in rows[j][1 : 1 + len(q)]][start:]
                if rows[j][0] == "TB Nganh":
                    industry[key] = vals
                else:
                    series[rows[j][0]][key] = vals
                j += 1
            i = j
        else:
            i += 1
    qs = quarters[quarters.index(FROM) :]

    # ---- Sheet riêng từng ngân hàng: khoản mục theo quý
    for b in BANKS:
        wsb = wb[b]
        brows = list(wsb.iter_rows(values_only=True))
        header = brows[1]
        col = {h: k for k, h in enumerate(header) if isinstance(h, str)}
        seen = {}
        for r in brows[2:]:
            if not r[0]:
                continue
            seen[r[0]] = seen.get(r[0], 0) + 1
            for key, (label, nth) in ITEMS.items():
                if r[0] == label and seen[r[0]] == nth:
                    series[b][key] = [num(r[col[q]]) if q in col else None for q in qs]

    for b in BANKS:
        doc = {"symbol": b, "quarters": qs, "series": series[b], "industry": industry}
        with open(os.path.join(out_dir, f"{b}.json"), "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    print("ok", len(qs), "quý:", qs[0], "->", qs[-1], "| chỉ số:", len(METRICS), "| khoản mục:", len(ITEMS))


if __name__ == "__main__":
    main(sys.argv[1])
