"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";

interface Park {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
}

export default function ParkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tc = useTranslations("common");
  const [park, setPark] = useState<Park | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchPark() {
      const supabase = createClient();
      const { data } = await supabase
        .from("parks")
        .select("id, name, code, address, phone, email, license_number, license_expiry")
        .eq("id", id)
        .single() as { data: Park | null };
      if (data) setPark(data);
      setIsLoading(false);
    }
    fetchPark();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!park) return;
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("parks")
      .update({
        name: park.name,
        code: park.code,
        address: park.address,
        phone: park.phone,
        email: park.email,
        license_number: park.license_number,
        license_expiry: park.license_expiry,
      })
      .eq("id", park.id);

    if (error) toast.error(error.message);
    else toast.success(tc("success"));
    setIsSaving(false);
  }

  if (isLoading || !park) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/settings/parks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h2 className="text-lg font-semibold">{park.name}</h2>

      <form onSubmit={handleSave} className="max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <input value={park.name} onChange={(e) => setPark({ ...park, name: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Código</label>
            <input value={park.code} onChange={(e) => setPark({ ...park, code: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Morada</label>
          <input value={park.address || ""} onChange={(e) => setPark({ ...park, address: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone</label>
            <input value={park.phone || ""} onChange={(e) => setPark({ ...park, phone: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input type="email" value={park.email || ""} onChange={(e) => setPark({ ...park, email: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nº Licença</label>
            <input value={park.license_number || ""} onChange={(e) => setPark({ ...park, license_number: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Validade Licença</label>
            <input type="date" value={park.license_expiry || ""} onChange={(e) => setPark({ ...park, license_expiry: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
          <Save className="h-4 w-4" />
          {isSaving ? tc("loading") : tc("save")}
        </button>
      </form>
    </div>
  );
}
