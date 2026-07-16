interface Props {
  data: number[];
  width?: number;
  height?: number;
  positive: boolean;
}

export function Sparkline({ data, width = 128, height = 40, positive }: Props) {
  if (data.length < 2) {
    return <div style={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.min(...data) === Math.max(...data) ? min + 1 : Math.max(...data);
  const range = max - min || 1;

  const coords = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return [x, y] as const;
  });

  const linePoints = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;

  const stroke = positive ? "#34d399" : "#fb7185";
  const gradientId = `spark-${positive ? "up" : "down"}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />
      <polyline
        points={linePoints}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
