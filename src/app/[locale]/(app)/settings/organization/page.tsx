"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Building2, Save } from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  nif: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export default function OrganizationPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchOrg() {
      const supabase = createClient();
      const { data } = await supabase
        .from("organizations")
        .select("id, name, nif, address, phone, email")
        .single() as { data: Organization | null };
      if (data) setOrg(data);
      setIsLoading(false);
    }
    fetchOrg();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        name: org.name,
        nif: org.nif,
        address: org.address,
        phone: org.phone,
        email: org.email,
      })
      .eq("id", org.id);

    if (error) {
      toast.error(tc("error"));
    } else {
      toast.success(tc("success"));
    }
    setIsSaving(false);
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>;
  }

  if (!org) {
    return <p className="text-muted-foreground">{tc("noResults")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{t("organization")}</h2>
      </div>

      <form onSubmit={handleSave} className="max-w-xl space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome</label>
          <input
            value={org.name}
            onChange={(e) => setOrg({ ...org, name: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">NIF</label>
          <input
            value={org.nif || ""}
            onChange={(e) => setOrg({ ...org, nif: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Morada</label>
          <input
            value={org.address || ""}
            onChange={(e) => setOrg({ ...org, address: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone</label>
            <input
              value={org.phone || ""}
              onChange={(e) => setOrg({ ...org, phone: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={org.email || ""}
              onChange={(e) => setOrg({ ...org, email: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? tc("loading") : tc("save")}
        </button>
      </form>
    </div>
  );
}
