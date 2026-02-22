"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "nav.dashboard",
  entries: "nav.entries",
  classification: "nav.classification",
  exits: "nav.exits",
  stock: "nav.stock",
  clients: "nav.clients",
  settings: "nav.settings",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations();

  // Remove locale prefix and split
  const segments = pathname
    .replace(/^\/(pt|en)/, "")
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:block">
      <ol className="flex items-center gap-1 text-sm">
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;
          const labelKey = ROUTE_LABELS[segment];
          const label = labelKey ? t(labelKey) : segment;

          return (
            <li key={segment} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {isLast ? (
                <span className="font-medium text-foreground">{label}</span>
              ) : (
                <Link
                  href={href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
