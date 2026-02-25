-- ROLLBACK: Undoes the BrighterBins integration (00013_brighterbins.sql)
-- Run this to remove all BrighterBins-related objects from the database.

DROP TABLE IF EXISTS entrada_vision_readings CASCADE;
DROP TABLE IF EXISTS brighterbins_sync_state CASCADE;
DROP TABLE IF EXISTS park_brighterbins_devices CASCADE;
DROP FUNCTION IF EXISTS get_top_contaminants(UUID, INT);
