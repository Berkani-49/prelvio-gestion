-- ============================================================
-- StockPilot — Migration 005 : RPC création boutique (onboarding)
-- À exécuter dans : Supabase > SQL Editor
-- Permet au client de créer sa première organisation + boutique
-- en contournant le RLS (SECURITY DEFINER).
-- ============================================================

CREATE OR REPLACE FUNCTION create_store_for_user(p_store_name TEXT)
RETURNS UUID AS $$
DECLARE
  org_id       UUID;
  new_store_id UUID;
BEGIN
  -- Sécurité : l'utilisateur doit être authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Vérifie qu'il n'a pas déjà une boutique
  IF EXISTS (SELECT 1 FROM store_members WHERE user_id = auth.uid()) THEN
    -- Retourne l'id de la boutique existante plutôt qu'une erreur
    SELECT store_id INTO new_store_id
    FROM store_members
    WHERE user_id = auth.uid()
    LIMIT 1;
    RETURN new_store_id;
  END IF;

  -- Crée l'organisation
  INSERT INTO organizations (name, owner_id)
  VALUES (p_store_name, auth.uid())
  RETURNING id INTO org_id;

  -- Crée la boutique principale
  INSERT INTO stores (organization_id, name)
  VALUES (org_id, p_store_name)
  RETURNING id INTO new_store_id;

  -- Ajoute l'utilisateur comme propriétaire
  INSERT INTO store_members (store_id, user_id, role)
  VALUES (new_store_id, auth.uid(), 'owner');

  RETURN new_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Autorise les utilisateurs authentifiés à appeler cette fonction
GRANT EXECUTE ON FUNCTION create_store_for_user(TEXT) TO authenticated;
