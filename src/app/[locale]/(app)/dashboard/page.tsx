"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCurrentPark } from "@/hooks/use-current-park";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { StockTab } from "@/components/dashboard/stock-tab";
import { SeasonalityTab } from "@/components/dashboard/seasonality-tab";
import { SuppliersTab } from "@/components/dashboard/suppliers-tab";
import { LotsQualityTab } from "@/components/dashboard/lots-quality-tab";
import { AlertsTab } from "@/components/dashboard/alerts-tab";

type Period = "30d" | "90d" | "6m" | "12m";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
];

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { currentParkId } = useCurrentPark();
  const [period, setPeriod] = useState<Period>("30d");

  if (!currentParkId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">A carregar parque...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("pt-PT", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex rounded-lg border border-border bg-muted p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  period === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Action buttons */}
          <Link
            href="/entries/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-3.5 w-3.5" /> {t("newEntry")}
          </Link>
          <Link
            href="/exits/new"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" /> {t("newExit")}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            Vista Geral
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-xs sm:text-sm">
            Stock e Valorização
          </TabsTrigger>
          <TabsTrigger value="seasonality" className="text-xs sm:text-sm">
            Sazonalidade
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs sm:text-sm">
            Fornecedores
          </TabsTrigger>
          <TabsTrigger value="lots" className="text-xs sm:text-sm">
            Lotes e Qualidade
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs sm:text-sm">
            Alertas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab parkId={currentParkId} period={period} />
        </TabsContent>

        <TabsContent value="stock">
          <StockTab parkId={currentParkId} />
        </TabsContent>

        <TabsContent value="seasonality">
          <SeasonalityTab parkId={currentParkId} />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab parkId={currentParkId} />
        </TabsContent>

        <TabsContent value="lots">
          <LotsQualityTab parkId={currentParkId} />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsTab parkId={currentParkId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
