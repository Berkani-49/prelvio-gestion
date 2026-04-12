import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStore } from './useStore';

const db = supabase as any;

export type Supplier = {
  id: string;
  store_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export function useSuppliers() {
  const { storeId } = useStore();
  return useQuery({
    queryKey: ['suppliers', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from('suppliers')
        .select('*')
        .eq('store_id', storeId!)
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['supplier', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Supplier;
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  const { storeId } = useStore();
  return useMutation({
    mutationFn: async (supplier: Omit<Supplier, 'id' | 'store_id' | 'created_at'>) => {
      const { data, error } = await db
        .from('suppliers')
        .insert({ ...supplier, store_id: storeId! })
        .select()
        .single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { data, error } = await db
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['supplier', data.id] });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}
