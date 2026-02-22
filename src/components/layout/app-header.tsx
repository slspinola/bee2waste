"use client";

import { ParkSelector } from "./park-selector";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { Breadcrumbs } from "./breadcrumbs";
import { Menu } from "lucide-react";
import { useState } from "react";
import { MobileSidebar } from "./mobile-sidebar";

export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-border bg-card px-4 lg:px-6">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-3">
          <ParkSelector />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
