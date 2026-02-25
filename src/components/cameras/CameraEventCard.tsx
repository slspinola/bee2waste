"use client";

import { Camera } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { EntradaVisionReading } from "@/types/brighterbins";
import { useContaminantLabels } from "@/hooks/use-contaminant-labels";

interface CameraEventCardProps {
  reading: EntradaVisionReading;
}

function FillBadge({ level }: { level: number | null }) {
  if (level == null) {
    return (
      <span className="rounded px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted/80">
        ND
      </span>
    );
  }
  const className =
    level > 100
      ? "text-amber-600 bg-amber-100"
      : level > 80
        ? "text-amber-600 bg-amber-50"
        : "text-foreground bg-muted";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${className}`}>
      {level}%
    </span>
  );
}

function wasteBadgeStyle(color: string | undefined): React.CSSProperties | undefined {
  if (!color) return undefined;
  return { backgroundColor: color + "20", color };
}

export function CameraEventCard({ reading }: CameraEventCardProps) {
  const { labelsMap, colorsMap } = useContaminantLabels();
  const imgSrc = reading.annotated_img_url ?? reading.image_url;
  const dateStr = new Date(reading.uplink_time).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const deviceShort = reading.device_name
    ? reading.device_name.length > 22
      ? reading.device_name.slice(0, 22) + "…"
      : reading.device_name
    : reading.device_id.slice(0, 12) + "…";

  const contaminants: string[] = Array.isArray(reading.contamination)
    ? (reading.contamination as string[])
    : [];

  return (
    <Link
      href={`/cameras/${reading.id}`}
      className="rounded-lg border border-border bg-card overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all block"
    >
      {/* Image */}
      <div className="relative aspect-video bg-muted">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt="Camera event"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        {/* Overlays */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-1.5">
          <FillBadge level={reading.fill_level} />
          {reading.contamination_count != null && reading.contamination_count > 0 && (
            <span className="rounded px-1.5 py-0.5 text-xs font-semibold text-red-700 bg-red-100">
              {reading.contamination_count} cont.
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-xs text-muted-foreground">{dateStr}</p>
        <p className="text-sm font-medium truncate">{deviceShort}</p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          {reading.fill_level != null && reading.fill_level > 100 && (
            <span className="rounded-full px-2 py-0.5 text-xs font-medium text-amber-600 bg-amber-100">
              overflow
            </span>
          )}
          {contaminants.slice(0, 2).map((c) => (
            <span
              key={c}
              className="rounded-full px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50"
              style={wasteBadgeStyle(colorsMap[c])}
            >
              {labelsMap[c] ?? c}
            </span>
          ))}
        </div>

        {/* Entry link */}
        <div className="text-xs">
          {reading.entry_id ? (
            <span className="text-primary font-mono">
              🔗 entrada
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>
    </Link>
  );
}
