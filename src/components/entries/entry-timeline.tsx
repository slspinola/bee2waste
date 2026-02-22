"use client";

import {
  Truck, Scale, FileCheck, ClipboardCheck, Package, CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  status: string;
  label: string;
  timestamp?: string;
  detail?: string;
}

interface EntryTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

const STATUS_ICONS: Record<string, typeof Truck> = {
  draft: Truck,
  vehicle_arrived: Truck,
  gross_weighed: Scale,
  egar_validated: FileCheck,
  inspected: ClipboardCheck,
  tare_weighed: Scale,
  classified: Package,
  stored: Package,
  confirmed: CheckCircle,
};

export function EntryTimeline({ events, currentStatus }: EntryTimelineProps) {
  return (
    <div className="space-y-1">
      {events.map((event, idx) => {
        const isCompleted = !!event.timestamp;
        const isCurrent = event.status === currentStatus;
        const Icon = STATUS_ICONS[event.status] || CheckCircle;

        return (
          <div key={event.status} className="flex gap-3">
            {/* Line + circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && !isCompleted && "border-2 border-primary bg-background text-primary",
                  !isCompleted && !isCurrent && "border-2 border-border bg-background text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              {idx < events.length - 1 && (
                <div className={cn(
                  "w-0.5 flex-1 min-h-[20px]",
                  isCompleted ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>

            {/* Content */}
            <div className="pb-4">
              <p className={cn(
                "text-sm font-medium",
                !isCompleted && !isCurrent && "text-muted-foreground"
              )}>
                {event.label}
              </p>
              {event.timestamp && (
                <p className="text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleString("pt-PT")}
                </p>
              )}
              {event.detail && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
