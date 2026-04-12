import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStore } from './useStore';
import { useAuthStore } from '@/stores/authStore';

const db = supabase as any;

export type InvoiceItem = {
  id?: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total: number;
};

export type InvoiceWithCustomer = {
  id: string;
  store_id: string;
  customer_id: string | null;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total: number;
  payment_method: string | null;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  customers: { first_name: string | null; last_name: string; email: string | null } | null;
  invoice_items: InvoiceItem[];
};

// ── Liste factures ───────────────────────────────────────────
export function useInvoices() {
  const { storeId } = useStore();

  return useQuery({
    queryKey: ['invoices', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from('invoices')
        .select('*, customers(first_name, last_name)')
        .eq('store_id', storeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as InvoiceWithCustomer[];
    },
  });
}

// ── Une facture ──────────────────────────────────────────────
export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from('invoices')
        .select('*, customers(first_name, last_name, email), invoice_items(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as InvoiceWithCustomer;
    },
  });
}

// ── Créer facture ────────────────────────────────────────────
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      customer_id,
      items,
      tax_rate,
      discount,
      payment_method,
      notes,
      due_date,
      status = 'draft',
    }: {
      customer_id: string | null;
      items: InvoiceItem[];
      tax_rate: number;
      discount: number;
      payment_method: string;
      notes: string;
      due_date: string | null;
      status?: 'draft' | 'paid';
    }) => {
      // Générer le numéro de facture
      const { count } = await db
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId!);

      const num = String((count ?? 0) + 1).padStart(4, '0');
      const invoice_number = `FAC-${new Date().getFullYear()}-${num}`;

      const subtotal = items.reduce((s, i) => s + i.total, 0);
      const tax_amount = (subtotal - discount) * (tax_rate / 100);
      const total = subtotal - discount + tax_amount;

      // Créer la facture
      const { data: invoice, error } = await db
        .from('invoices')
        .insert({
          store_id: storeId!,
          customer_id: customer_id || null,
          invoice_number,
          status,
          issue_date: new Date().toISOString().split('T')[0],
          due_date,
          subtotal,
          tax_amount,
          discount,
          total,
          payment_method: payment_method || null,
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Créer les lignes
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        product_id: item.product_id?.startsWith('free-') ? null : item.product_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        total: item.total,
      }));

      const { error: itemsError } = await db
        .from('invoice_items')
        .insert(invoiceItems);
      if (itemsError) throw itemsError;

      // Déduire le stock pour chaque produit
      for (const item of items) {
        if (!item.product_id || item.product_id.startsWith('free-')) continue;
        const { data: product } = await db
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();
        const newQty = Math.max(0, (product?.stock_quantity ?? 0) - item.quantity);
        await db.from('products').update({ stock_quantity: newQty }).eq('id', item.product_id);
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Supprimer facture ────────────────────────────────────────
export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Changer statut ───────────────────────────────────────────
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db
        .from('invoices')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });
}
