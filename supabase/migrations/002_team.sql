-- ============================================================
-- StockPilot — Migration 002 : Système d'équipe
-- À exécuter dans : Supabase > SQL Editor
-- ============================================================

-- ── 1. Table PROFILS (miroir auth.users) ──────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié peut lire les profils
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Mise à jour : uniquement son propre profil
CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Insert : uniquement son propre profil (via trigger)
CREATE POLICY "profiles_own_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ── 2. Table INVITATIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS store_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT CHECK (role IN ('manager', 'employee', 'accountant')) NOT NULL DEFAULT 'employee',
  token       UUID DEFAULT gen_random_uuid(),
  status      TEXT CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  invited_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

ALTER TABLE store_invitations ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du store peuvent voir les invitations
CREATE POLICY "invitations_read" ON store_invitations
  FOR SELECT USING (
    store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

-- Création : owner ou manager seulement
CREATE POLICY "invitations_insert" ON store_invitations
  FOR INSERT WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Modification : owner ou manager seulement
CREATE POLICY "invitations_update" ON store_invitations
  FOR UPDATE USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ── 3. Policies sur store_members ────────────────────────
-- Fonction SECURITY DEFINER pour éviter la récursion infinie
CREATE OR REPLACE FUNCTION get_my_store_id()
RETURNS UUID AS $$
  SELECT store_id FROM store_members WHERE user_id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Lecture : voir les membres du même store
CREATE POLICY "store_members_select" ON store_members
  FOR SELECT USING (
    store_id = get_my_store_id() OR user_id = auth.uid()
  );

-- Insertion : owner ou manager peut ajouter des membres
CREATE POLICY "store_members_insert" ON store_members
  FOR INSERT WITH CHECK (
    store_id = get_my_store_id()
    AND (
      SELECT role FROM store_members
      WHERE store_id = get_my_store_id() AND user_id = auth.uid()
    ) IN ('owner', 'manager')
  );

-- Suppression : owner ou manager, mais ne peut pas supprimer le owner
CREATE POLICY "store_members_delete" ON store_members
  FOR DELETE USING (
    store_id = get_my_store_id()
    AND role != 'owner'
    AND (
      SELECT role FROM store_members
      WHERE store_id = get_my_store_id() AND user_id = auth.uid()
    ) IN ('owner', 'manager')
  );

-- Mise à jour du rôle : owner seulement, ne peut pas changer le owner
CREATE POLICY "store_members_update" ON store_members
  FOR UPDATE USING (
    store_id = get_my_store_id()
    AND role != 'owner'
    AND (
      SELECT role FROM store_members
      WHERE store_id = get_my_store_id() AND user_id = auth.uid()
    ) = 'owner'
  );

-- ── 4. Code d'invitation sur la boutique ─────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE
  DEFAULT substr(md5(random()::text), 1, 8);

-- Générer les codes pour les boutiques existantes
UPDATE stores SET invite_code = substr(md5(random()::text), 1, 8)
WHERE invite_code IS NULL;

-- ── 5. Mise à jour du trigger handle_new_user ────────────
-- Crée un profil ET gère l'invitation automatique
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id      UUID;
  new_store_id UUID;
  invitation  RECORD;
BEGIN
  -- Crée le profil utilisateur
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Cherche une invitation en attente pour cet email
  SELECT * INTO invitation
  FROM store_invitations
  WHERE email = LOWER(NEW.email)
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF invitation.id IS NOT NULL THEN
    -- Rejoint le store invité
    INSERT INTO store_members (store_id, user_id, role)
    VALUES (invitation.store_id, NEW.id, invitation.role)
    ON CONFLICT (store_id, user_id) DO NOTHING;

    -- Marque l'invitation comme acceptée
    UPDATE store_invitations SET status = 'accepted' WHERE id = invitation.id;

  ELSE
    -- Comportement par défaut : crée une nouvelle organisation et boutique
    INSERT INTO organizations (name, owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'store_name', 'Ma Boutique'),
      NEW.id
    )
    RETURNING id INTO org_id;

    INSERT INTO stores (organization_id, name)
    VALUES (org_id, COALESCE(NEW.raw_user_meta_data->>'store_name', 'Ma Boutique'))
    RETURNING id INTO new_store_id;

    INSERT INTO store_members (store_id, user_id, role)
    VALUES (new_store_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. Créer les profils des utilisateurs existants ──────
INSERT INTO profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
