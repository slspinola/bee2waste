"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCurrentPark } from "@/hooks/use-current-park";
import { createMotorista } from "@/actions/logistics/drivers";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LICENSE_CATEGORIES = ["B", "C", "CE", "C1", "C1E", "ADR"];

export default function NovoMotoristaPage() {
  const router = useRouter();
  const { currentParkId } = useCurrentPark();
  const [isPending, startTransition] = useTransition();
  const [viaturas, setViaturas] = useState<{ id: string; matricula: string }[]>(
    []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    numero_licenca: "",
    licenca_validade: "",
    adr_certificado: false,
    viatura_default_id: "",
    turno_inicio: "07:00",
    turno_fim: "17:00",
  });

  useEffect(() => {
    if (!currentParkId) return;
    createClient()
      .from("viaturas")
      .select("id, matricula")
      .eq("park_id", currentParkId)
      .eq("is_active", true)
      .order("matricula")
      .then(({ data }) => setViaturas(data ?? []));
  }, [currentParkId]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentParkId) {
      toast.error("Selecione um parque primeiro");
      return;
    }
    startTransition(async () => {
      try {
        await createMotorista({
          park_id: currentParkId,
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
        toast.success("Motorista adicionado com sucesso");
        router.push("/logistica/motoristas");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao adicionar motorista"
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/logistica/motoristas">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Adicionar Motorista
          </h1>
          <p className="text-sm text-muted-foreground">
            Registar novo motorista na equipa
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-lg space-y-6 rounded-lg border border-border bg-card p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) =>
                setForm((f) => ({ ...f, nome: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={form.telefone}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="licenca">N.° Carta de Condução</Label>
            <Input
              id="licenca"
              value={form.numero_licenca}
              onChange={(e) =>
                setForm((f) => ({ ...f, numero_licenca: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="validade">Validade da Carta</Label>
            <Input
              id="validade"
              type="date"
              value={form.licenca_validade}
              onChange={(e) =>
                setForm((f) => ({ ...f, licenca_validade: e.target.value }))
              }
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
            <Label htmlFor="viatura">Viatura Padrão</Label>
            <select
              id="viatura"
              value={form.viatura_default_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, viatura_default_id: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Sem viatura padrão</option>
              {viaturas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.matricula}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="turno_inicio">Início do Turno</Label>
            <Input
              id="turno_inicio"
              type="time"
              value={form.turno_inicio}
              onChange={(e) =>
                setForm((f) => ({ ...f, turno_inicio: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="turno_fim">Fim do Turno</Label>
            <Input
              id="turno_fim"
              type="time"
              value={form.turno_fim}
              onChange={(e) =>
                setForm((f) => ({ ...f, turno_fim: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "A guardar..." : "Adicionar Motorista"}
          </Button>
          <Link href="/logistica/motoristas">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
