"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";

interface Park {
  id: string;
  name: string;
  code: string;
  address: string | null;
  license_number: string | null;
  is_active: boolean;
}

export default function ParksPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [parks, setParks] = useState<Park[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPark, setNewPark] = useState({ name: "", code: "", address: "" });

  async function fetchParks() {
    const supabase = createClient();
    const { data } = await supabase
      .from("parks")
      .select("id, name, code, address, license_number, is_active")
      .eq("is_active", true)
      .order("name") as { data: Park[] | null };
    if (data) setParks(data);
    setIsLoading(false);
  }

  useEffect(() => { fetchParks(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const orgId = user.app_metadata?.org_id;
    const { error } = await supabase.from("parks").insert({
      org_id: orgId,
      name: newPark.name,
      code: newPark.code,
      address: newPark.address || null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(tc("success"));
      setShowCreate(false);
      setNewPark({ name: "", code: "", address: "" });
      fetchParks();
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("parks")
      .update({ is_active: false })
      .eq("id", id);

    if (error) toast.error(error.message);
    else fetchParks();
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("parks")}</h2>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {tc("add")}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <input value={newPark.name} onChange={(e) => setNewPark({ ...newPark, name: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Código</label>
              <input value={newPark.code} onChange={(e) => setNewPark({ ...newPark, code: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required maxLength={10} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Morada</label>
            <input value={newPark.address} onChange={(e) => setNewPark({ ...newPark, address: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">{tc("create")}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">{tc("cancel")}</button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Código</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Morada</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Licença</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {parks.map((park) => (
              <tr key={park.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                <td className="px-4 py-3 text-sm">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{park.code}</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium">{park.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{park.address || "—"}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{park.license_number || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/settings/parks/${park.id}`} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(park.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive-surface hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {parks.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{tc("noResults")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
