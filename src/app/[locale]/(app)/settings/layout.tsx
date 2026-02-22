"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Building2,
  MapPin,
  FileCode,
  Warehouse,
  Scale,
  Users,
  Layers3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SETTINGS_NAV = [
  { key: "organization", href: "/settings/organization", icon: Building2 },
  { key: "parks", href: "/settings/parks", icon: MapPin },
  { key: "lerCodes", href: "/settings/ler-codes", icon: FileCode },
  { key: "storageAreas", href: "/settings/areas", icon: Warehouse },
  { key: "zones", href: "/settings/zones", icon: Layers3 },
  { key: "scales", href: "/settings/scales", icon: Scale },
  { key: "users", href: "/settings/users", icon: Users },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("settings");
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      <div className="flex gap-6">
        {/* Settings navigation sidebar */}
        <nav className="hidden w-56 flex-shrink-0 lg:block">
          <ul className="space-y-1">
            {SETTINGS_NAV.map((item) => {
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
        </nav>

        {/* Mobile nav */}
        <div className="mb-4 flex overflow-x-auto lg:hidden">
          {SETTINGS_NAV.map((item) => {
            const isActive = pathname.includes(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.key)}
              </Link>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
