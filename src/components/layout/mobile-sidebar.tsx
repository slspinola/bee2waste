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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "entries", href: "/entries", icon: ArrowDownToLine },
  { key: "classification", href: "/classification", icon: Layers },
  { key: "exits", href: "/exits", icon: ArrowUpFromLine },
  { key: "stock", href: "/stock", icon: Package },
  { key: "clients", href: "/clients", icon: Users },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-sidebar shadow-lg lg:hidden">
        <div className="flex h-[70px] items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f93f26]">
              <Recycle className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-lg font-bold text-foreground">Bee2Waste</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.includes(item.href);
              const Icon = item.icon;

              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={onClose}
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
      </div>
    </>
  );
}
