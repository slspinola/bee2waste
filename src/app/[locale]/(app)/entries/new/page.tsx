"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, Check, Boxes, Circle } from "lucide-react";
import { toast } from "sonner";

import { EntryStepper } from "@/components/entries/entry-stepper";
import { EgarValidation } from "@/components/entries/egar-validation";
import { WeighingPanel } from "@/components/entries/weighing-panel";
import { InspectionForm } from "@/components/entries/inspection-form";
import { EntityResolutionPanel, type EntityResolutionResult } from "@/components/entries/entity-resolution";
import { useLotSuggestions } from "@/hooks/use-lot-suggestions";
import { autoAssignLot, addEntryToLot } from "@/actions/lots";

interface EntryDraft {
  // Step 1: Vehicle & e-GAR
  vehicle_plate: string;
  driver_name: string;
  egar_number: string;
  egar_data: Record<string, unknown> | null;
  // Entity (producer/supplier)
  entity_resolution: EntityResolutionResult | null;
  // Step 2: Gross weighing
  gross_weight_kg: number | null;
  // Step 3: LER
  ler_code: string;
  ler_code_id: string;
  is_hazardous: boolean;
  // Step 4: Inspection
  inspection_result: string;
  inspection_notes: string;
  inspection_divergences: { type: string; severity: string; description: string }[];
  // Step 5: Tare
  tare_weight_kg: number | null;
  // Step 6: Storage
  storage_area_id: string;
  // Step 7: Confirmation
  requires_invoice: boolean;
  // VFV
  vfv_data: Record<string, string> | null;
}

interface LerCode {
  id: string;
  code: string;
  description_pt: string;
  is_hazardous: boolean;
}

interface StorageArea {
  id: string;
  code: string;
  name: string;
  area_type: string;
  capacity_kg: number | null;
  current_stock_kg: number;
}

const STEPS = [
  { id: 1, label: "Veículo" },
  { id: 2, label: "Peso Bruto" },
  { id: 3, label: "LER" },
  { id: 4, label: "Inspeção" },
  { id: 5, label: "Tara" },
  { id: 6, label: "Armazém" },
  { id: 7, label: "Confirmação" },
];

const INITIAL_DRAFT: EntryDraft = {
  vehicle_plate: "",
  driver_name: "",
  egar_number: "",
  egar_data: null,
  entity_resolution: null,
  gross_weight_kg: null,
  ler_code: "",
  ler_code_id: "",
  is_hazardous: false,
  inspection_result: "",
  inspection_notes: "",
  inspection_divergences: [],
  tare_weight_kg: null,
  storage_area_id: "",
  requires_invoice: false,
  vfv_data: null,
};

export default function NewEntryPage() {
  const t = useTranslations("entries");
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<EntryDraft>(INITIAL_DRAFT);
  const [authorizedCodes, setAuthorizedCodes] = useState<LerCode[]>([]);
  const [areas, setAreas] = useState<StorageArea[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lerSearch, setLerSearch] = useState("");

  // Lot suggestions for step 6 — derived from selected LER code
  const { compatibleZones, loading: lotSuggestionsLoading } = useLotSuggestions(
    currentParkId,
    draft.ler_code || null
  );

  // Load park's authorized LER codes and storage areas
  useEffect(() => {
    async function loadParkData() {
      if (!currentParkId) return;
      const supabase = createClient();

      const { data: auths } = await supabase
        .from("park_ler_authorizations")
        .select("ler_code_id, ler_codes(id, code, description_pt, is_hazardous)")
        .eq("park_id", currentParkId)
        .eq("is_active", true) as { data: { ler_code_id: string; ler_codes: LerCode }[] | null };

      if (auths) {
        setAuthorizedCodes(auths.map((a) => a.ler_codes));
      }

      const { data: storageAreas } = await supabase
        .from("storage_areas")
        .select("id, code, name, area_type, capacity_kg, current_stock_kg")
        .eq("park_id", currentParkId)
        .eq("is_active", true)
        .order("code") as { data: StorageArea[] | null };

      if (storageAreas) setAreas(storageAreas);
    }
    loadParkData();
  }, [currentParkId]);

  const netWeight =
    draft.gross_weight_kg && draft.tare_weight_kg
      ? draft.gross_weight_kg - draft.tare_weight_kg
      : null;

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return !!draft.vehicle_plate && !!draft.egar_number && !!draft.egar_data && !!draft.entity_resolution;
      case 2:
        return draft.gross_weight_kg != null && draft.gross_weight_kg > 0;
      case 3:
        return !!draft.ler_code_id;
      case 4:
        return !!draft.inspection_result;
      case 5:
        return draft.tare_weight_kg != null && draft.tare_weight_kg > 0;
      case 6:
        return !!draft.storage_area_id;
      case 7:
        return true;
      default:
        return false;
    }
  }

  async function handleSubmit() {
    if (!currentParkId) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Generate entry number
      const { data: park } = await supabase
        .from("parks")
        .select("code")
        .eq("id", currentParkId)
        .single() as { data: { code: string } | null };

      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("park_id", currentParkId);

      const seq = String((count || 0) + 1).padStart(5, "0");
      const entryNumber = `${park?.code || "PKR"}-E-${year}-${seq}`;

      // Get user's org_id
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user?.app_metadata?.org_id;

      const entity = draft.entity_resolution;
      const clientId = entity?.type === "registered" ? entity.client.id : null;
      const entityName = entity?.type === "adhoc" ? entity.entity.name : null;
      const entityNif = entity?.type === "adhoc" ? entity.entity.nif : null;
      const entityContact = entity?.type === "adhoc" ? entity.entity.contact : null;

      const { data: newEntry, error } = await supabase.from("entries").insert({
        org_id: orgId,
        park_id: currentParkId,
        entry_number: entryNumber,
        status: "confirmed",
        vehicle_plate: draft.vehicle_plate,
        driver_name: draft.driver_name,
        egar_number: draft.egar_number,
        ler_code_id: draft.ler_code_id,
        ler_code: draft.ler_code,
        is_hazardous: draft.is_hazardous,
        gross_weight_kg: draft.gross_weight_kg,
        tare_weight_kg: draft.tare_weight_kg,
        net_weight_kg: netWeight,
        inspection_result: draft.inspection_result,
        inspection_notes: draft.inspection_notes,
        storage_area_id: draft.storage_area_id,
        requires_invoice: draft.requires_invoice,
        vfv_data: draft.vfv_data,
        client_id: clientId,
        entity_name: entityName,
        entity_nif: entityNif,
        entity_contact: entityContact,
        confirmed_at: new Date().toISOString(),
      }).select("id").single();

      if (error) {
        toast.error(error.message);
      } else {
        // Auto-assign entry to a lot
        if (newEntry && draft.storage_area_id && draft.ler_code_id && draft.ler_code && netWeight) {
          try {
            const { lot_id } = await autoAssignLot(
              newEntry.id,
              draft.storage_area_id,
              draft.ler_code,
              draft.ler_code_id,
              currentParkId
            );
            const hasCritical = draft.inspection_divergences.some((d) => d.severity === "critical");
            const hasMajor = draft.inspection_divergences.some((d) => d.severity === "major");
            await addEntryToLot({
              lot_id,
              entry_id: newEntry.id,
              contribution_kg: netWeight,
              inspection_result: draft.inspection_result as "approved" | "approved_with_divergence" | "rejected",
              has_major_divergence: hasMajor,
              has_critical_divergence: hasCritical,
            });
          } catch {
            // Lot assignment failure is non-blocking — entry was already saved
            toast.warning("Entrada registada, mas não foi possível associar ao lote.");
          }
        }
        toast.success("Entrada registada com sucesso!");
        // Reset
        setDraft(INITIAL_DRAFT);
        setStep(1);
      }
    } catch {
      toast.error("Erro ao registar entrada");
    }
    setIsSubmitting(false);
  }

  const filteredCodes = authorizedCodes.filter(
    (c) =>
      !lerSearch ||
      c.code.toLowerCase().includes(lerSearch.toLowerCase()) ||
      c.description_pt.toLowerCase().includes(lerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Link
        href="/entries"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("title")}
      </Link>

      <h1 className="text-xl font-semibold">{t("newEntry")}</h1>

      <EntryStepper steps={STEPS} currentStep={step} onStepClick={(s) => s < step && setStep(s)} />

      <div className="max-w-2xl">
        {/* Step 1: Vehicle & e-GAR */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Dados do Veículo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Matrícula</label>
                  <input
                    value={draft.vehicle_plate}
                    onChange={(e) => setDraft({ ...draft, vehicle_plate: e.target.value.toUpperCase() })}
                    placeholder="AA-00-BB"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Motorista</label>
                  <input
                    value={draft.driver_name}
                    onChange={(e) => setDraft({ ...draft, driver_name: e.target.value })}
                    placeholder="Nome do motorista"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <EgarValidation
              onValidated={(data) => {
                setDraft({
                  ...draft,
                  egar_number: data.egar_number,
                  egar_data: data as unknown as Record<string, unknown>,
                  vehicle_plate: draft.vehicle_plate || data.transporter_plate || "",
                  ler_code: data.ler_code || "",
                  entity_resolution: null, // reset on new e-GAR
                });
              }}
            />

            {draft.egar_data && (
              <EntityResolutionPanel
                originName={(draft.egar_data.origin_name as string) || ""}
                originNif={(draft.egar_data.origin_nif as string) || ""}
                onResolved={(result) => setDraft({ ...draft, entity_resolution: result })}
                resolved={draft.entity_resolution}
              />
            )}
          </div>
        )}

        {/* Step 2: Gross Weighing */}
        {step === 2 && (
          <WeighingPanel
            label="Pesagem Bruta"
            context="gross"
            onCapture={(w) => setDraft({ ...draft, gross_weight_kg: w })}
            currentWeight={draft.gross_weight_kg || undefined}
          />
        )}

        {/* Step 3: LER Verification */}
        {step === 3 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Verificação do Código LER</h3>

            {draft.ler_code && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Código LER da e-GAR:</p>
                <p className="font-mono font-medium">{draft.ler_code}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Código LER Autorizado</label>
              <input
                value={lerSearch}
                onChange={(e) => setLerSearch(e.target.value)}
                placeholder="Pesquisar código LER..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto rounded-md border border-border">
              {filteredCodes.map((code) => (
                <label
                  key={code.id}
                  className={`flex cursor-pointer items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 hover:bg-accent/50 ${
                    draft.ler_code_id === code.id ? "bg-primary-surface" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="ler_code"
                    checked={draft.ler_code_id === code.id}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        ler_code_id: code.id,
                        ler_code: code.code,
                        is_hazardous: code.is_hazardous,
                      })
                    }
                    className="h-4 w-4"
                  />
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium">
                    {code.code}
                  </span>
                  {code.is_hazardous && (
                    <span className="rounded bg-warning-surface px-1.5 py-0.5 text-xs font-medium text-warning">
                      Perigoso
                    </span>
                  )}
                  <span className="text-sm">{code.description_pt}</span>
                </label>
              ))}
              {filteredCodes.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum código LER autorizado encontrado. Configure em Definições.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Inspection */}
        {step === 4 && (
          <InspectionForm
            onComplete={(data) =>
              setDraft({
                ...draft,
                inspection_result: data.result,
                inspection_notes: data.notes,
                inspection_divergences: data.divergences,
              })
            }
          />
        )}

        {/* Step 5: Tare Weighing */}
        {step === 5 && (
          <div className="space-y-4">
            <WeighingPanel
              label="Pesagem de Tara"
              context="tare"
              grossWeight={draft.gross_weight_kg || undefined}
              onCapture={(w) => setDraft({ ...draft, tare_weight_kg: w })}
              currentWeight={draft.tare_weight_kg || undefined}
            />
            {draft.gross_weight_kg && draft.tare_weight_kg && (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Peso Bruto</p>
                    <p className="text-lg font-bold font-mono">
                      {draft.gross_weight_kg.toLocaleString("pt-PT")} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tara</p>
                    <p className="text-lg font-bold font-mono">
                      {draft.tare_weight_kg.toLocaleString("pt-PT")} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Peso Líquido</p>
                    <p className="text-xl font-bold font-mono text-primary">
                      {netWeight?.toLocaleString("pt-PT")} kg
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Storage Allocation + Lot */}
        {step === 6 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Alocação de Zona</h3>
            <p className="text-sm text-muted-foreground">
              Selecione a zona de armazenamento. A entrada será automaticamente associada ao lote ativo compatível, ou um novo lote será criado.
            </p>

            {lotSuggestionsLoading ? (
              <p className="text-sm text-muted-foreground py-4">A carregar zonas...</p>
            ) : (
              <div className="grid gap-3">
                {compatibleZones.map((zone) => {
                  const usagePercent = zone.capacity_kg
                    ? Math.min(100, (zone.current_stock_kg / zone.capacity_kg) * 100)
                    : 0;
                  const hasActiveLot = !!zone.active_lot;
                  const isCompatible = !zone.active_lot || zone.active_lot.allowed_ler_codes.includes(draft.ler_code);

                  return (
                    <label
                      key={zone.id}
                      className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors ${
                        draft.storage_area_id === zone.id
                          ? "border-primary bg-primary-surface"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="storage_area"
                        checked={draft.storage_area_id === zone.id}
                        onChange={() => setDraft({ ...draft, storage_area_id: zone.id })}
                        className="h-4 w-4 mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium">
                            {zone.code}
                          </span>
                          <span className="text-sm font-medium">{zone.name}</span>
                          {zone.area_group_name && (
                            <span className="text-xs text-muted-foreground">· {zone.area_group_name}</span>
                          )}
                        </div>

                        {/* Active lot badge */}
                        {hasActiveLot && zone.active_lot ? (
                          <div className={`mt-2 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                            isCompatible ? "bg-success-surface text-success" : "bg-warning-surface text-warning"
                          }`}>
                            <Boxes className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="font-mono font-medium">{zone.active_lot.lot_number}</span>
                            {zone.active_lot.name && <span className="text-muted-foreground">— {zone.active_lot.name}</span>}
                            <span className="ml-auto font-mono">{zone.active_lot.total_input_kg.toLocaleString("pt-PT")} kg</span>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                            <Circle className="h-3 w-3" />
                            <span>Sem lote ativo — novo lote será criado</span>
                          </div>
                        )}

                        {zone.capacity_kg != null && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{zone.current_stock_kg.toLocaleString("pt-PT")} kg</span>
                              <span>{zone.capacity_kg.toLocaleString("pt-PT")} kg</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePercent > 90
                                    ? "bg-destructive"
                                    : usagePercent > 70
                                    ? "bg-warning"
                                    : "bg-primary"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
                {compatibleZones.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma zona disponível para o código LER selecionado.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 7: Confirmation */}
        {step === 7 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <h3 className="font-semibold">Resumo da Entrada</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div>
                  <span className="text-muted-foreground">Matrícula:</span>
                  <p className="font-medium font-mono">{draft.vehicle_plate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Motorista:</span>
                  <p className="font-medium">{draft.driver_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">e-GAR:</span>
                  <p className="font-medium font-mono">{draft.egar_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Código LER:</span>
                  <p className="font-medium font-mono">
                    {draft.ler_code}
                    {draft.is_hazardous && (
                      <span className="ml-2 rounded bg-warning-surface px-1.5 py-0.5 text-xs text-warning">
                        Perigoso
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-muted-foreground">Peso Bruto:</span>
                  <p className="font-medium font-mono">{draft.gross_weight_kg?.toLocaleString("pt-PT")} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tara:</span>
                  <p className="font-medium font-mono">{draft.tare_weight_kg?.toLocaleString("pt-PT")} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Peso Líquido:</span>
                  <p className="text-lg font-bold font-mono text-primary">{netWeight?.toLocaleString("pt-PT")} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Inspeção:</span>
                  <p className="font-medium capitalize">{draft.inspection_result.replace("_", " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Área:</span>
                  <p className="font-medium">{areas.find((a) => a.id === draft.storage_area_id)?.name || "—"}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border p-3">
              <input
                type="checkbox"
                id="invoice"
                checked={draft.requires_invoice}
                onChange={(e) => setDraft({ ...draft, requires_invoice: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="invoice" className="text-sm">
                Requer faturação
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between max-w-2xl">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> {tc("back")}
        </button>

        {step < 7 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {tc("next")} <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || draft.inspection_result === "rejected"}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {isSubmitting ? tc("loading") : t("confirmEntry")}
          </button>
        )}
      </div>
    </div>
  );
}
