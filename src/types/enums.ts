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
