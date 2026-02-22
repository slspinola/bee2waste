"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ClientForm {
  name: string;
  nif: string;
  client_type: "supplier" | "buyer" | "both";
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  contact_person: string;
  apa_number: string;
  payment_terms_days: string;
  notes: string;
  is_active: boolean;
}

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<ClientForm>({
    name: "",
    nif: "",
    client_type: "supplier",
    address: "",
    city: "",
    postal_code: "",
    phone: "",
    email: "",
    contact_person: "",
    apa_number: "",
    payment_terms_days: "30",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    async function fetchClient() {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setForm({
          name: data.name || "",
          nif: data.nif || "",
          client_type: data.client_type || "supplier",
          address: data.address || "",
          city: data.city || "",
          postal_code: data.postal_code || "",
          phone: data.phone || "",
          email: data.email || "",
          contact_person: data.contact_person || "",
          apa_number: data.apa_number || "",
          payment_terms_days: String(data.payment_terms_days || 30),
          notes: data.notes || "",
          is_active: data.is_active ?? true,
        });
      }
      setIsLoading(false);
    }
    fetchClient();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("clients")
        .update({
          name: form.name,
          nif: form.nif || null,
          client_type: form.client_type,
          address: form.address || null,
          city: form.city || null,
          postal_code: form.postal_code || null,
          phone: form.phone || null,
          email: form.email || null,
          contact_person: form.contact_person || null,
          apa_number: form.apa_number || null,
          payment_terms_days: parseInt(form.payment_terms_days) || 30,
          notes: form.notes || null,
          is_active: form.is_active,
        })
        .eq("id", id);

      if (error) {
        toast.error("Erro ao atualizar cliente");
        setIsSubmitting(false);
        return;
      }

      toast.success("Cliente atualizado com sucesso!");
      router.push(`/clients/${id}`);
    } catch {
      toast.error("Erro ao atualizar cliente");
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/clients/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao cliente
      </Link>

      <h1 className="text-xl font-semibold">Editar Cliente</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Client Type */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Tipo</h3>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "supplier", label: "Fornecedor", desc: "Entrega resíduos" },
              { value: "buyer", label: "Comprador", desc: "Compra materiais" },
              { value: "both", label: "Ambos", desc: "Fornecedor e comprador" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, client_type: opt.value })}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  form.client_type === opt.value
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

        {/* Identification */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Identificação</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">NIF</label>
              <input
                value={form.nif}
                onChange={(e) => setForm({ ...form, nif: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nº APA</label>
              <input
                value={form.apa_number}
                onChange={(e) => setForm({ ...form, apa_number: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prazo Pagamento (dias)</label>
              <input
                type="number"
                min="0"
                value={form.payment_terms_days}
                onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Morada</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Morada</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Código Postal</label>
                <input
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Contactos</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pessoa de Contacto</label>
              <input
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Notes + Status */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Notas</h3>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Cliente ativo</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting ? "A guardar..." : "Guardar Alterações"}
          </button>
          <Link
            href={`/clients/${id}`}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
