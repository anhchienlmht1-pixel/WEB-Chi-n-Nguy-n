// Bảng điện trang trí chạy nền phía sau phần mở đầu (Giới thiệu, Trang chủ).
// Số liệu giả, cố định theo seed để không nhấp nháy khi render lại.

const SYMBOLS = [
  "ACB", "BID", "BSR", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG", "LPB", "MBB", "MCH", "MSN", "MWG",
  "PLX", "SAB", "SHB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB",
];

// Deterministic pseudo-random numbers so the decorative board is identical on
// every render (no hydration or re-render flicker).
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Cell = { text: string; cls: string; flash?: { kind: "fu" | "fd"; delay: number; dur: number } };

function buildBoard(): Cell[][] {
  const r = rng(7);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const fmt = (v: number) => v.toFixed(2);
  const vol = () => (Math.floor(r() * 900) + 1) * 100;
  return SYMBOLS.map((sym) => {
    const ref = Math.round((15 + r() * 115) * 20) / 20;
    const col = (v: number) => (v > ref ? "u" : v < ref ? "d" : "r");
    const steps = [-0.3, -0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, 0.3];
    const prices = Array.from({ length: 7 }, () => Math.round((ref + pick(steps)) * 20) / 20);
    const row: Cell[] = [
      { text: sym, cls: pick(["u", "d", "r"]) },
      { text: fmt(ref * 1.07), cls: "c" },
      { text: fmt(ref * 0.93), cls: "f" },
      { text: fmt(ref), cls: "r" },
    ];
    prices.forEach((p, i) => {
      const k = i === 3 ? " k" : "";
      row.push({ text: fmt(p), cls: col(p) + k });
      row.push({ text: vol().toLocaleString("en-US"), cls: col(p) + k });
      if (i === 3) {
        const ch = p - ref;
        row.push({ text: (ch >= 0 ? "+" : "") + ch.toFixed(2), cls: col(p) });
        row.push({ text: (ch >= 0 ? "+" : "") + ((ch / ref) * 100).toFixed(2) + "%", cls: col(p) });
      }
    });
    row.push({ text: ((Math.floor(r() * 150) + 1) * 100000).toLocaleString("en-US"), cls: "r" });
    return row.map((c) =>
      r() < 0.28 ? { ...c, flash: { kind: r() < 0.5 ? "fu" : "fd", delay: r() * 6, dur: 2.4 + r() * 3.1 } } : c
    );
  });
}

const BOARD = buildBoard();

export default function PriceBoard({ bright = false }: { bright?: boolean }) {
  const rows = [...BOARD, ...BOARD];
  return (
    <div aria-hidden="true" className={`pb-wrap${bright ? " pb-bright" : ""}`}>
      <table className="pb">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((c, j) => (
                <td
                  key={j}
                  className={`${c.cls}${c.flash ? " " + c.flash.kind : ""}`}
                  style={{
                    textAlign: j === 0 ? "left" : undefined,
                    ...(c.flash ? { animationDelay: `${c.flash.delay.toFixed(2)}s`, animationDuration: `${c.flash.dur.toFixed(2)}s` } : {}),
                  }}
                >
                  {c.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

