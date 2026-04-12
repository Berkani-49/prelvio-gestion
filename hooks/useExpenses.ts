import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStore } from './useStore';
import { useAuthStore } from '@/stores/authStore';
import type { Expense } from '@/types/database';

const db = supabase as any;

export type { Expense };

export function useExpenses() {
  const { storeId } = useStore();
  return useQuery({
    queryKey: ['expenses', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from('expenses')
        .select('*')
        .eq('store_id', storeId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { storeId } = useStore();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: async (expense: {
      description: string;
      amount: number;
      type: 'fixed' | 'variable';
      category: string | null;
      date: string;
    }) => {
      const { data, error } = await db
        .from('expenses')
        .insert({ ...expense, store_id: storeId!, created_by: user?.id })
        .select().single();
      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
