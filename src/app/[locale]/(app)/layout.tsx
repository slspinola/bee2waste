import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { ParkProvider } from "@/hooks/use-current-park";
import { ContaminantLabelsProvider } from "@/hooks/use-contaminant-labels";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ParkProvider>
      <ContaminantLabelsProvider>
        <div className="min-h-screen bg-background">
          <AppSidebar />
          <div className="lg:pl-[280px]">
            <AppHeader />
            <main className="mx-auto max-w-[1400px] p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </ContaminantLabelsProvider>
    </ParkProvider>
  );
}
