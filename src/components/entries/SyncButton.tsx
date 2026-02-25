"use client";

import { useTransition, useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { syncBrighterBinsAction } from "@/actions/brighterbins";
import { cn } from "@/lib/utils";

interface Props {
  parkId: string;
}

export function SyncButton({ parkId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    synced?: number;
    error?: string;
  } | null>(null);

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await syncBrighterBinsAction(parkId);
        setResult({ synced: r.synced });
      } catch (err) {
        setResult({
          error: err instanceof Error ? err.message : "Erro ao sincronizar",
        });
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          "border border-border bg-background hover:bg-accent text-foreground",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", isPending && "animate-spin")}
        />
        {isPending ? "A sincronizar..." : "Sincronizar"}
      </button>

      {result && !result.error && (
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {result.synced} leitura{result.synced !== 1 ? "s" : ""} sincronizada
          {result.synced !== 1 ? "s" : ""}
        </span>
      )}
      {result?.error && (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {result.error}
        </span>
      )}
    </div>
  );
}
