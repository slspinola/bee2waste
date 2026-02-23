"use client";

import { use, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateMotorista } from "@/actions/logistics/drivers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  Truck,
  Pencil,
  X,
  User,
} from "lucide-react";

type Motorista = {
  id: string;
  park_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  numero_licenca: string | null;
  categorias_licenca: string[];
  licenca_validade: string | null;
  adr_certificado: boolean;
  viatura_default_id: string | null;
  turno_inicio: string | null;
  turno_fim: string | null;
  is_active: boolean;
  viaturas: { matricula: string } | null;
};

type RotaResumida = {
  id: string;
  numero_rota: string;
  data_rota: string;
  status: string;
};

const LICENSE_CATEGORIES = ["B", "C", "CE", "C1", "C1E", "ADR"];

const ROTA_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  confirmed: "Confirmada",
  on_execution: "Em Execução",
  completed: "Concluída",
};

export default function MotoristaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [rotas, setRotas] = useState<RotaResumida[]>([]);
  const [viaturas, setViaturas] = useState<{ id: string; matricula: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    numero_licenca: "",
    licenca_validade: "",
    adr_certificado: false,
    viatura_default_id: "",
    turno_inicio: "",
    turno_fim: "",
    is_active: true,
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("motoristas")
      .select(
        "id, park_id, nome, telefone, email, numero_licenca, categorias_licenca, licenca_validade, adr_certificado, viatura_default_id, turno_inicio, turno_fim, is_active, viaturas:viatura_default_id(matricula)"
      )
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        const m = data as unknown as Motorista;
        setMotorista(m);
        setForm({
          nome: m.nome,
          telefone: m.telefone ?? "",
          email: m.email ?? "",
          numero_licenca: m.numero_licenca ?? "",
          licenca_validade: m.licenca_validade ?? "",
          adr_certificado: m.adr_certificado,
          viatura_default_id: m.viatura_default_id ?? "",
          turno_inicio: m.turno_inicio ?? "",
          turno_fim: m.turno_fim ?? "",
          is_active: m.is_active,
        });
        setSelectedCategories(m.categorias_licenca ?? []);
        setLoading(false);

        // Load viaturas for the same park
        supabase
          .from("viaturas")
          .select("id, matricula")
          .eq("park_id", m.park_id)
          .eq("is_active", true)
          .order("matricula")
          .then(({ data: v }) => setViaturas(v ?? []));
      });

    supabase
      .from("rotas")
      .select("id, numero_rota, data_rota, status")
      .eq("motorista_id", id)
      .order("data_rota", { ascending: false })
      .limit(10)
      .then(({ data }) => setRotas((data as RotaResumida[]) ?? []));
  }, [id]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateMotorista(id, {
          nome: form.nome,
          telefone: form.telefone || undefined,
          email: form.email || undefined,
          numero_licenca: form.numero_licenca || undefined,
          categorias_licenca: selectedCategories,
          licenca_validade: form.licenca_validade || undefined,
          adr_certificado: form.adr_certificado,
          viatura_default_id: form.viatura_default_id || undefined,
          turno_inicio: form.turno_inicio || undefined,
          turno_fim: form.turno_fim || undefined,
        });
        setMotorista((m) =>
          m
            ? {
                ...m,
                nome: form.nome,
                telefone: form.telefone || null,
                email: form.email || null,
                numero_licenca: form.numero_licenca || null,
                categorias_licenca: selectedCategories,
                licenca_validade: form.licenca_validade || null,
                adr_certificado: form.adr_certificado,
                viatura_default_id: form.viatura_default_id || null,
                turno_inicio: form.turno_inicio || null,
                turno_fim: form.turno_fim || null,
                viaturas: form.viatura_default_id
                  ? viaturas.find((v) => v.id === form.viatura_default_id)
                    ? { matricula: viaturas.find((v) => v.id === form.viatura_default_id)!.matricula }
                    : null
                  : null,
              }
            : m
        );
        setEditing(false);
        toast.success("Motorista atualizado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao guardar");
      }
    });
  };

  if (loading)
    return <div className="p-8 text-center text-sm text-muted-foreground">A carregar...</div>;
  if (!motorista)
    return <div className="p-8 text-center text-sm text-muted-foreground">Motorista não encontrado</div>;

  const licencaExpirada =
    motorista.licenca_validade &&
    new Date(motorista.licenca_validade).getTime() < Date.now();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/logistica/motoristas">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Motoristas
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">{motorista.nome}</h1>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  motorista.is_active
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}
              >
                {motorista.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
              {motorista.categorias_licenca?.map((c) => (
                <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                  {c}
                </span>
              ))}
              {motorista.adr_certificado && (
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  ADR
                </span>
              )}
            </div>
          </div>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-lg border border-border bg-card p-6 max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Editar Motorista</h2>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit-nome">Nome Completo *</Label>
              <Input
                id="edit-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-tel">Telefone</Label>
              <Input
                id="edit-tel"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-licenca">N.° Carta</Label>
              <Input
                id="edit-licenca"
                value={form.numero_licenca}
                onChange={(e) => setForm((f) => ({ ...f, numero_licenca: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-validade">Validade</Label>
              <Input
                id="edit-validade"
                type="date"
                value={form.licenca_validade}
                onChange={(e) => setForm((f) => ({ ...f, licenca_validade: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Categorias</Label>
              <div className="flex flex-wrap gap-2">
                {LICENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "rounded-md border px-3 py-1 text-sm font-medium transition-colors",
                      selectedCategories.includes(cat)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="edit-viatura">Viatura Padrão</Label>
              <select
                id="edit-viatura"
                value={form.viatura_default_id}
                onChange={(e) => setForm((f) => ({ ...f, viatura_default_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Sem viatura padrão</option>
                {viaturas.map((v) => (
                  <option key={v.id} value={v.id}>{v.matricula}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-turno-i">Início do Turno</Label>
              <Input
                id="edit-turno-i"
                type="time"
                value={form.turno_inicio}
                onChange={(e) => setForm((f) => ({ ...f, turno_inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-turno-f">Fim do Turno</Label>
              <Input
                id="edit-turno-f"
                type="time"
                value={form.turno_fim}
                onChange={(e) => setForm((f) => ({ ...f, turno_fim: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input
                id="edit-ativo"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="edit-ativo">Motorista ativo</Label>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "A guardar..." : "Guardar"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Info cards */}
      {!editing && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Contacto
            </div>
            {motorista.telefone && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {motorista.telefone}
              </div>
            )}
            {motorista.email && (
              <div className="flex items-center gap-2 text-sm text-foreground mt-1">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {motorista.email}
              </div>
            )}
            {!motorista.telefone && !motorista.email && (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Carta de Condução</p>
            {motorista.numero_licenca && (
              <p className="font-mono text-sm font-medium text-foreground">
                {motorista.numero_licenca}
              </p>
            )}
            {motorista.licenca_validade && (
              <p
                className={cn(
                  "text-xs mt-1",
                  licencaExpirada
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                )}
              >
                Válida até:{" "}
                {new Date(motorista.licenca_validade).toLocaleDateString("pt-PT")}
                {licencaExpirada ? " (Expirada)" : ""}
              </p>
            )}
            {!motorista.numero_licenca && !motorista.licenca_validade && (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Turno
            </div>
            {motorista.turno_inicio && motorista.turno_fim ? (
              <p className="text-sm font-medium text-foreground">
                {motorista.turno_inicio.slice(0, 5)} – {motorista.turno_fim.slice(0, 5)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {motorista.viaturas && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Truck className="h-4 w-4" />
                Viatura Padrão
              </div>
              <p className="font-mono text-sm font-medium text-foreground">
                {motorista.viaturas.matricula}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent routes */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Rotas Recentes</h2>
        {rotas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem rotas registadas para este motorista.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rota</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rotas.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/logistica/rotas/${r.id}`}
                        className="font-mono font-medium text-primary hover:underline"
                      >
                        {r.numero_rota}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.data_rota).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ROTA_STATUS_LABELS[r.status] ?? r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
