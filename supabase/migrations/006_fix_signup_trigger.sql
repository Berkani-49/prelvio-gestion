-- ============================================================
-- StockPilot — Migration 006 : Trigger signup résilient
-- Empêche l'erreur "Database error saving new user".
-- Si la création de boutique échoue, l'inscription réussit
-- quand même et l'écran onboarding prend le relais.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id       UUID;
  new_store_id UUID;
  invitation   RECORD;
BEGIN
  -- 1. Crée le profil utilisateur
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Cherche une invitation en attente pour cet email
  SELECT * INTO invitation
  FROM store_invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF invitation.id IS NOT NULL THEN
    -- Rejoint le store invité
    INSERT INTO store_members (store_id, user_id, role)
    VALUES (invitation.store_id, NEW.id, invitation.role)
    ON CONFLICT (store_id, user_id) DO NOTHING;

    UPDATE store_invitations SET status = 'accepted' WHERE id = invitation.id;

  ELSE
    -- Crée une nouvelle organisation et boutique
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

EXCEPTION
  -- Si quoi que ce soit échoue, on laisse l'inscription réussir.
  -- L'écran onboarding créera la boutique manuellement via RPC.
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
