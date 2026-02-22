"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Trash2, Shield } from "lucide-react";

interface UserAccess {
  id: string;
  role: string;
  is_active: boolean;
  profiles: {
    id: string;
    full_name: string | null;
  };
  parks: {
    id: string;
    name: string;
    code: string;
  };
}

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "park_manager", label: "Gestor de Parque" },
  { value: "scale_operator", label: "Operador de Balança" },
  { value: "classifier", label: "Classificador" },
  { value: "commercial_manager", label: "Gestor Comercial" },
];

export default function UsersPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [, setIsLoading] = useState(true);

  async function fetchUsers() {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_park_access")
      .select("id, role, is_active, profiles(id, full_name), parks(id, name, code)")
      .eq("is_active", true)
      .order("role") as { data: UserAccess[] | null };
    if (data) setUsers(data);
    setIsLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleRemove(id: string) {
    const supabase = createClient();
    await supabase.from("user_park_access").update({ is_active: false }).eq("id", id);
    fetchUsers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("users")}</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> {t("inviteUser")}
        </button>
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Utilizador</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Parque</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Perfil</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((ua) => (
              <tr key={ua.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                <td className="px-4 py-3 text-sm font-medium">{ua.profiles?.full_name || "—"}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{ua.parks?.code}</span>
                  <span className="ml-2 text-muted-foreground">{ua.parks?.name}</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-surface px-2.5 py-0.5 text-xs font-medium text-primary">
                    <Shield className="h-3 w-3" />
                    {ROLES.find((r) => r.value === ua.role)?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleRemove(ua.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive-surface hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">{tc("noResults")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
