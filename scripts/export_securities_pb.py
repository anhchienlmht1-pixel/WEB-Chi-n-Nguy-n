"""P/B ngành chứng khoán từ Google Sheet "Triển vọng đầu tư - Team Bull", sheet "Data P/B Chứng".

scripts/data/securities_pb.txt giữ thống kê 5 năm (tính trên dữ liệu ngày) và chuỗi
P/B lấy mẫu mỗi 10 phiên. Chạy: python3 -I scripts/export_securities_pb.py
"""
import json, os

here = os.path.dirname(__file__)
cols, stats, dates, series = [], {}, [], {}
for line in open(os.path.join(here, "data", "securities_pb.txt"), encoding="utf-8"):
    line = line.strip()
    if not line:
        continue
    if line.startswith("#cols"):
        cols = line.split()[1:]
        series = {c: [] for c in cols}
    elif line.startswith("#"):
        continue
    elif "|" in line:
        d, vals = line.split("|")
        dates.append(f"20{d[:2]}-{d[2:4]}-{d[4:]}")
        vs = vals.split(",")
        for i, c in enumerate(cols):
            v = vs[i] if i < len(vs) else ""
            series[c].append(int(v) / 100 if v else None)
    else:
        p = line.split(",")
        stats[p[0]] = dict(cur=float(p[1]), curDate=p[2], avg=float(p[3]), med=float(p[4]), sd=float(p[5]),
                           min=float(p[6]), minDate=p[7], max=float(p[8]), maxDate=p[9], n=int(p[10]), since=p[11], pct=float(p[12]))
dates.reverse()
for c in cols:
    series[c].reverse()
out = {"source": "Data P/B Chứng", "dates": dates, "series": series, "stats": stats}
dst = os.path.join(here, "..", "client", "public", "data", "securities", "valuation.json")
json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("ok", len(dates), "điểm,", len(stats), "mã")
