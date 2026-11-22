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
# Mỗi mã một chuỗi [ngày, P/B]; nguồn: "sheet" hoặc "ssi".
pts = {c: [[d, v] for d, v in zip(dates, series[c]) if v is not None] for c in cols}
source = {c: "sheet" for c in stats}

# Bổ sung từ SSI (MCP) cho mã sheet không có hoặc đã ngừng cập nhật: thay cả chuỗi
# và thống kê (tính trên dữ liệu ngày) để mỗi mã chỉ dùng một nguồn.
ssi = {}
for line in open(os.path.join(here, "data", "securities_pb_ssi.txt"), encoding="utf-8"):
    if line.startswith("#") or not line.strip():
        continue
    sym, d, v = line.split()
    ssi.setdefault(sym, []).append((d, float(v)))
for sym, xs in ssi.items():
    xs.sort()
    vs = [v for _, v in xs]
    n = len(vs)
    m = sum(vs) / n
    sd = (sum((v - m) ** 2 for v in vs) / n) ** 0.5
    sv = sorted(vs)
    cur_d, cur = xs[-1]
    mn = min(xs, key=lambda x: x[1])
    mx = max(xs, key=lambda x: x[1])
    stats[sym] = dict(cur=round(cur, 2), curDate=cur_d, avg=round(m, 3), med=sv[n // 2], sd=round(sd, 3), min=round(mn[1], 2), minDate=mn[0],
                      max=round(mx[1], 2), maxDate=mx[0], n=n, since=xs[0][0], pct=round(sum(1 for v in vs if v <= cur) / n * 100, 1))
    pts[sym] = [[d, round(v, 3)] for d, v in xs]
    source[sym] = "ssi"
out = {"series": pts, "stats": stats, "source": source}
dst = os.path.join(here, "..", "client", "public", "data", "securities", "valuation.json")
json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("ok", len(dates), "điểm,", len(stats), "mã")
