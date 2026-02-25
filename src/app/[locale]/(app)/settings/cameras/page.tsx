"use client";

import { useState, useEffect, useTransition } from "react";
import { Camera, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  listBrighterBinsDevicesAction,
  associateDeviceAction,
  dissociateDeviceAction,
} from "@/actions/brighterbins";
import { useCurrentPark } from "@/hooks/use-current-park";
import type { BrighterBinsDevice } from "@/types/brighterbins";
import { cn } from "@/lib/utils";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; devices: BrighterBinsDevice[]; associated: Set<string> };

export default function CamerasSettingsPage() {
  const { currentParkId } = useCurrentPark();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [pending, startTransition] = useTransition();
  const [loadingDevices, setLoadingDevices] = useState<Set<string>>(new Set());

  async function load() {
    setState({ status: "loading" });
    try {
      const supabase = createClient();
      const [devicesResult, assocResult] = await Promise.all([
        listBrighterBinsDevicesAction(),
        supabase
          .from("park_brighterbins_devices")
          .select("device_id")
          .eq("park_id", currentParkId ?? "")
          .eq("is_active", true),
      ]);

      if (!devicesResult || devicesResult.length === 0) {
        setState({ status: "empty" });
        return;
      }

      const associated = new Set<string>(
        (assocResult.data ?? []).map((r) => r.device_id)
      );

      setState({ status: "ready", devices: devicesResult, associated });
    } catch {
      setState({
        status: "error",
        message: "Não foi possível carregar dispositivos de inspeção visual.",
      });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParkId]);

  function setDeviceLoading(deviceId: string, loading: boolean) {
    setLoadingDevices((prev) => {
      const next = new Set(prev);
      if (loading) next.add(deviceId);
      else next.delete(deviceId);
      return next;
    });
  }

  function handleAssociate(device: BrighterBinsDevice) {
    if (!currentParkId) return;
    setDeviceLoading(device.variant_id, true);
    startTransition(async () => {
      try {
        await associateDeviceAction(
          currentParkId,
          device.variant_id,
          device.name
        );
        setState((prev) => {
          if (prev.status !== "ready") return prev;
          const next = new Set(prev.associated);
          next.add(device.variant_id);
          return { ...prev, associated: next };
        });
        toast.success(`"${device.name}" associada ao parque.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao associar.");
      } finally {
        setDeviceLoading(device.variant_id, false);
      }
    });
  }

  function handleDissociate(device: BrighterBinsDevice) {
    if (!currentParkId) return;
    setDeviceLoading(device.variant_id, true);
    startTransition(async () => {
      try {
        await dissociateDeviceAction(currentParkId, device.variant_id);
        setState((prev) => {
          if (prev.status !== "ready") return prev;
          const next = new Set(prev.associated);
          next.delete(device.variant_id);
          return { ...prev, associated: next };
        });
        toast.success(`"${device.name}" removida do parque.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao remover.");
      } finally {
        setDeviceLoading(device.variant_id, false);
      }
    });
  }

  // Loading
  if (state.status === "loading") {
    return (
      <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center gap-3 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span className="text-sm">A carregar dispositivos...</span>
      </div>
    );
  }

  // Error
  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Erro de ligação
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  // Empty
  if (state.status === "empty") {
    return (
      <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center gap-3 text-center">
        <Camera className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum dispositivo de inspeção visual disponível na conta configurada.
        </p>
      </div>
    );
  }

  // Ready
  const { devices, associated } = state;
  const associatedCount = associated.size;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Dispositivos de Inspeção Visual
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Associe dispositivos de inspeção visual ao parque atual para
          correlacionar leituras com entradas.
        </p>
      </div>

      <div className="space-y-2">
        {devices.map((device) => {
          const isAssociated = associated.has(device.variant_id);
          const isLoading = loadingDevices.has(device.variant_id);
          const isOnline = device.status === "Online";

          return (
            <div
              key={device.variant_id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              {/* Status dot */}
              <div
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  isOnline ? "bg-green-500" : "bg-muted-foreground"
                )}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {device.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {device.variant_id.slice(0, 12)}…
                </p>
              </div>

              {/* Associated badge */}
              {isAssociated && (
                <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40">
                  Associada
                </span>
              )}

              {/* Action button */}
              {isAssociated ? (
                <button
                  onClick={() => handleDissociate(device)}
                  disabled={isLoading || pending}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  {isLoading ? "A remover..." : "Remover"}
                </button>
              ) : (
                <button
                  onClick={() => handleAssociate(device)}
                  disabled={isLoading || pending}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  {isLoading ? "A associar..." : "Associar"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground">
        {devices.length} dispositivo{devices.length !== 1 ? "s" : ""}{" "}
        encontrado{devices.length !== 1 ? "s" : ""} · {associatedCount}{" "}
        associado{associatedCount !== 1 ? "s" : ""} a este parque
      </p>
    </div>
  );
}
