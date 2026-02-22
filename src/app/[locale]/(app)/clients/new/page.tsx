"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function NewClientPage() {
  const tc = useTranslations("common");
  const t = useTranslations("clients");
  const { currentParkId } = useCurrentPark();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    nif: "",
    client_type: "supplier" as "supplier" | "buyer" | "both",
    address: "",
    city: "",
    postal_code: "",
    phone: "",
    email: "",
    contact_person: "",
    apa_number: "",
    payment_terms_days: "30",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentParkId) return;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user?.app_metadata?.org_id;

      const { data: client, error } = await supabase
        .from("clients")
        .insert({
          org_id: orgId,
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
        })
        .select("id")
        .single() as { data: { id: string } | null; error: unknown };

      if (error || !client) {
        toast.error("Erro ao criar cliente");
        setIsSubmitting(false);
        return;
      }

      // Associate with current park
      await supabase.from("client_park_associations").insert({
        client_id: client.id,
        park_id: currentParkId,
      });

      toast.success("Cliente criado com sucesso!");
      setForm({
        name: "", nif: "", client_type: "supplier", address: "", city: "",
        postal_code: "", phone: "", email: "", contact_person: "",
        apa_number: "", payment_terms_days: "30", notes: "",
      });
    } catch {
      toast.error("Erro ao criar cliente");
    }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("title")}
      </Link>

      <h1 className="text-xl font-semibold">{t("newClient")}</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Client Type */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">{t("type")}</h3>
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
              <label className="text-sm font-medium">{t("clientName")}</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("nif")}</label>
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
          <h3 className="font-semibold">{t("contacts")}</h3>
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

        {/* Notes */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Notas</h3>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {isSubmitting ? tc("loading") : tc("create")}
          </button>
          <Link href="/clients" className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            {tc("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
