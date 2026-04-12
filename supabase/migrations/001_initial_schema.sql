-- ============================================================
-- StockPilot — Migration initiale
-- À exécuter dans : Supabase > SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGANISATIONS (Multi-tenant root)
-- ============================================================
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url    TEXT,
  currency    TEXT DEFAULT 'EUR',
  tax_rate    NUMERIC(5,2) DEFAULT 20.00,
  plan        TEXT DEFAULT 'free',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BOUTIQUES
-- ============================================================
CREATE TABLE stores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  is_online       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MEMBRES & RÔLES
-- ============================================================
CREATE TABLE store_members (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role     TEXT CHECK (role IN ('owner', 'manager', 'employee', 'accountant')) NOT NULL,
  UNIQUE(store_id, user_id)
);

-- ============================================================
-- CATÉGORIES
-- ============================================================
CREATE TABLE categories (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  color    TEXT DEFAULT '#6366f1'
);

-- ============================================================
-- PRODUITS
-- ============================================================
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID REFERENCES stores(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  sku              TEXT,
  barcode          TEXT,
  description      TEXT,
  image_url        TEXT,
  cost_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity   INTEGER DEFAULT 0,
  low_stock_alert  INTEGER DEFAULT 5,
  unit             TEXT DEFAULT 'pièce',
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Trigger auto updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MOUVEMENTS DE STOCK
-- ============================================================
CREATE TABLE stock_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  store_id    UUID REFERENCES stores(id) ON DELETE CASCADE,
  type        TEXT CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'return')) NOT NULL,
  quantity    INTEGER NOT NULL,
  reason      TEXT,
  reference   TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id) ON DELETE CASCADE,
  first_name      TEXT,
  last_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  loyalty_points  INTEGER DEFAULT 0,
  segment         TEXT DEFAULT 'standard',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FACTURES
-- ============================================================
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  issue_date      DATE DEFAULT CURRENT_DATE,
  due_date        DATE,
  subtotal        NUMERIC(12,2) DEFAULT 0,
  tax_amount      NUMERIC(12,2) DEFAULT 0,
  discount        NUMERIC(12,2) DEFAULT 0,
  total           NUMERIC(12,2) DEFAULT 0,
  payment_method  TEXT,
  notes           TEXT,
  pdf_url         TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, invoice_number)
);

CREATE TABLE invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  quantity    INTEGER NOT NULL,
  unit_price  NUMERIC(12,2) NOT NULL,
  cost_price  NUMERIC(12,2) DEFAULT 0,
  total       NUMERIC(12,2) NOT NULL
);

-- ============================================================
-- DÉPENSES
-- ============================================================
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID REFERENCES stores(id) ON DELETE CASCADE,
  category    TEXT,
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  type        TEXT CHECK (type IN ('fixed', 'variable')) NOT NULL,
  date        DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FIDÉLITÉ
-- ============================================================
CREATE TABLE loyalty_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id  UUID REFERENCES invoices(id) ON DELETE SET NULL,
  points      INTEGER NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Politique : un utilisateur ne voit que ses propres organisations
CREATE POLICY "org_owner" ON organizations
  FOR ALL USING (owner_id = auth.uid());

-- Politique : un utilisateur voit les stores où il est membre
CREATE POLICY "store_member_access" ON stores
  FOR ALL USING (
    id IN (
      SELECT store_id FROM store_members WHERE user_id = auth.uid()
    )
  );

-- Politique générique pour les tables liées à un store
CREATE POLICY "products_store_access" ON products
  FOR ALL USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

CREATE POLICY "categories_store_access" ON categories
  FOR ALL USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

CREATE POLICY "customers_store_access" ON customers
  FOR ALL USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

CREATE POLICY "invoices_store_access" ON invoices
  FOR ALL USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

CREATE POLICY "expenses_store_access" ON expenses
  FOR ALL USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- FONCTION : Création automatique org + store après signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  store_id UUID;
BEGIN
  -- Crée l'organisation
  INSERT INTO organizations (name, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'store_name', 'Ma Boutique'),
    NEW.id
  )
  RETURNING id INTO org_id;

  -- Crée la boutique principale
  INSERT INTO stores (organization_id, name)
  VALUES (org_id, COALESCE(NEW.raw_user_meta_data->>'store_name', 'Ma Boutique'))
  RETURNING id INTO store_id;

  -- Ajoute l'utilisateur comme owner
  INSERT INTO store_members (store_id, user_id, role)
  VALUES (store_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
