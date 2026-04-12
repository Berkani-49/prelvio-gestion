import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { useStore } from './useStore';
import { useAuthStore } from '@/stores/authStore';
import type { Product, Category } from '@/types/database';

// ── Types exportés ──────────────────────────────────────────
export type ProductWithCategory = Product & {
  categories: { name: string; color: string } | null;
};

export type StockMovementType = 'in' | 'out' | 'adjustment';

export type StockMovement = {
  id: string;
  product_id: string;
  store_id: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockUnit = typeof STOCK_UNITS[number];

// ── Constantes partagées ────────────────────────────────────
export const STOCK_UNITS = ['pièce', 'kg', 'litre', 'boîte', 'carton', 'm²', 'ml'] as const;

export const CAT_COLORS = [
  '#6366f1', '#f43f5e', '#22c55e', '#f59e0b',
  '#3b82f6', '#ec4899', '#14b8a6', '#a855f7',
  '#ef4444', '#06b6d4',
] as const;

// cast nécessaire — Supabase généric Database non injecté
const db = supabase as any;

// ── Fonctions utilitaires pures ─────────────────────────────

/** Calcule la marge nette et le pourcentage de marge. */
export function calcMargin(costPrice: number, sellingPrice: number) {
  const net = sellingPrice - costPrice;
  const pct = costPrice > 0 ? Math.round((net / costPrice) * 100) : 0;
  return { net, pct };
}

/** Détermine l'état de stock d'un produit (rupture, bas, normal) et les valeurs d'affichage. */
export function calcStockLevel(stockQty: number, lowStockAlert: number) {
  const isOutOfStock   = stockQty === 0;
  const isLowStock     = !isOutOfStock && stockQty <= lowStockAlert;
  const alertThreshold = Math.max(lowStockAlert, 1);
  const safeMax        = Math.max(alertThreshold * 5, stockQty, 1);
  const fillPct        = Math.min(100, (stockQty / safeMax) * 100);
  const stockColor     = isOutOfStock ? Colors.danger : isLowStock ? Colors.warning : Colors.success;
  return { isOutOfStock, isLowStock, fillPct, stockColor };
}

// ── Requêtes ────────────────────────────────────────────────

/** Liste tous les produits actifs du store, jointure catégorie. */
export function useProducts() {
  const { storeId } = useStore();

  return useQuery({
    queryKey: ['products', storeId],
    enabled: !!storeId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db
        .from('products')
        .select('*, categories(name, color)')
        .eq('store_id', storeId!)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ProductWithCategory[];
    },
  });
}

/** Un seul produit, avec sa catégorie. */
export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db
        .from('products')
        .select('*, categories(name, color)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as ProductWithCategory;
    },
  });
}

/** 30 derniers mouvements d'un produit, ordre DESC. */
export function useStockMovements(productId: string) {
  return useQuery({
    queryKey: ['stock_movements', productId],
    enabled: !!productId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await db
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as StockMovement[];
    },
  });
}

/** Toutes les catégories du store. */
export function useCategories() {
  const { storeId } = useStore();

  return useQuery({
    queryKey: ['categories', storeId],
    enabled: !!storeId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db
        .from('categories')
        .select('*')
        .eq('store_id', storeId!)
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
  });
}

// ── Mutations produit ───────────────────────────────────────

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await db
        .from('products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await db
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
  });
}

/** Soft-delete : ne jamais supprimer physiquement un produit. */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

// ── Mutations catégorie ─────────────────────────────────────

export function useCreateCategory() {
  const qc = useQueryClient();
  const { storeId } = useStore();

  return useMutation({
    mutationFn: async (cat: { name: string; color: string }) => {
      const { data, error } = await db
        .from('categories')
        .insert({ store_id: storeId, name: cat.name, color: cat.color })
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Mouvements récents tous produits confondus ──────────────

export type MovementWithProduct = StockMovement & {
  products: { name: string; unit: string } | null;
};

export function useRecentMovements(limit = 15) {
  const { storeId } = useStore();
  return useQuery({
    queryKey: ['stock_movements_recent', storeId, limit],
    enabled: !!storeId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await db
        .from('stock_movements')
        .select('*, products(name, unit)')
        .eq('store_id', storeId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as MovementWithProduct[];
    },
  });
}

// ── Mouvement de stock (atomique via RPC) ───────────────────
//
// Utilise la fonction PostgreSQL `apply_stock_movement` (migration 004).
// Elle exécute SELECT … FOR UPDATE + UPDATE + INSERT dans une seule transaction,
// éliminant toute race condition entre lectures et écritures concurrentes.

export function useStockMovement() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      productId,
      type,
      quantity,
      reason,
    }: {
      productId: string;
      type: StockMovementType;
      quantity: number;
      reason?: string;
    }) => {
      const { error } = await supabase.rpc('apply_stock_movement', {
        p_product_id: productId,
        p_store_id:   storeId!,
        p_type:       type,
        p_quantity:   quantity,
        p_reason:     reason ?? null,
        p_created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements', productId] });
    },
  });
}
