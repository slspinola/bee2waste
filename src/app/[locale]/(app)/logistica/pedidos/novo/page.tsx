"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCurrentPark } from "@/hooks/use-current-park";
import { createPedidoRecolha } from "@/actions/logistics/orders";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Client = { id: string; name: string; city: string | null };
type LerCode = { id: string; code: string; description: string };

const STEPS = ["Cliente & Resíduo", "Localização", "Agendamento"];

export default function NovoPedidoPage() {
  const router = useRouter();
  const { currentParkId } = useCurrentPark();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [clients, setClients] = useState<Client[]>([]);
  const [lerCodes, setLerCodes] = useState<LerCode[]>([]);
  const [form, setForm] = useState({
    client_id: "",
    ler_code_id: "",
    ler_code: "",
    descricao_residuo: "",
    quantidade_estimada_kg: "",
    morada_recolha: "",
    cidade_recolha: "",
    codigo_postal_recolha: "",
    contacto_local: "",
    instrucoes_especiais: "",
    prioridade: "normal" as "normal" | "urgent" | "critical",
    data_preferida_inicio: "",
    data_preferida_fim: "",
    sla_deadline: "",
    notas: "",
  });

  useEffect(() => {
    if (!currentParkId) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("clients").select("id, name, city").order("name"),
      supabase
        .from("park_ler_authorizations")
        .select("ler_codes:ler_code_id(id, code, description)")
        .eq("park_id", currentParkId),
    ]).then(([clientRes, lerRes]) => {
      setClients(clientRes.data ?? []);
      const lers = (lerRes.data ?? [])
        .map((r: { ler_codes: LerCode | LerCode[] | null }) => {
          const lc = r.ler_codes;
          return Array.isArray(lc) ? lc[0] : lc;
        })
        .filter(Boolean) as LerCode[];
      setLerCodes(lers);
    });
  }, [currentParkId]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleLerChange = (id: string) => {
    const ler = lerCodes.find((l) => l.id === id);
    setForm((f) => ({ ...f, ler_code_id: id, ler_code: ler?.code ?? "" }));
  };

  const handleSubmit = () => {
    if (!currentParkId) return toast.error("Selecione um parque primeiro");
    startTransition(async () => {
      try {
        await createPedidoRecolha({
          park_id: currentParkId,
          client_id: form.client_id || undefined,
          ler_code_id: form.ler_code_id || undefined,
          ler_code: form.ler_code || undefined,
          descricao_residuo: form.descricao_residuo || undefined,
          quantidade_estimada_kg: form.quantidade_estimada_kg
            ? parseFloat(form.quantidade_estimada_kg)
            : undefined,
          morada_recolha: form.morada_recolha,
          cidade_recolha: form.cidade_recolha || undefined,
          codigo_postal_recolha: form.codigo_postal_recolha || undefined,
          contacto_local: form.contacto_local || undefined,
          instrucoes_especiais: form.instrucoes_especiais || undefined,
          prioridade: form.prioridade,
          data_preferida_inicio: form.data_preferida_inicio || undefined,
          data_preferida_fim: form.data_preferida_fim || undefined,
          sla_deadline: form.sla_deadline || undefined,
          notas: form.notas || undefined,
        });
        toast.success("Pedido criado com sucesso");
        router.push("/logistica/pedidos");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao criar pedido"
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/logistica/pedidos">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Novo Pedido de Recolha
          </h1>
          <p className="text-sm text-muted-foreground">
            Passo {step + 1} de {STEPS.length}
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                i <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-sm",
                i === step
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-1 h-px w-8 bg-border" />
            )}
          </div>
        ))}
      </div>

      <div className="max-w-lg rounded-lg border border-border bg-card p-6">
        {/* Step 0: Client & Waste */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="client">Cliente</Label>
              <select
                id="client"
                value={form.client_id}
                onChange={(e) => set("client_id", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecionar cliente (opcional)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ler">Código LER</Label>
              <select
                id="ler"
                value={form.ler_code_id}
                onChange={(e) => handleLerChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecionar LER (opcional)</option>
                {lerCodes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição do Resíduo</Label>
              <Input
                id="descricao"
                placeholder="Descrever o resíduo..."
                value={form.descricao_residuo}
                onChange={(e) => set("descricao_residuo", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qtd">Quantidade Estimada (kg)</Label>
              <Input
                id="qtd"
                type="number"
                min="0"
                step="100"
                placeholder="5000"
                value={form.quantidade_estimada_kg}
                onChange={(e) =>
                  set("quantidade_estimada_kg", e.target.value)
                }
              />
            </div>
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="morada">
                Morada de Recolha{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="morada"
                placeholder="Rua, número..."
                value={form.morada_recolha}
                onChange={(e) => set("morada_recolha", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={form.cidade_recolha}
                  onChange={(e) => set("cidade_recolha", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp">Código Postal</Label>
                <Input
                  id="cp"
                  placeholder="0000-000"
                  value={form.codigo_postal_recolha}
                  onChange={(e) =>
                    set("codigo_postal_recolha", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contacto">Contacto no Local</Label>
              <Input
                id="contacto"
                placeholder="Nome e telefone"
                value={form.contacto_local}
                onChange={(e) => set("contacto_local", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instrucoes">Instruções Especiais</Label>
              <Input
                id="instrucoes"
                placeholder="Acesso, horários, equipamento necessário..."
                value={form.instrucoes_especiais}
                onChange={(e) =>
                  set("instrucoes_especiais", e.target.value)
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              As coordenadas serão geocodificadas automaticamente a partir da
              morada.
            </p>
          </div>
        )}

        {/* Step 2: Scheduling */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <div className="flex gap-2">
                {(["normal", "urgent", "critical"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set("prioridade", p)}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      form.prioridade === p
                        ? p === "critical"
                          ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700"
                          : p === "urgent"
                            ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700"
                            : "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {p === "normal"
                      ? "Normal"
                      : p === "urgent"
                        ? "Urgente"
                        : "Crítico"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inicio">Data Preferida (início)</Label>
                <Input
                  id="inicio"
                  type="date"
                  value={form.data_preferida_inicio}
                  onChange={(e) =>
                    set("data_preferida_inicio", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fim">Data Preferida (fim)</Label>
                <Input
                  id="fim"
                  type="date"
                  value={form.data_preferida_fim}
                  onChange={(e) =>
                    set("data_preferida_fim", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sla">Prazo SLA</Label>
              <Input
                id="sla"
                type="datetime-local"
                value={form.sla_deadline}
                onChange={(e) => set("sla_deadline", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notas">Notas Internas</Label>
              <Input
                id="notas"
                value={form.notas}
                onChange={(e) => set("notas", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 1 && !form.morada_recolha)
                  return toast.error("Morada de recolha é obrigatória");
                setStep((s) => s + 1);
              }}
              className="ml-auto"
            >
              Seguinte
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="ml-auto"
            >
              {isPending ? "A criar..." : "Criar Pedido"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
