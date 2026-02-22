"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";
import { FileCode, Search, AlertTriangle } from "lucide-react";

interface LerCode {
  id: string;
  code: string;
  description_pt: string;
  is_hazardous: boolean;
  chapter: string;
}

interface ParkAuth {
  id: string;
  ler_code_id: string;
  operation_type: string;
  ler_codes: LerCode;
}

export default function LerCodesPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { currentParkId } = useCurrentPark();
  const [allCodes, setAllCodes] = useState<LerCode[]>([]);
  const [authorized, setAuthorized] = useState<ParkAuth[]>([]);
  const [search, setSearch] = useState("");
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();

      const { data: codes } = await supabase
        .from("ler_codes")
        .select("id, code, description_pt, is_hazardous, chapter")
        .eq("is_active", true)
        .order("code") as { data: LerCode[] | null };

      if (codes) setAllCodes(codes);

      if (currentParkId) {
        const { data: auths } = await supabase
          .from("park_ler_authorizations")
          .select("id, ler_code_id, operation_type, ler_codes(id, code, description_pt, is_hazardous, chapter)")
          .eq("park_id", currentParkId)
          .eq("is_active", true) as { data: ParkAuth[] | null };

        if (auths) setAuthorized(auths);
      }
      setIsLoading(false);
    }
    fetch();
  }, [currentParkId]);

  const authorizedIds = new Set(authorized.map((a) => a.ler_code_id));

  const filteredCodes = allCodes.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description_pt.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleAuthorization(codeId: string) {
    if (!currentParkId) return;
    const supabase = createClient();

    if (authorizedIds.has(codeId)) {
      const auth = authorized.find((a) => a.ler_code_id === codeId);
      if (auth) {
        await supabase.from("park_ler_authorizations").delete().eq("id", auth.id);
        setAuthorized(authorized.filter((a) => a.id !== auth.id));
      }
    } else {
      const { data } = await supabase
        .from("park_ler_authorizations")
        .insert({ park_id: currentParkId, ler_code_id: codeId, operation_type: "reception" })
        .select("id, ler_code_id, operation_type")
        .single() as { data: { id: string; ler_code_id: string; operation_type: string } | null };

      if (data) {
        const code = allCodes.find((c) => c.id === codeId)!;
        setAuthorized([...authorized, { ...data, ler_codes: code }]);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileCode className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{t("lerCodes")}</h2>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-4 text-sm text-muted-foreground">
          Códigos LER autorizados para o parque selecionado. Ative/desative os códigos conforme a licença.
        </p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${tc("search")} códigos LER...`}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
          />
        </div>

        <div className="max-h-[500px] overflow-y-auto rounded-md border border-border">
          {filteredCodes.map((code) => (
            <label
              key={code.id}
              className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 hover:bg-accent/50"
            >
              <input
                type="checkbox"
                checked={authorizedIds.has(code.id)}
                onChange={() => toggleAuthorization(code.id)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium">
                {code.code}
              </span>
              {code.is_hazardous && (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              <span className="text-sm">{code.description_pt}</span>
            </label>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {authorized.length} códigos autorizados de {allCodes.length} disponíveis
        </p>
      </div>
    </div>
  );
}
