import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProduct, useStockMovement, useStockMovements, useDeleteProduct, calcMargin, calcStockLevel, type StockMovementType } from '@/hooks/useProducts';
import { Colors, Spacing, Radius } from '@/constants/colors';

const MOVEMENT_CONFIG = {
  in:         { label: 'Entrée',    icon: 'add-circle-outline' as const,    color: Colors.success, bg: `${Colors.success}15` },
  out:        { label: 'Sortie',    icon: 'remove-circle-outline' as const,  color: Colors.danger,  bg: `${Colors.danger}15` },
  adjustment: { label: 'Ajustement', icon: 'swap-vertical-outline' as const, color: Colors.warning, bg: `${Colors.warning}15` },
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id);
  const { data: movements = [] } = useStockMovements(id);
  const { mutateAsync: stockMovement, isPending: isMoving } = useStockMovement();
  const { mutateAsync: deleteProduct } = useDeleteProduct();

  const [modalType, setModalType] = useState<'in' | 'out' | 'adjustment' | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [movError, setMovError] = useState('');

  async function handleMovement() {
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setMovError('Quantité invalide'); return;
    }
    setMovError('');
    await stockMovement({ productId: id, type: modalType!, quantity: Number(quantity), reason: reason.trim() || undefined });
    setModalType(null); setQuantity(''); setReason('');
  }

  async function confirmDelete() {
    if (Platform.OS === 'web') {
      if (window.confirm('Archiver ce produit ?\nCette action est irréversible.')) {
        await deleteProduct(id);
        router.back();
      }
    } else {
      Alert.alert('Archiver ce produit', 'Cette action est irréversible. Continuer ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Archiver', style: 'destructive', onPress: async () => { await deleteProduct(id); router.back(); } },
      ]);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>Produit introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const catColor = product.categories?.color ?? Colors.primary;
  const { net: margin, pct: marginPct } = calcMargin(product.cost_price, product.selling_price);
  const { isOutOfStock, isLowStock, fillPct, stockColor } = calcStockLevel(product.stock_quantity, product.low_stock_alert);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{product.name}</Text>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => router.push(`/(app)/(tabs)/stock/edit/${id}` as any)}
        >
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Text style={s.editBtnTxt}>Modifier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero stock */}
        <View style={s.hero}>
          <View style={[s.heroCatBar, { backgroundColor: catColor }]} />
          <View style={s.heroContent}>
            <View style={s.heroTop}>
              <View style={{ gap: 4 }}>
                <Text style={s.heroProductName}>{product.name}</Text>
                {product.categories && (
                  <View style={s.catChip}>
                    <View style={[s.catDot, { backgroundColor: catColor }]} />
                    <Text style={[s.catChipTxt, { color: catColor }]}>{product.categories.name}</Text>
                  </View>
                )}
              </View>
              {(isOutOfStock || isLowStock) && (
                <View style={[s.alertBadge, { backgroundColor: `${stockColor}15`, borderColor: `${stockColor}30` }]}>
                  <View style={[s.alertDot, { backgroundColor: stockColor }]} />
                  <Text style={[s.alertTxt, { color: stockColor }]}>
                    {isOutOfStock ? 'RUPTURE' : 'STOCK BAS'}
                  </Text>
                </View>
              )}
            </View>

            <View style={s.heroMid}>
              <View>
                <Text style={s.stockLabel}>STOCK ACTUEL</Text>
                <View style={s.stockRow}>
                  <Text style={[s.stockValue, { color: stockColor }]}>{product.stock_quantity}</Text>
                  <Text style={s.stockUnit}>{product.unit}</Text>
                </View>
                <Text style={s.alertNote}>Alerte à {product.low_stock_alert} {product.unit}</Text>
              </View>
              <View style={[s.stockValueCard, { backgroundColor: `${stockColor}12`, borderColor: `${stockColor}25` }]}>
                <Text style={[s.stockValueNum, { color: stockColor }]}>
                  {(product.stock_quantity * product.cost_price).toFixed(0)} €
                </Text>
                <Text style={[s.stockValueLbl, { color: stockColor }]}>valeur stock</Text>
              </View>
            </View>

            <View style={s.barWrap}>
              <View style={[s.barFill, { width: `${fillPct}%` as any, backgroundColor: stockColor }]} />
            </View>
          </View>
        </View>

        {/* Boutons mouvements */}
        <View style={s.actionsRow}>
          {(['in', 'out', 'adjustment'] as const).map((type) => {
            const cfg = MOVEMENT_CONFIG[type];
            return (
              <TouchableOpacity
                key={type}
                style={[s.actionBtn, { backgroundColor: cfg.bg, borderColor: `${cfg.color}30` }]}
                onPress={() => setModalType(type)}
              >
                <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                <Text style={[s.actionLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Prix & Marge */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>PRIX & MARGE</Text>
          <View style={s.priceGrid}>
            <View style={s.priceItem}>
              <Text style={s.priceLabel}>VENTE</Text>
              <Text style={s.priceValue}>{product.selling_price.toFixed(2)} €</Text>
            </View>
            <View style={s.priceSep} />
            <View style={s.priceItem}>
              <Text style={s.priceLabel}>COÛT</Text>
              <Text style={[s.priceValue, { color: Colors.textSecondary }]}>{product.cost_price.toFixed(2)} €</Text>
            </View>
            <View style={s.priceSep} />
            <View style={s.priceItem}>
              <Text style={s.priceLabel}>MARGE NET</Text>
              <Text style={[s.priceValue, { color: margin >= 0 ? Colors.success : Colors.danger }]}>{margin.toFixed(2)} €</Text>
            </View>
            <View style={s.priceSep} />
            <View style={s.priceItem}>
              <Text style={s.priceLabel}>MARGE %</Text>
              <Text style={[s.priceValue, { color: marginPct >= 0 ? Colors.success : Colors.danger }]}>
                {marginPct >= 0 ? '+' : ''}{marginPct}%
              </Text>
            </View>
          </View>
        </View>

        {/* Informations */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>INFORMATIONS</Text>
          {(
            [
              product.sku         ? { label: 'SKU',         value: product.sku }         : null,
              product.barcode     ? { label: 'Code-barres', value: product.barcode }     : null,
              product.description ? { label: 'Description', value: product.description } : null,
            ] as Array<{ label: string; value: string } | null>
          ).filter((row): row is { label: string; value: string } => row !== null).map((row) => (
            <View key={row.label} style={s.infoRow}>
              <Text style={s.infoLabel}>{row.label}</Text>
              <Text style={s.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Historique mouvements */}
        {movements.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>HISTORIQUE DES MOUVEMENTS</Text>
            {movements.map((m) => {
              const cfg = MOVEMENT_CONFIG[m.type as StockMovementType];
              const sign = m.type === 'adjustment' ? '=' : m.type === 'in' ? '+' : '−';
              const date = new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
              return (
                <View key={m.id} style={s.mvtRow}>
                  <View style={[s.mvtIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mvtLabel}>{cfg.label}{m.reason ? ` · ${m.reason}` : ''}</Text>
                    <Text style={s.mvtDate}>{date}</Text>
                  </View>
                  <Text style={[s.mvtQty, { color: cfg.color }]}>{sign}{m.quantity}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Danger zone */}
        <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          <Text style={s.deleteTxt}>Archiver ce produit</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal mouvement */}
      <Modal visible={!!modalType} transparent animationType="slide" onRequestClose={() => setModalType(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            {modalType && (
              <View style={s.modalHeader}>
                <View style={[s.modalIconWrap, { backgroundColor: MOVEMENT_CONFIG[modalType].bg }]}>
                  <Ionicons name={MOVEMENT_CONFIG[modalType].icon} size={22} color={MOVEMENT_CONFIG[modalType].color} />
                </View>
                <View>
                  <Text style={s.modalTitle}>{MOVEMENT_CONFIG[modalType].label} de stock</Text>
                  <Text style={s.modalSub}>
                    {modalType === 'adjustment'
                      ? 'Définir la nouvelle quantité exacte'
                      : `Stock actuel : ${product.stock_quantity} ${product.unit}`}
                  </Text>
                </View>
              </View>
            )}

            {movError ? <Text style={s.movError}>{movError}</Text> : null}

            <View style={s.modalFields}>
              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>QUANTITÉ</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>RAISON (OPTIONNEL)</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="Livraison, inventaire…"
                  placeholderTextColor={Colors.textMuted}
                  value={reason}
                  onChangeText={setReason}
                />
              </View>
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => { setModalType(null); setQuantity(''); setReason(''); setMovError(''); }}
              >
                <Text style={s.modalCancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirm, modalType && { backgroundColor: MOVEMENT_CONFIG[modalType].color }]}
                onPress={handleMovement}
                disabled={isMoving}
              >
                {isMoving
                  ? <ActivityIndicator size="small" color="#0B0D11" />
                  : <Text style={s.modalConfirmTxt}>Confirmer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: Colors.danger, fontSize: 16, fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${Colors.primary}15`, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: `${Colors.primary}30`,
  },
  editBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 48 },

  /* Hero */
  hero: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  heroCatBar: { height: 4 },
  heroContent: { padding: Spacing.md, gap: 12 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroProductName: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.3 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  catChipTxt: { fontSize: 12, fontWeight: '700' },
  alertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1,
  },
  alertDot: { width: 6, height: 6, borderRadius: 3 },
  alertTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },

  heroMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  stockLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },
  stockRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  stockValue: { fontSize: 52, fontWeight: '900', letterSpacing: -2, lineHeight: 56 },
  stockUnit: { fontSize: 18, color: Colors.textSecondary, fontWeight: '600' },
  alertNote: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  stockValueCard: {
    alignItems: 'flex-end', borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
  },
  stockValueNum: { fontSize: 18, fontWeight: '900' },
  stockValueLbl: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  barWrap: { height: 5, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },

  /* Actions */
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6,
    borderRadius: Radius.lg, borderWidth: 1.5,
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },

  /* Sections */
  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, gap: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 9, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4,
  },

  /* Prix */
  priceGrid: { flexDirection: 'row', alignItems: 'center' },
  priceItem: { flex: 1, alignItems: 'center', gap: 3 },
  priceSep: { width: 1, height: 28, backgroundColor: Colors.border },
  priceLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.9 },
  priceValue: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },

  /* Info rows */
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt,
  },
  infoLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },

  /* Mouvements */
  mvtRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  mvtIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mvtLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  mvtDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  mvtQty: { fontSize: 15, fontWeight: '800' },

  /* Delete */
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: Spacing.md, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: `${Colors.danger}40`,
    backgroundColor: `${Colors.danger}08`,
  },
  deleteTxt: { color: Colors.danger, fontWeight: '700', fontSize: 14 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40, gap: Spacing.md,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modalIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.3 },
  modalSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  movError: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
  modalFields: { gap: 12 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4, textTransform: 'uppercase' },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 14, fontSize: 16, color: Colors.textPrimary,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelTxt: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  modalConfirm: { flex: 2, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.primary },
  modalConfirmTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 15 },
});
