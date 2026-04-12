import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStore } from './useStore';
import type { Customer } from '@/types/database';

const db = supabase as any;

export function useCustomers() {
  const { storeId } = useStore();

  return useQuery({
    queryKey: ['customers', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from('customers')
        .select('*')
        .eq('store_id', storeId!)
        .order('last_name');
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useAddLoyaltyPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, pointsToAdd }: { customerId: string; pointsToAdd: number }) => {
      const { data } = await db.from('customers').select('loyalty_points').eq('id', customerId).single();
      const current = data?.loyalty_points ?? 0;
      const { error } = await db.from('customers').update({ loyalty_points: current + pointsToAdd }).eq('id', customerId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();

  return useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'created_at' | 'loyalty_points'>) => {
      console.log('[useCreateCustomer] storeId =', storeId);
      if (!storeId) throw new Error('Boutique introuvable — storeId est null');
      const { data, error } = await db
        .from('customers')
        .insert({ ...customer, store_id: storeId, loyalty_points: 0 })
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}
