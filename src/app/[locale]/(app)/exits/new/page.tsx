"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface StorageArea {
  id: string;
  code: string;
  name: string;
}

interface LerCode {
  id: string;
  code: string;
  description_pt: string;
}

interface RegisteredClient {
  id: string;
  name: string;
  nif: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
}

interface DeliveryLine {
  ler_code_id: string;
  ler_code: string;
  source_area_id: string;
  planned_weight_kg: string;
}

export default function NewExitPage() {
  const tc = useTranslations("common");
  const t = useTranslations("exits");
  const { currentParkId } = useCurrentPark();
  const [areas, setAreas] = useState<StorageArea[]>([]);
  const [lerCodes, setLerCodes] = useState<LerCode[]>([]);
  const [buyers, setBuyers] = useState<RegisteredClient[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    exit_type: "treatment" as "treatment" | "client" | "group",
    destination_name: "",
    destination_nif: "",
    destination_address: "",
    transporter_name: "",
    transporter_nif: "",
    vehicle_plate: "",
    driver_name: "",
    planned_date: "",
    notes: "",
  });
  const [lines, setLines] = useState<DeliveryLine[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!currentParkId) return;
      const supabase = createClient();

      const { data: areaData } = await supabase
        .from("storage_areas")
        .select("id, code, name")
        .eq("park_id", currentParkId)
        .eq("is_active", true)
        .order("code") as { data: StorageArea[] | null };
      if (areaData) setAreas(areaData);

      const { data: codeData } = await supabase
        .from("ler_codes")
        .select("id, code, description_pt")
        .eq("is_active", true)
        .order("code") as { data: LerCode[] | null };
      if (codeData) setLerCodes(codeData);

      const { data: buyerData } = await supabase
        .from("clients")
        .select("id, name, nif, address, city, phone, email")
        .in("client_type", ["buyer", "both"])
        .eq("is_active", true)
        .order("name") as { data: RegisteredClient[] | null };
      if (buyerData) setBuyers(buyerData);
    }
    loadData();
  }, [currentParkId]);

  function addLine() {
    setLines([...lines, { ler_code_id: "", ler_code: "", source_area_id: "", planned_weight_kg: "" }]);
  }

  function updateLine(idx: number, field: keyof DeliveryLine, value: string) {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "ler_code_id") {
      const code = lerCodes.find((c) => c.id === value);
      if (code) updated[idx].ler_code = code.code;
    }
    setLines(updated);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  const totalWeight = lines.reduce((sum, l) => sum + (parseFloat(l.planned_weight_kg) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentParkId || lines.length === 0) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user?.app_metadata?.org_id;

      const { count } = await supabase
        .from("delivery_requests")
        .select("id", { count: "exact", head: true })
        .eq("park_id", currentParkId);

      const requestNumber = `DR-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(5, "0")}`;

      const { data: request, error } = await supabase
        .from("delivery_requests")
        .insert({
          org_id: orgId,
          park_id: currentParkId,
          request_number: requestNumber,
          exit_type: form.exit_type,
          status: "planned",
          client_id: form.exit_type === "client" && selectedBuyerId ? selectedBuyerId : null,
          destination_name: form.destination_name,
          destination_nif: form.destination_nif,
          destination_address: form.destination_address,
          transporter_name: form.transporter_name,
          transporter_nif: form.transporter_nif,
          vehicle_plate: form.vehicle_plate,
          driver_name: form.driver_name,
          planned_date: form.planned_date || null,
          total_weight_kg: totalWeight,
          notes: form.notes,
        })
        .select("id")
        .single() as { data: { id: string } | null; error: unknown };

      if (error || !request) {
        toast.error("Erro ao criar pedido de saída");
        setIsSubmitting(false);
        return;
      }

      const lineInserts = lines.map((l) => ({
        request_id: request.id,
        ler_code_id: l.ler_code_id || null,
        ler_code: l.ler_code,
        source_area_id: l.source_area_id || null,
        planned_weight_kg: parseFloat(l.planned_weight_kg),
      }));

      await supabase.from("delivery_lines").insert(lineInserts);
      toast.success("Pedido de saída criado!");

      setForm({
        exit_type: "treatment",
        destination_name: "", destination_nif: "", destination_address: "",
        transporter_name: "", transporter_nif: "", vehicle_plate: "", driver_name: "",
        planned_date: "", notes: "",
      });
      setLines([]);
    } catch {
      toast.error("Erro ao criar pedido");
    }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Link href="/exits" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("title")}
      </Link>

      <h1 className="text-xl font-semibold">{t("newExit")}</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Exit Type */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Tipo de Saída</h3>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "treatment", label: "Tratamento", desc: "Resíduos não valorizados" },
              { value: "client", label: "Cliente", desc: "Venda a clientes" },
              { value: "group", label: "Grupo", desc: "Transferência inter-empresa" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, exit_type: opt.value })}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  form.exit_type === opt.value
                    ? "border-primary bg-primary-surface"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Buyer selector — only for client exits */}
        {form.exit_type === "client" && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Comprador</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecionar cliente registado</label>
              <select
                value={selectedBuyerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedBuyerId(id);
                  const buyer = buyers.find((b) => b.id === id);
                  if (buyer) {
                    setForm({
                      ...form,
                      destination_name: buyer.name,
                      destination_nif: buyer.nif || "",
                      destination_address: [buyer.address, buyer.city].filter(Boolean).join(", "),
                    });
                  } else {
                    setForm({ ...form, destination_name: "", destination_nif: "", destination_address: "" });
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required={form.exit_type === "client"}
              >
                <option value="">Selecione um comprador...</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.nif ? ` — NIF ${b.nif}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {selectedBuyerId && (() => {
              const buyer = buyers.find((b) => b.id === selectedBuyerId);
              return buyer ? (
                <div className="rounded-md bg-primary-surface p-3 text-sm space-y-1">
                  <p className="font-medium">{buyer.name}</p>
                  {buyer.nif && <p className="text-muted-foreground">NIF: {buyer.nif}</p>}
                  {buyer.phone && <p className="text-muted-foreground">Tel: {buyer.phone}</p>}
                  {buyer.email && <p className="text-muted-foreground">{buyer.email}</p>}
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Destination — manual for non-client exits */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Destino</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <input value={form.destination_name} onChange={(e) => setForm({ ...form, destination_name: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required readOnly={form.exit_type === "client" && !!selectedBuyerId} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">NIF</label>
              <input value={form.destination_nif} onChange={(e) => setForm({ ...form, destination_nif: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" readOnly={form.exit_type === "client" && !!selectedBuyerId} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Morada</label>
            <input value={form.destination_address} onChange={(e) => setForm({ ...form, destination_address: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" readOnly={form.exit_type === "client" && !!selectedBuyerId} />
          </div>
        </div>

        {/* Transport */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Transporte</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Transportadora</label>
              <input value={form.transporter_name} onChange={(e) => setForm({ ...form, transporter_name: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">NIF Transportadora</label>
              <input value={form.transporter_nif} onChange={(e) => setForm({ ...form, transporter_nif: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Matrícula</label>
              <input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Planeada</label>
              <input type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Linhas de Saída</h3>
            <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>

          {lines.map((line, idx) => (
            <div key={idx} className="rounded-md border border-border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-xs font-medium text-muted-foreground">Linha {idx + 1}</span>
                <button type="button" onClick={() => removeLine(idx)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Código LER</label>
                  <select value={line.ler_code_id} onChange={(e) => updateLine(idx, "ler_code_id", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm" required>
                    <option value="">Selecione...</option>
                    {lerCodes.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.description_pt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Área Origem</label>
                  <select value={line.source_area_id} onChange={(e) => updateLine(idx, "source_area_id", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                    <option value="">Selecione...</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Peso (kg)</label>
                  <input type="number" step="0.1" min="0" value={line.planned_weight_kg} onChange={(e) => updateLine(idx, "planned_weight_kg", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm" required />
                </div>
              </div>
            </div>
          ))}

          {lines.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Adicione linhas de material para saída.</p>
          )}

          {lines.length > 0 && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              Total: <strong className="font-mono">{totalWeight.toLocaleString("pt-PT")} kg</strong>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting || lines.length === 0} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
            {isSubmitting ? tc("loading") : tc("create")}
          </button>
          <Link href="/exits" className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
