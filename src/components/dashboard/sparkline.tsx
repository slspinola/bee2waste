"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#f93f26",
  strokeWidth = 1.5,
  filled = false,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 2;
  const h = height - padY * 2;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padY + h - ((v - min) / range) * h;
    return [x, y] as [number, number];
  });

  const pointsStr = pts
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  if (filled) {
    const lastX = pts[pts.length - 1][0];
    const firstX = pts[0][0];
    const areaPath = [
      `M ${firstX.toFixed(1)},${(height - padY).toFixed(1)}`,
      ...pts.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`),
      `L ${lastX.toFixed(1)},${(height - padY).toFixed(1)}`,
      "Z",
    ].join(" ");

    return (
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        aria-hidden
      >
        <path d={areaPath} fill={color} fillOpacity={0.12} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsStr}
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pointsStr}
      />
    </svg>
  );
}
