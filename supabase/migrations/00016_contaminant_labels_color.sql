-- Add color column to contaminant_labels
-- Allows associating a display color with each waste type key.
-- Stored as a CSS hex color string (e.g. "#ef4444"). Nullable — no color means default styling.

ALTER TABLE contaminant_labels
  ADD COLUMN IF NOT EXISTS color TEXT;
