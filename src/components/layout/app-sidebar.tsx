"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "entries", href: "/entries", icon: ArrowDownToLine },
  { key: "classification", href: "/classification", icon: Layers },
  { key: "lots", href: "/lots", icon: Boxes },
  { key: "exits", href: "/exits", icon: ArrowUpFromLine },
  { key: "stock", href: "/stock", icon: Package },
  { key: "clients", href: "/clients", icon: Users },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

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
          {NAV_ITEMS.map((item) => {
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
        </ul>
      </nav>
    </aside>
  );
}
