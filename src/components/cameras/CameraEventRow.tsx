"use client";

import { Camera, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { EntradaVisionReading } from "@/types/brighterbins";
import { useContaminantLabels } from "@/hooks/use-contaminant-labels";

interface CameraEventRowProps {
  reading: EntradaVisionReading;
  entryNumber?: string | null;
}

function wasteBadgeStyle(color: string | undefined): React.CSSProperties | undefined {
  if (!color) return undefined;
  return { backgroundColor: color + "20", color };
}

export function CameraEventRow({ reading, entryNumber }: CameraEventRowProps) {
  const { labelsMap, colorsMap } = useContaminantLabels();
  const imgSrc = reading.annotated_img_url ?? reading.image_url;
  const dateStr = new Date(reading.uplink_time).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const fillLevel = reading.fill_level;
  const fillPct = fillLevel != null ? Math.min(fillLevel, 100) : null;
  const fillColor =
    fillLevel == null
      ? "bg-muted"
      : fillLevel > 100
        ? "bg-amber-500"
        : fillLevel > 80
          ? "bg-amber-400"
          : "bg-primary";

  const contaminants: string[] = Array.isArray(reading.contamination)
    ? (reading.contamination as string[])
    : [];

  const deviceLabel = reading.device_name
    ? reading.device_name.length > 28
      ? reading.device_name.slice(0, 28) + "…"
      : reading.device_name
    : reading.device_id.slice(0, 16) + "…";

  return (
    <tr className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
      {/* Thumbnail */}
      <td className="px-4 py-3" style={{ width: 80 }}>
        <div className="w-[72px] h-[48px] rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
          {imgSrc ? (
            <img src={imgSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <Camera className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap" style={{ width: 120 }}>
        {dateStr}
      </td>

      {/* Device */}
      <td className="px-4 py-3 text-sm font-medium">{deviceLabel}</td>

      {/* Fill level */}
      <td className="px-4 py-3" style={{ width: 140 }}>
        {fillLevel != null ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${fillColor}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <span
              className={`text-xs font-semibold whitespace-nowrap ${
                fillLevel > 100 ? "text-amber-600" : "text-foreground"
              }`}
            >
              {fillLevel}%
            </span>
          </div>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">ND</span>
        )}
      </td>

      {/* Contaminants */}
      <td className="px-4 py-3" style={{ width: 140 }}>
        {contaminants.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {contaminants.slice(0, 2).map((c) => (
              <span
                key={c}
                className="rounded-full px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50"
                style={wasteBadgeStyle(colorsMap[c])}
              >
                {labelsMap[c] ?? c}
              </span>
            ))}
            {contaminants.length > 2 && (
              <span className="text-xs text-muted-foreground">+{contaminants.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-green-700 bg-green-50 rounded-full px-2 py-0.5 font-medium">
            Limpo
          </span>
        )}
      </td>

      {/* Entry */}
      <td className="px-4 py-3 text-sm" style={{ width: 110 }}>
        {reading.entry_id && entryNumber ? (
          <Link
            href={`/entries/${reading.entry_id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            {entryNumber}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right" style={{ width: 40 }}>
        <Link
          href={`/cameras/${reading.id}`}
          className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}
