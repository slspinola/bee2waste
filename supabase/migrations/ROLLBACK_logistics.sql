-- ============================================================
-- ROLLBACK: Undo all logistics migration changes (00012_logistics)
-- Run this only if you need to fully revert the logistics module.
-- ============================================================

-- Remove FK columns from entries
ALTER TABLE entries DROP COLUMN IF EXISTS pedido_recolha_id;
ALTER TABLE entries DROP COLUMN IF EXISTS rota_id;

-- Remove geocoding columns from clients
ALTER TABLE clients DROP COLUMN IF EXISTS lat;
ALTER TABLE clients DROP COLUMN IF EXISTS lng;
ALTER TABLE clients DROP COLUMN IF EXISTS address_geocoded_at;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS manutencao_viaturas CASCADE;
DROP TABLE IF EXISTS turnos_motoristas CASCADE;
DROP TABLE IF EXISTS posicoes_viaturas CASCADE;
DROP TABLE IF EXISTS rota_paragens CASCADE;
DROP TABLE IF EXISTS rotas CASCADE;
DROP TABLE IF EXISTS pedidos_recolha CASCADE;
DROP TABLE IF EXISTS motoristas CASCADE;
DROP TABLE IF EXISTS viaturas CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS generate_numero_pedido(UUID);
DROP FUNCTION IF EXISTS generate_numero_rota(UUID);

-- Drop custom types
DROP TYPE IF EXISTS maintenance_type;
DROP TYPE IF EXISTS shift_status;
DROP TYPE IF EXISTS stop_status;
DROP TYPE IF EXISTS route_status;
DROP TYPE IF EXISTS order_priority;
DROP TYPE IF EXISTS order_status;
DROP TYPE IF EXISTS vehicle_type;
DROP TYPE IF EXISTS vehicle_status;

-- NOTE: ALTER TYPE DROP VALUE is not supported in PostgreSQL.
-- The 'driver' and 'logistics_manager' values added to user_role
-- cannot be removed without recreating the enum. If required,
-- create a new enum without those values and cast the column.
