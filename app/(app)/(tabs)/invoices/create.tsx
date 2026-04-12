import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCreateInvoice, type InvoiceItem } from '@/hooks/useInvoices';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Radius } from '@/constants/colors';
import type { Customer } from '@/types/database';

// ── Ligne article ─────────────────────────────────────────
function LineItem({
  item,
  onQtyChange,
  onRemove,
}: {
  item: InvoiceItem;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}) {
  const [qtyText, setQtyText] = useState(String(item.quantity));

  function commit(text: string) {
    const n = Number(text);
    if (!isNaN(n) && n > 0) onQtyChange(n);
    else setQtyText(String(item.quantity));
  }

  return (
    <View style={lineStyles.row}>
      <View style={lineStyles.info}>
        <Text style={lineStyles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={lineStyles.price}>{item.unit_price.toFixed(2)} € / u</Text>
      </View>
      <View style={lineStyles.qtyRow}>
        <TouchableOpacity style={lineStyles.qtyBtn} onPress={() => onQtyChange(Math.max(1, item.quantity - 1))}>
          <Text style={lineStyles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={lineStyles.qtyInput}
          value={qtyText}
          onChangeText={setQtyText}
          onBlur={() => commit(qtyText)}
          keyboardType="numeric"
        />
        <TouchableOpacity style={lineStyles.qtyBtn} onPress={() => onQtyChange(item.quantity + 1)}>
          <Text style={lineStyles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={lineStyles.total}>{item.total.toFixed(2)} €</Text>
      <TouchableOpacity onPress={onRemove} style={lineStyles.removeBtn}>
        <Text style={lineStyles.removeTxt}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const lineStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  price: { fontSize: 11, color: Colors.textSecondary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  qtyInput: { width: 40, height: 28, backgroundColor: Colors.background, borderRadius: 6, textAlign: 'center', color: Colors.textPrimary, fontSize: 13 },
  total: { width: 64, textAlign: 'right', fontSize: 13, fontWeight: '700', color: Colors.primary },
  removeBtn: { width: 24, alignItems: 'center' },
  removeTxt: { color: Colors.danger, fontSize: 14 },
});

// ── Écran principal ───────────────────────────────────────
export default function CreateInvoiceScreen() {
  const { mutateAsync: createInvoice, isPending } = useCreateInvoice();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();

  const [lines, setLines] = useState<InvoiceItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [taxRate, setTaxRate] = useState('20');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [error, setError] = useState('');

  const filteredProducts = useMemo(() =>
    products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase())),
    [products, productSearch]
  );

  const filteredCustomers = useMemo(() =>
    customers.filter((c) =>
      `${c.first_name ?? ''} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(customerSearch.toLowerCase())
    ),
    [customers, customerSearch]
  );

  function addProduct(product: typeof products[0]) {
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.product_id === product.id);
      if (existing >= 0) {
        const updated = [...prev];
        const qty = updated[existing].quantity + 1;
        updated[existing] = { ...updated[existing], quantity: qty, total: qty * updated[existing].unit_price };
        return updated;
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.selling_price,
        cost_price: product.cost_price,
        total: product.selling_price,
      }];
    });
    setShowProductModal(false);
    setProductSearch('');
  }

  function updateQty(idx: number, qty: number) {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: qty, total: qty * updated[idx].unit_price };
      return updated;
    });
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discountAmt = Number(discount) || 0;
  const taxAmt = (subtotal - discountAmt) * ((Number(taxRate) || 0) / 100);
  const total = subtotal - discountAmt + taxAmt;

  async function handleCreate(status: 'draft' | 'sent' | 'paid') {
    if (lines.length === 0) { setError('Ajoutez au moins un article.'); return; }
    setError('');
    try {
      const invoice = await createInvoice({
        customer_id: selectedCustomer?.id ?? null,
        items: lines,
        tax_rate: Number(taxRate) || 0,
        discount: discountAmt,
        payment_method: paymentMethod,
        notes,
        due_date: dueDate || null,
      });
      // Update status if not draft
      router.replace(`/(app)/(tabs)/invoices/${invoice.id}` as any);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création');
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle facture</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <TouchableOpacity style={styles.selectRow} onPress={() => setShowCustomerModal(true)}>
            <View style={{ flex: 1 }}>
              {selectedCustomer ? (
                <>
                  <Text style={styles.selectedName}>
                    {`${selectedCustomer.first_name ?? ''} ${selectedCustomer.last_name}`.trim()}
                  </Text>
                  {selectedCustomer.email && <Text style={styles.selectedSub}>{selectedCustomer.email}</Text>}
                </>
              ) : (
                <Text style={styles.placeholder}>Sélectionner un client (optionnel)</Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          {selectedCustomer && (
            <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
              <Text style={styles.clearLink}>✕ Retirer le client</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Articles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Articles</Text>
            <TouchableOpacity style={styles.addLineBtn} onPress={() => setShowProductModal(true)}>
              <Text style={styles.addLineBtnText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {lines.length === 0 ? (
            <TouchableOpacity style={styles.emptyLines} onPress={() => setShowProductModal(true)}>
              <Text style={styles.emptyLinesText}>Appuyez pour ajouter des articles</Text>
            </TouchableOpacity>
          ) : (
            lines.map((line, idx) => (
              <LineItem
                key={`${line.product_id}-${idx}`}
                item={line}
                onQtyChange={(qty) => updateQty(idx, qty)}
                onRemove={() => removeLine(idx)}
              />
            ))
          )}
        </View>

        {/* Totaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Totaux</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalValue}>{subtotal.toFixed(2)} €</Text>
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Remise (€)</Text>
            <TextInput
              style={styles.inlineInput}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>TVA (%)</Text>
            <TextInput
              style={styles.inlineInput}
              value={taxRate}
              onChangeText={setTaxRate}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          {discountAmt > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Remise</Text>
              <Text style={[styles.totalValue, { color: Colors.warning }]}>−{discountAmt.toFixed(2)} €</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA</Text>
            <Text style={styles.totalValue}>{taxAmt.toFixed(2)} €</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total TTC</Text>
            <Text style={styles.grandTotalValue}>{total.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Mode de paiement</Text>
            <TextInput
              style={[styles.inlineInput, { flex: 1 }]}
              value={paymentMethod}
              onChangeText={setPaymentMethod}
              placeholder="Espèces, virement…"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Échéance (AAAA-MM-JJ)</Text>
            <TextInput
              style={[styles.inlineInput, { flex: 1 }]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="2025-02-28"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <Text style={[styles.inputLabel, { marginTop: 8 }]}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes internes ou pour le client…"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Actions */}
        <View style={styles.actions}>
          <Button label="Brouillon" onPress={() => handleCreate('draft')} variant="outline" isLoading={isPending} />
          <Button label="Enregistrer & Envoyer" onPress={() => handleCreate('sent')} isLoading={isPending} />
        </View>
        <View style={styles.actionsPaid}>
          <Button label="✓ Marquer comme payée" onPress={() => handleCreate('paid')} variant="secondary" isLoading={isPending} />
        </View>

      </ScrollView>

      {/* Modal Produits */}
      <Modal visible={showProductModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choisir un article</Text>
            <TextInput
              style={styles.modalSearch}
              placeholder="Rechercher…"
              placeholderTextColor={Colors.textMuted}
              value={productSearch}
              onChangeText={setProductSearch}
              autoFocus
            />
            <FlatList
              data={filteredProducts}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 340 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => addProduct(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    <Text style={styles.modalItemSub}>Stock: {item.stock_quantity} · {item.selling_price.toFixed(2)} €</Text>
                  </View>
                  <Text style={styles.modalItemPrice}>{item.selling_price.toFixed(2)} €</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Aucun produit trouvé</Text>}
            />
            <Button label="Fermer" onPress={() => { setShowProductModal(false); setProductSearch(''); }} variant="ghost" />
          </View>
        </View>
      </Modal>

      {/* Modal Clients */}
      <Modal visible={showCustomerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choisir un client</Text>
            <TextInput
              style={styles.modalSearch}
              placeholder="Rechercher…"
              placeholderTextColor={Colors.textMuted}
              value={customerSearch}
              onChangeText={setCustomerSearch}
              autoFocus
            />
            <FlatList
              data={filteredCustomers}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 340 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedCustomer(item); setShowCustomerModal(false); setCustomerSearch(''); }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemName}>{`${item.first_name ?? ''} ${item.last_name}`.trim()}</Text>
                    {item.email && <Text style={styles.modalItemSub}>{item.email}</Text>}
                  </View>
                  <Text style={styles.modalItemPrice}>{item.loyalty_points} pts</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Aucun client trouvé</Text>}
            />
            <Button label="Fermer" onPress={() => { setShowCustomerModal(false); setCustomerSearch(''); }} variant="ghost" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  backBtn: { color: Colors.primary, fontSize: 15, fontWeight: '500', width: 70 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },

  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },

  selectRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12, gap: 8 },
  selectedName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  selectedSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  placeholder: { fontSize: 14, color: Colors.textMuted },
  chevron: { fontSize: 20, color: Colors.textMuted },
  clearLink: { fontSize: 13, color: Colors.danger, alignSelf: 'flex-end' },

  addLineBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  addLineBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyLines: { borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: Radius.md, padding: 24, alignItems: 'center' },
  emptyLinesText: { color: Colors.textMuted, fontSize: 14 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: Colors.surfaceAlt, marginTop: 6, paddingTop: 10 },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inputLabel: { fontSize: 14, color: Colors.textSecondary, flexShrink: 0 },
  inlineInput: { backgroundColor: Colors.background, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: Colors.textPrimary, minWidth: 80, textAlign: 'right' },

  notesInput: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, minHeight: 80, textAlignVertical: 'top' },

  error: { color: Colors.danger, fontSize: 13, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: 12 },
  actionsPaid: {},

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, gap: 12, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalSearch: { backgroundColor: Colors.background, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt, gap: 12 },
  modalItemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  modalItemSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  modalItemPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  modalEmpty: { textAlign: 'center', color: Colors.textMuted, paddingVertical: 24, fontSize: 14 },
});
