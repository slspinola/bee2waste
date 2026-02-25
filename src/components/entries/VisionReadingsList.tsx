"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import type { EntradaVisionReading } from "@/types/brighterbins";
import { VisionReadingCard } from "./VisionReadingCard";
import { VisionReadingRow } from "./VisionReadingRow";
import { cn } from "@/lib/utils";

interface Props {
  readings: EntradaVisionReading[];
}

export function VisionReadingsList({ readings }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid");

  if (readings.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {readings.length} leitura{readings.length !== 1 ? "s" : ""}
        </p>
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
              view === "grid"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grelha
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
        </div>
      </div>

      {/* Grid view */}
      {view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {readings.map((r) => (
            <VisionReadingCard key={r.id} reading={r} />
          ))}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-2">
          {readings.map((r) => (
            <VisionReadingRow key={r.id} reading={r} />
          ))}
        </div>
      )}
    </div>
  );
}
