"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  ArrowDownToLine,
  Layers,
  ArrowUpFromLine,
  Package,
  Users,
  Settings,
  Recycle,
  Boxes,
  Truck,
  ClipboardList,
  Map,
  Radio,
  BarChart2,
  UserCheck,
  ChevronDown,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ENTRIES_ITEMS = [
  { key: "entries_records", href: "/entries", icon: ClipboardList },
  { key: "cameras", href: "/cameras", icon: Camera },
] as const;

const NAV_ITEMS_MAIN = [
  { key: "classification", href: "/classification", icon: Layers },
  { key: "lots", href: "/lots", icon: Boxes },
  { key: "exits", href: "/exits", icon: ArrowUpFromLine },
  { key: "stock", href: "/stock", icon: Package },
  { key: "clients", href: "/clients", icon: Users },
] as const;

const LOGISTICS_ITEMS = [
  { key: "logistics_orders", href: "/logistica/pedidos", icon: ClipboardList },
  { key: "logistics_planning", href: "/logistica/planeamento", icon: Map },
  { key: "logistics_tracking", href: "/logistica/tracking", icon: Radio },
  { key: "logistics_vehicles", href: "/logistica/viaturas", icon: Truck },
  { key: "logistics_drivers", href: "/logistica/motoristas", icon: UserCheck },
  { key: "logistics_dashboard", href: "/logistica/dashboard", icon: BarChart2 },
] as const;

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isEntriesActive =
    pathname.includes("/entries") || pathname.includes("/cameras");
  const isLogisticsActive = pathname.includes("/logistica");

  const [entriesOpen, setEntriesOpen] = useState(isEntriesActive);
  const [logisticsOpen, setLogisticsOpen] = useState(isLogisticsActive);

  useEffect(() => {
    if (isEntriesActive) setEntriesOpen(true);
  }, [isEntriesActive]);

  useEffect(() => {
    if (isLogisticsActive) setLogisticsOpen(true);
  }, [isLogisticsActive]);

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[280px] flex-col border-r border-border bg-sidebar lg:flex">
      {/* Logo */}
      <div className="flex h-[70px] items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f93f26]">
          <Recycle className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
        <span className="text-lg font-bold text-foreground">Bee2Waste</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {/* Dashboard */}
          <li>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.includes("/dashboard")
                  ? "bg-primary-surface text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              {t("dashboard")}
            </Link>
          </li>

          {/* Entries Group */}
          <li>
            <button
              onClick={() => setEntriesOpen((o) => !o)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isEntriesActive
                  ? "bg-primary-surface text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <ArrowDownToLine className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left">{t("entries")}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                  entriesOpen && "rotate-180"
                )}
              />
            </button>
            {entriesOpen && (
              <ul className="mt-1 space-y-1 pl-4">
                {ENTRIES_ITEMS.map((item) => {
                  const isActive = pathname.includes(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary-surface text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {t(item.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          {/* Main nav items */}
          {NAV_ITEMS_MAIN.map((item) => {
            const isActive = pathname.includes(item.href);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-surface text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}

          {/* Recolhas (Logistics) Group */}
          <li>
            <button
              onClick={() => setLogisticsOpen((o) => !o)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isLogisticsActive
                  ? "bg-primary-surface text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Truck className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left">{t("logistics")}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                  logisticsOpen && "rotate-180"
                )}
              />
            </button>
            {logisticsOpen && (
              <ul className="mt-1 space-y-1 pl-4">
                {LOGISTICS_ITEMS.map((item) => {
                  const isActive = pathname.includes(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary-surface text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {t(item.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          {/* Settings always last */}
          <li>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.includes("/settings")
                  ? "bg-primary-surface text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {t("settings")}
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
