"use client";

import { Camera } from "lucide-react";
import type { EntradaVisionReading } from "@/types/brighterbins";
import { cn } from "@/lib/utils";

interface Props {
  reading: EntradaVisionReading;
}

export function VisionReadingCard({ reading }: Props) {
  const imgSrc = reading.annotated_img_url ?? reading.image_url;
  const fillLevel = reading.fill_level;
  const isOverflow = fillLevel != null && fillLevel > 100;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Image */}
      <div className="relative aspect-video bg-muted flex items-center justify-center">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt="Vision reading"
            className="w-full h-full object-cover"
          />
        ) : (
          <Camera className="h-8 w-8 text-muted-foreground" />
        )}
        {fillLevel != null && (
          <span
            className={cn(
              "absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-medium",
              isOverflow
                ? "bg-amber-500 text-white"
                : "bg-black/60 text-white"
            )}
          >
            {isOverflow ? `Overflow ${fillLevel}%` : `${fillLevel}%`}
          </span>
        )}
        {reading.contamination_count > 0 && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/80 text-white">
            {reading.contamination_count} cont.
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <p className="text-xs text-muted-foreground">
          {new Date(reading.uplink_time).toLocaleString("pt-PT", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="text-xs font-medium text-foreground truncate">
          {reading.device_name ?? reading.device_id}
        </p>
        {reading.contamination && reading.contamination.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reading.contamination.slice(0, 3).map((c) => (
              <span
                key={c}
                className="px-1 py-0.5 rounded text-xs bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
              >
                {c}
              </span>
            ))}
          </div>
        )}
        {reading.battery_level != null && (
          <p className="text-xs text-muted-foreground">
            Bateria: {reading.battery_level}%
          </p>
        )}
      </div>
    </div>
  );
}
