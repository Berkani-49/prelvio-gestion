import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { create } from 'zustand';

// Store override — permet de changer de boutique sans recharger
interface StoreOverride {
  overrideStoreId: string | null;
  setOverrideStoreId: (id: string | null) => void;
}

export const useStoreOverride = create<StoreOverride>((set) => ({
  overrideStoreId: null,
  setOverrideStoreId: (id) => set({ overrideStoreId: id }),
}));

export function useStore() {
  const { user } = useAuthStore();
  const { overrideStoreId } = useStoreOverride();

  const { data: storeId, isLoading, isFetching } = useQuery({
    queryKey: ['store-id', user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_members' as any)
        .select('store_id')
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.store_id as string ?? null;
    },
  });

  return {
    storeId: overrideStoreId ?? storeId ?? null,
    isLoading: isLoading || isFetching,
  };
}

// Liste toutes les boutiques de l'utilisateur
export function useUserStores() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['user-stores', user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('store_members')
        .select('store_id, role, stores(id, name)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data as any[])?.map((m: any) => ({
        id: m.store_id,
        name: m.stores?.name ?? 'Boutique',
        role: m.role as string,
      })) ?? [];
    },
  });
}
