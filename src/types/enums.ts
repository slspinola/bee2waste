export const USER_ROLES = [
  "admin",
  "park_manager",
  "scale_operator",
  "classifier",
  "commercial_manager",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ENTRY_STATUSES = [
  "pending",
  "weighing_gross",
  "egar_validated",
  "inspected",
  "weighing_tare",
  "allocated",
  "confirmed",
  "cancelled",
] as const;

export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const EXIT_TYPES = ["treatment", "client", "group"] as const;
export type ExitType = (typeof EXIT_TYPES)[number];

export const CLIENT_TYPES = ["supplier", "buyer", "both"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const AREA_TYPES = [
  "physical",
  "logical",
  "vfv",
  "sorting_line",
  "warehouse",
] as const;
export type AreaType = (typeof AREA_TYPES)[number];

export const NC_STATUSES = [
  "open",
  "investigating",
  "resolved",
  "closed",
] as const;
export type NCStatus = (typeof NC_STATUSES)[number];

export const WEIGHING_TYPES = ["gross", "tare", "internal"] as const;
export type WeighingType = (typeof WEIGHING_TYPES)[number];

export const STOCK_MOVEMENT_TYPES = [
  "entry",
  "exit",
  "transfer_in",
  "transfer_out",
  "classification_in",
  "classification_out",
  "adjustment",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

// ============================================================
// LOGISTICS MODULE ENUMS
// ============================================================

export const VEHICLE_STATUSES = [
  "available",
  "on_route",
  "in_maintenance",
  "inactive",
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_TYPES = [
  "open_body",
  "container",
  "compactor",
  "tank",
  "flatbed",
  "other",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const ORDER_STATUSES = [
  "draft",
  "pending",
  "planned",
  "on_route",
  "at_client",
  "completed",
  "failed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PRIORITIES = ["normal", "urgent", "critical"] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export const ROUTE_STATUSES = [
  "draft",
  "confirmed",
  "on_execution",
  "completed",
  "cancelled",
] as const;
export type RouteStatus = (typeof ROUTE_STATUSES)[number];

export const STOP_STATUSES = [
  "pending",
  "at_client",
  "completed",
  "failed",
  "skipped",
] as const;
export type StopStatus = (typeof STOP_STATUSES)[number];

export const SHIFT_STATUSES = [
  "scheduled",
  "active",
  "completed",
  "absent",
  "cancelled",
] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];
