"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, UserPlus, Building2, AlertCircle } from "lucide-react";

interface EntityData {
  name: string;
  nif: string;
  contact: string;
}

interface ResolvedClient {
  id: string;
  name: string;
  nif: string;
  phone: string | null;
  email: string | null;
  client_type: string;
}

export type EntityResolutionResult =
  | { type: "registered"; client: ResolvedClient }
  | { type: "adhoc"; entity: EntityData };

interface EntityResolutionPanelProps {
  originName: string;
  originNif: string;
  onResolved: (result: EntityResolutionResult) => void;
  resolved?: EntityResolutionResult | null;
}

export function EntityResolutionPanel({
  originName,
  originNif,
  onResolved,
  resolved,
}: EntityResolutionPanelProps) {
  const [matchedClient, setMatchedClient] = useState<ResolvedClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"auto" | "register" | "adhoc">("auto");
  const [form, setForm] = useState<EntityData>({ name: originName, nif: originNif, contact: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function lookupByNif() {
      if (!originNif) { setIsLoading(false); return; }
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("id, name, nif, phone, email, client_type")
        .eq("nif", originNif)
        .eq("is_active", true)
        .maybeSingle() as { data: ResolvedClient | null };
      setMatchedClient(data);
      setIsLoading(false);
    }
    lookupByNif();
  }, [originNif]);

  async function handleRegister() {
    if (!form.name || !form.nif) return;
    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user!.id)
      .single() as { data: { org_id: string } | null };

    const { data: newClient } = await supabase
      .from("clients")
      .insert({
        org_id: profile?.org_id,
        name: form.name,
        nif: form.nif,
        phone: form.contact || null,
        client_type: "supplier",
        is_active: true,
      })
      .select("id, name, nif, phone, email, client_type")
      .single() as { data: ResolvedClient | null };

    if (newClient) {
      onResolved({ type: "registered", client: newClient });
    }
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          A verificar entidade no sistema...
        </div>
      </div>
    );
  }

  // Already resolved — show summary
  if (resolved) {
    return (
      <div className="rounded-lg border border-success/30 bg-success-surface p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-medium text-success">
              {resolved.type === "registered" ? "Cliente registado" : "Entidade avulsa"}
            </p>
            <p className="text-sm font-medium">
              {resolved.type === "registered" ? resolved.client.name : resolved.entity.name}
            </p>
            <p className="text-xs text-muted-foreground">
              NIF: {resolved.type === "registered" ? resolved.client.nif : resolved.entity.nif}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Client found in system
  if (matchedClient && mode === "auto") {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-semibold">Entidade identificada no sistema</h4>
        </div>
        <div className="rounded-md bg-primary-surface p-3 text-sm space-y-1">
          <p className="font-medium">{matchedClient.name}</p>
          <p className="text-muted-foreground">NIF: {matchedClient.nif}</p>
          {matchedClient.phone && <p className="text-muted-foreground">Tel: {matchedClient.phone}</p>}
          {matchedClient.email && <p className="text-muted-foreground">{matchedClient.email}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onResolved({ type: "registered", client: matchedClient })}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Confirmar cliente
          </button>
          <button
            type="button"
            onClick={() => setMode("adhoc")}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Avulso
          </button>
        </div>
      </div>
    );
  }

  // Not found or chose manual — show form
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-warning" />
        <h4 className="text-sm font-semibold">Entidade não registada</h4>
        <span className="text-xs text-muted-foreground">NIF {originNif} não encontrado</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium">Nome da entidade</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">NIF</label>
          <input
            value={form.nif}
            onChange={(e) => setForm({ ...form, nif: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="col-span-3 space-y-1">
          <label className="text-xs font-medium">Contacto (telefone ou email)</label>
          <input
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="210 000 000 ou email@empresa.pt"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRegister}
          disabled={isSaving || !form.name || !form.nif}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {isSaving ? "A registar..." : "Registar cliente"}
        </button>
        <button
          type="button"
          onClick={() => onResolved({ type: "adhoc", entity: form })}
          disabled={!form.name || !form.nif}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Avançar como avulso
        </button>
      </div>
    </div>
  );
}
