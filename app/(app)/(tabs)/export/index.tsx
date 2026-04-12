import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, useRecentMovements, calcMargin } from '@/hooks/useProducts';
import { Colors, Spacing, Radius } from '@/constants/colors';

// ── Utilitaires CSV ───────────────────────────────────────
function escapeCSV(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"` : str;
}

function generateProductsCSV(products: ReturnType<typeof useProducts>['data']): string {
  if (!products?.length) return '';
  const headers = ['Nom', 'SKU', 'Code-barres', 'Catégorie', 'Quantité', 'Unité', 'Prix achat (€)', 'Prix vente (€)', 'Marge (%)', 'Valeur stock (€)'];
  const rows = products.map((p) => {
    const { pct } = calcMargin(p.cost_price, p.selling_price);
    return [
      escapeCSV(p.name),
      escapeCSV(p.sku),
      escapeCSV(p.barcode),
      escapeCSV(p.categories?.name),
      p.stock_quantity,
      escapeCSV(p.unit),
      p.cost_price.toFixed(2),
      p.selling_price.toFixed(2),
      `${pct}%`,
      (p.cost_price * p.stock_quantity).toFixed(2),
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function generateMovementsCSV(movements: ReturnType<typeof useRecentMovements>['data']): string {
  if (!movements?.length) return '';
  const TYPE_LABELS: Record<string, string> = { in: 'Entrée', out: 'Sortie', adjustment: 'Ajustement' };
  const headers = ['Date', 'Produit', 'Type', 'Quantité', 'Raison'];
  const rows = movements.map((m) => {
    const date = new Date(m.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    return [
      escapeCSV(date),
      escapeCSV(m.products?.name),
      escapeCSV(TYPE_LABELS[m.type] ?? m.type),
      m.quantity,
      escapeCSV(m.reason),
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

async function exportCSV(csv: string, filename: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: csv, title: filename });
  }
}

// ── Écran principal ───────────────────────────────────────
export default function ExportScreen() {
  const { data: products = [], isLoading: loadingP } = useProducts();
  const { data: movements = [], isLoading: loadingM } = useRecentMovements(500);
  const isLoading = loadingP || loadingM;

  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [exporting, setExporting] = useState<'products' | 'movements' | null>(null);

  async function handleExport(type: 'products' | 'movements') {
    setStatus(null);
    setExporting(type);
    try {
      if (type === 'products') {
        const csv = generateProductsCSV(products);
        await exportCSV(csv, `stock_produits_${todayStr()}.csv`);
        setStatus({ type: 'success', msg: `${products.length} produit(s) exporté(s)` });
      } else {
        const csv = generateMovementsCSV(movements);
        await exportCSV(csv, `stock_mouvements_${todayStr()}.csv`);
        setStatus({ type: 'success', msg: `${movements.length} mouvement(s) exporté(s)` });
      }
    } catch {
      setStatus({ type: 'error', msg: "Erreur lors de l'export." });
    } finally {
      setExporting(null);
    }
  }

  // Calculs récapitulatifs
  const totalCostValue = products.reduce((s, p) => s + p.cost_price * p.stock_quantity, 0);
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Exporter</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
        ) : (
          <>
            {/* Statut */}
            {status && (
              <View style={[s.statusBox, status.type === 'success' ? s.statusOk : s.statusErr]}>
                <Ionicons
                  name={status.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={status.type === 'success' ? Colors.success : Colors.danger}
                />
                <Text style={[s.statusTxt, { color: status.type === 'success' ? Colors.success : Colors.danger }]}>
                  {status.msg}
                </Text>
              </View>
            )}

            {/* Résumé stock */}
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={s.summaryVal}>{products.length}</Text>
                <Text style={s.summaryLbl}>Produits</Text>
              </View>
              <View style={s.summarySep} />
              <View style={s.summaryItem}>
                <Text style={s.summaryVal}>{totalCostValue.toFixed(0)} €</Text>
                <Text style={s.summaryLbl}>Valeur stock</Text>
              </View>
              <View style={s.summarySep} />
              <View style={s.summaryItem}>
                <Text style={[s.summaryVal, outOfStockCount > 0 && { color: Colors.danger }]}>{outOfStockCount}</Text>
                <Text style={s.summaryLbl}>Ruptures</Text>
              </View>
              <View style={s.summarySep} />
              <View style={s.summaryItem}>
                <Text style={s.summaryVal}>{movements.length}</Text>
                <Text style={s.summaryLbl}>Mouvements</Text>
              </View>
            </View>

            {/* Export produits */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardIcon, { backgroundColor: `${Colors.primary}15` }]}>
                  <Ionicons name="cube-outline" size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>Liste des produits</Text>
                  <Text style={s.cardDesc}>{products.length} produit(s) · CSV complet</Text>
                </View>
              </View>

              <View style={s.previewBox}>
                <Text style={s.previewLabel}>COLONNES INCLUSES</Text>
                <Text style={s.previewCols}>
                  Nom · SKU · Code-barres · Catégorie · Quantité · Unité · Prix achat · Prix vente · Marge · Valeur stock
                </Text>
                {products.slice(0, 3).map((p) => {
                  const { pct } = calcMargin(p.cost_price, p.selling_price);
                  return (
                    <Text key={p.id} style={s.previewRow} numberOfLines={1}>
                      {p.name} · {p.stock_quantity} {p.unit} · {pct}% marge
                    </Text>
                  );
                })}
                {products.length > 3 && (
                  <Text style={s.previewMore}>… +{products.length - 3} produit(s)</Text>
                )}
              </View>

              <TouchableOpacity
                style={[s.exportBtn, exporting === 'products' && s.exportBtnDisabled]}
                onPress={() => handleExport('products')}
                disabled={!!exporting || products.length === 0}
                activeOpacity={0.8}
              >
                {exporting === 'products' ? (
                  <ActivityIndicator size="small" color="#0B0D11" />
                ) : (
                  <>
                    <Ionicons name={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} size={18} color="#0B0D11" />
                    <Text style={s.exportBtnTxt}>{Platform.OS === 'web' ? 'Télécharger CSV' : 'Partager CSV'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Export mouvements */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardIcon, { backgroundColor: `${Colors.info}15` }]}>
                  <Ionicons name="swap-vertical-outline" size={22} color={Colors.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>Historique des mouvements</Text>
                  <Text style={s.cardDesc}>{movements.length} mouvement(s) · CSV complet</Text>
                </View>
              </View>

              <View style={s.previewBox}>
                <Text style={s.previewLabel}>COLONNES INCLUSES</Text>
                <Text style={s.previewCols}>Date · Produit · Type (Entrée/Sortie/Ajustement) · Quantité · Raison</Text>
                {movements.slice(0, 3).map((m) => {
                  const TYPE_LABELS: Record<string, string> = { in: 'Entrée', out: 'Sortie', adjustment: 'Ajustement' };
                  const date = new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  return (
                    <Text key={m.id} style={s.previewRow} numberOfLines={1}>
                      {date} · {m.products?.name ?? '—'} · {TYPE_LABELS[m.type]} · ×{m.quantity}
                    </Text>
                  );
                })}
                {movements.length > 3 && (
                  <Text style={s.previewMore}>… +{movements.length - 3} mouvement(s)</Text>
                )}
              </View>

              <TouchableOpacity
                style={[s.exportBtn, s.exportBtnAlt, exporting === 'movements' && s.exportBtnDisabled]}
                onPress={() => handleExport('movements')}
                disabled={!!exporting || movements.length === 0}
                activeOpacity={0.8}
              >
                {exporting === 'movements' ? (
                  <ActivityIndicator size="small" color={Colors.info} />
                ) : (
                  <>
                    <Ionicons name={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} size={18} color={Colors.info} />
                    <Text style={[s.exportBtnTxt, { color: Colors.info }]}>{Platform.OS === 'web' ? 'Télécharger CSV' : 'Partager CSV'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={s.note}>
              <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textMuted} />
              <Text style={s.noteTxt}>
                Encodage UTF-8 avec BOM — compatible Excel, Google Sheets et logiciels comptables.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  backBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 48 },
  center: { paddingVertical: 60, alignItems: 'center' },

  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  statusOk: { backgroundColor: `${Colors.success}12`, borderColor: `${Colors.success}30` },
  statusErr: { backgroundColor: `${Colors.danger}12`, borderColor: `${Colors.danger}30` },
  statusTxt: { fontSize: 13, fontWeight: '600', flex: 1 },

  summaryRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  summaryLbl: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  summarySep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  cardDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  previewBox: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, gap: 4 },
  previewLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4, marginBottom: 2 },
  previewCols: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  previewRow: { fontSize: 11, color: Colors.textSecondary },
  previewMore: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginTop: 2 },

  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14 },
  exportBtnAlt: { backgroundColor: `${Colors.info}15`, borderWidth: 1.5, borderColor: `${Colors.info}40` },
  exportBtnDisabled: { opacity: 0.4 },
  exportBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 14 },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteTxt: { flex: 1, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 17 },
});
