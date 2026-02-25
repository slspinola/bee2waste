"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EntradaVisionReading } from "@/types/brighterbins";
import { CameraEventCard } from "./CameraEventCard";
import { CameraEventRow } from "./CameraEventRow";

interface CameraEventsListProps {
  readings: EntradaVisionReading[];
  entryNumbers: Record<string, string>; // entry_id → entry_number
  view: "grid" | "list";
  onViewChange: (v: "grid" | "list") => void;
}

export function CameraEventsList({
  readings,
  entryNumbers,
  view,
  onViewChange,
}: CameraEventsListProps) {
  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center justify-end gap-1 mb-4">
        <button
          onClick={() => onViewChange("list")}
          className={cn(
            "rounded-md p-2 transition-colors",
            view === "list"
              ? "bg-primary-surface text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          title="Vista lista"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewChange("grid")}
          className={cn(
            "rounded-md p-2 transition-colors",
            view === "grid"
              ? "bg-primary-surface text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          title="Vista grelha"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>

      {/* Grid view */}
      {view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {readings.map((r) => (
            <CameraEventCard key={r.id} reading={r} />
          ))}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3 text-left">Imagem</th>
                <th className="px-4 py-3 text-left">Data/Hora</th>
                <th className="px-4 py-3 text-left">Dispositivo</th>
                <th className="px-4 py-3 text-left">Enchimento</th>
                <th className="px-4 py-3 text-left">Resíduos</th>
                <th className="px-4 py-3 text-left">Entrada</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <CameraEventRow
                  key={r.id}
                  reading={r}
                  entryNumber={r.entry_id ? entryNumbers[r.entry_id] : null}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
