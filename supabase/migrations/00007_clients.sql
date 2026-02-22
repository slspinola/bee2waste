-- ============================================================
-- Bee2Waste MVP — Client Management Migration
-- Clients, Park Associations, LER Authorizations, Contracts
-- ============================================================

-- ============================================================
-- CLIENT TYPES
-- ============================================================
CREATE TYPE client_type AS ENUM (
  'supplier',
  'buyer',
  'both'
);

CREATE TYPE contract_status AS ENUM (
  'draft',
  'active',
  'expired',
  'cancelled'
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  nif TEXT,
  client_type client_type NOT NULL DEFAULT 'supplier',
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'PT',
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  apa_number TEXT,
  siliamb_id TEXT,
  payment_terms_days INTEGER DEFAULT 30,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_org ON clients(org_id);
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_nif ON clients(nif);

-- ============================================================
-- CLIENT PARK ASSOCIATIONS
-- ============================================================
CREATE TABLE client_park_associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  park_id UUID NOT NULL REFERENCES parks(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, park_id)
);

CREATE INDEX idx_client_parks_client ON client_park_associations(client_id);
CREATE INDEX idx_client_parks_park ON client_park_associations(park_id);

-- ============================================================
-- CLIENT LER AUTHORIZATIONS
-- ============================================================
CREATE TABLE client_ler_authorizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ler_code_id UUID NOT NULL REFERENCES ler_codes(id),
  ler_code TEXT NOT NULL,
  operation_type TEXT,
  max_quantity_kg NUMERIC,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, ler_code_id)
);

CREATE INDEX idx_client_ler_client ON client_ler_authorizations(client_id);

-- ============================================================
-- CONTRACTS
-- ============================================================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  contract_number TEXT NOT NULL,
  status contract_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- ============================================================
-- CONTRACT PRICES
-- ============================================================
CREATE TABLE contract_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  ler_code_id UUID NOT NULL REFERENCES ler_codes(id),
  ler_code TEXT NOT NULL,
  price_per_ton NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_prices_contract ON contract_prices(contract_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at_clients
  BEFORE UPDATE ON clients FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_contracts
  BEFORE UPDATE ON contracts FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view clients in their org"
  ON clients FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage clients in their org"
  ON clients FOR ALL USING (org_id = get_user_org_id());

ALTER TABLE client_park_associations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view client park associations"
  ON client_park_associations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients c WHERE c.id = client_park_associations.client_id AND c.org_id = get_user_org_id()
  ));
CREATE POLICY "Users can manage client park associations"
  ON client_park_associations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clients c WHERE c.id = client_park_associations.client_id AND c.org_id = get_user_org_id()
  ));

ALTER TABLE client_ler_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view client LER authorizations"
  ON client_ler_authorizations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clients c WHERE c.id = client_ler_authorizations.client_id AND c.org_id = get_user_org_id()
  ));
CREATE POLICY "Users can manage client LER authorizations"
  ON client_ler_authorizations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clients c WHERE c.id = client_ler_authorizations.client_id AND c.org_id = get_user_org_id()
  ));

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view contracts in their org"
  ON contracts FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Users can manage contracts in their org"
  ON contracts FOR ALL USING (org_id = get_user_org_id());

ALTER TABLE contract_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view contract prices"
  ON contract_prices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contracts ct WHERE ct.id = contract_prices.contract_id AND ct.org_id = get_user_org_id()
  ));
CREATE POLICY "Users can manage contract prices"
  ON contract_prices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM contracts ct WHERE ct.id = contract_prices.contract_id AND ct.org_id = get_user_org_id()
  ));
