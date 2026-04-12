-- Migration 004 : Fonction atomique de mouvement de stock
-- Élimine la race condition de l'approche SELECT → compute → UPDATE
-- La transaction verrouille la ligne produit (FOR UPDATE) avant modification.

CREATE OR REPLACE FUNCTION apply_stock_movement(
  p_product_id  uuid,
  p_store_id    uuid,
  p_type        text,           -- 'in' | 'out' | 'adjustment'
  p_quantity    integer,
  p_reason      text    DEFAULT NULL,
  p_created_by  uuid    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_qty integer;
  v_new_qty     integer;
BEGIN
  -- Verrouille la ligne produit pour éviter toute mise à jour concurrente
  SELECT stock_quantity
    INTO v_current_qty
    FROM products
   WHERE id = p_product_id
     AND store_id = p_store_id
     AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit introuvable ou inactif : %', p_product_id;
  END IF;

  -- Calcul de la nouvelle quantité selon le type
  CASE p_type
    WHEN 'in'         THEN v_new_qty := v_current_qty + p_quantity;
    WHEN 'out'        THEN v_new_qty := v_current_qty - p_quantity;
    WHEN 'adjustment' THEN v_new_qty := p_quantity;
    ELSE RAISE EXCEPTION 'Type de mouvement invalide : %', p_type;
  END CASE;

  -- Invariant : quantité jamais négative
  v_new_qty := GREATEST(0, v_new_qty);

  -- Mise à jour atomique du produit
  UPDATE products
     SET stock_quantity = v_new_qty,
         updated_at     = now()
   WHERE id = p_product_id;

  -- Enregistrement du mouvement (après le UPDATE pour cohérence en cas de rollback)
  INSERT INTO stock_movements (product_id, store_id, type, quantity, reason, created_by)
  VALUES (p_product_id, p_store_id, p_type, p_quantity, p_reason, p_created_by);
END;
$$;

-- Révoque l'accès public par défaut, accès uniquement via authenticated users
REVOKE ALL ON FUNCTION apply_stock_movement FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_stock_movement TO authenticated;
