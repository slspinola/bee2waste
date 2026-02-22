"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCurrentPark } from "@/hooks/use-current-park";
import { createClient } from "@/lib/supabase/client";
import { MapPin, ChevronDown } from "lucide-react";

interface Park {
  id: string;
  name: string;
  code: string;
}

export function ParkSelector() {
  const t = useTranslations("nav");
  const { currentParkId, setPark } = useCurrentPark();
  const [parks, setParks] = useState<Park[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetchParks() {
      const supabase = createClient();
      const { data } = await supabase
        .from("parks")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name") as { data: Park[] | null };

      if (data) setParks(data);
      if (data && data.length > 0 && !currentParkId) {
        setPark(data[0].id);
      }
    }
    fetchParks();
  }, [currentParkId, setPark]);

  const selectedPark = parks.find((p) => p.id === currentParkId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
      >
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[150px] truncate">
          {selectedPark?.name || t("selectPark")}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-card py-1 shadow-lg">
            {parks.map((park) => (
              <button
                key={park.id}
                onClick={() => {
                  setPark(park.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent ${
                  park.id === currentParkId
                    ? "bg-primary-surface text-primary"
                    : "text-foreground"
                }`}
              >
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {park.code}
                </span>
                {park.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
