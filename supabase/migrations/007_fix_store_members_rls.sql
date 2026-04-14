-- ============================================================
-- StockPilot — Migration 007 : RLS manquante sur store_members
-- Sans cette politique, les utilisateurs ne peuvent pas lire
-- leur propre appartenance → storeId = null → boucle onboarding.
-- ============================================================

CREATE POLICY "store_members_self_access" ON store_members
  FOR ALL USING (user_id = auth.uid());
