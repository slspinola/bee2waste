"use client";

import { Camera } from "lucide-react";
import type { EntradaVisionReading } from "@/types/brighterbins";
import { cn } from "@/lib/utils";

interface Props {
  reading: EntradaVisionReading;
}

export function VisionReadingRow({ reading }: Props) {
  const imgSrc = reading.annotated_img_url ?? reading.image_url;
  const fillLevel = reading.fill_level;
  const isOverflow = fillLevel != null && fillLevel > 100;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      {/* Thumbnail */}
      <div className="relative h-12 w-16 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt="Vision reading"
            className="h-full w-full object-cover"
          />
        ) : (
          <Camera className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Time + device */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {new Date(reading.uplink_time).toLocaleString("pt-PT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {reading.device_name ?? reading.device_id}
        </p>
      </div>

      {/* Fill level */}
      <div className="text-right shrink-0">
        {fillLevel != null ? (
          <span
            className={cn(
              "text-sm font-medium",
              isOverflow ? "text-amber-600" : "text-foreground"
            )}
          >
            {isOverflow ? `Overflow ${fillLevel}%` : `${fillLevel}%`}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>

      {/* Contamination badges */}
      <div className="flex flex-wrap gap-1 shrink-0 max-w-[160px]">
        {reading.contamination && reading.contamination.length > 0 ? (
          reading.contamination.slice(0, 2).map((c) => (
            <span
              key={c}
              className="px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {c}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Sem cont.</span>
        )}
      </div>

      {/* Battery */}
      {reading.battery_level != null && (
        <span className="text-xs text-muted-foreground shrink-0">
          {reading.battery_level}%
        </span>
      )}
    </div>
  );
}
