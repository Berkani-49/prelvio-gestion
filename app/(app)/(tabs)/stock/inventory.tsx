import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, useStockMovement } from '@/hooks/useProducts';
import { Colors, Spacing, Radius } from '@/constants/colors';

interface CountEntry {
  productId: string;
  name: string;
  unit: string;
  currentQty: number;
  countedQty: string;
}

export default function InventoryScreen() {
  const { data: products = [], isLoading } = useProducts();
  const { mutateAsync: stockMovement } = useStockMovement();

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const entries = useMemo((): CountEntry[] =>
    products.map((p) => ({
      productId: p.id,
      name: p.name,
      unit: p.unit,
      currentQty: p.stock_quantity,
      countedQty: counts[p.id] ?? '',
    })), [products, counts]);

  const filtered = useMemo(() =>
    entries.filter((e) =>
      !search || e.name.toLowerCase().includes(search.toLowerCase())
    ), [entries, search]);

  const adjustments = useMemo(() =>
    entries.filter((e) => {
      const val = Number(e.countedQty);
      return e.countedQty !== '' && !isNaN(val) && val >= 0 && val !== e.currentQty;
    }), [entries]);

  function updateCount(productId: string, value: string) {
    setCounts((prev) => ({ ...prev, [productId]: value }));
  }

  async function handleSubmit() {
    if (adjustments.length === 0) return;

    const confirmed = await new Promise<boolean>((resolve) => {
      if (Platform.OS === 'web') {
        resolve(window.confirm(`Valider ${adjustments.length} ajustement(s) de stock ?`));
      } else {
        Alert.alert(
          'Valider l\'inventaire',
          `${adjustments.length} produit(s) seront ajustés. Continuer ?`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Valider', onPress: () => resolve(true) },
          ],
          { cancelable: false }
        );
      }
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    setDoneCount(0);
    let successCount = 0;
    const errors: string[] = [];

    for (const adj of adjustments) {
      try {
        await stockMovement({
          productId: adj.productId,
          type: 'adjustment',
          quantity: Number(adj.countedQty),
          reason: 'Inventaire physique',
        });
        successCount++;
        setDoneCount(successCount);
        // Supprime l'entrée comptée après succès
        setCounts((prev) => { const next = { ...prev }; delete next[adj.productId]; return next; });
      } catch {
        errors.push(adj.name);
      }
    }

    setIsSubmitting(false);

    if (errors.length === 0) {
      if (Platform.OS === 'web') {
        alert(`Inventaire validé : ${successCount} ajustement(s) appliqués.`);
      } else {
        Alert.alert('Inventaire validé', `${successCount} ajustement(s) appliqués avec succès.`, [
          { text: 'Retour au stock', onPress: () => router.back() },
        ]);
      }
    } else {
      const msg = `${successCount} ajustement(s) réussi(s).\nÉchec pour : ${errors.join(', ')}`;
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Résultat partiel', msg);
      }
    }
  }

  function renderItem({ item }: { item: CountEntry }) {
    const counted = Number(item.countedQty);
    const isModified = item.countedQty !== '' && !isNaN(counted) && counted !== item.currentQty;
    const isDiff = isModified;
    const diff = isDiff ? counted - item.currentQty : 0;
    const diffColor = diff > 0 ? Colors.success : diff < 0 ? Colors.danger : Colors.warning;

    return (
      <View style={[row.wrap, isDiff && row.wrapModified]}>
        <View style={row.info}>
          <Text style={row.name} numberOfLines={1}>{item.name}</Text>
          <Text style={row.current}>Stock actuel : <Text style={row.currentVal}>{item.currentQty} {item.unit}</Text></Text>
        </View>

        <View style={row.inputWrap}>
          {isDiff && (
            <Text style={[row.diff, { color: diffColor }]}>
              {diff > 0 ? '+' : ''}{diff}
            </Text>
          )}
          <TextInput
            style={[row.input, isDiff && { borderColor: diffColor }]}
            placeholder={String(item.currentQty)}
            placeholderTextColor={Colors.textMuted}
            value={item.countedQty}
            onChangeText={(v) => updateCount(item.productId, v)}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Inventaire physique</Text>
          <Text style={s.subtitle}>Saisissez les quantités comptées</Text>
        </View>
        <TouchableOpacity
          style={[s.validateBtn, adjustments.length === 0 && s.validateBtnDisabled]}
          onPress={handleSubmit}
          disabled={adjustments.length === 0 || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#0B0D11" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={16} color={adjustments.length > 0 ? '#0B0D11' : Colors.textMuted} />
              <Text style={[s.validateBtnTxt, adjustments.length === 0 && s.validateBtnTxtDisabled]}>
                Valider {adjustments.length > 0 ? `(${adjustments.length})` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Progression si en cours */}
      {isSubmitting && (
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${(doneCount / adjustments.length) * 100}%` as any }]} />
        </View>
      )}

      {/* Barre de recherche */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher un produit…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={s.clearTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Résumé */}
      <View style={s.summaryRow}>
        <Text style={s.summaryTxt}>
          {products.length} produit{products.length > 1 ? 's' : ''}
        </Text>
        {adjustments.length > 0 && (
          <View style={s.summaryBadge}>
            <Text style={s.summaryBadgeTxt}>{adjustments.length} modification{adjustments.length > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.productId}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyTxt}>Aucun produit trouvé</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  backBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  validateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 9 },
  validateBtnDisabled: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  validateBtnTxt: { fontSize: 13, fontWeight: '800', color: '#0B0D11' },
  validateBtnTxtDisabled: { color: Colors.textMuted },

  progressBar: { height: 3, backgroundColor: Colors.surfaceAlt, marginHorizontal: Spacing.lg },
  progressFill: { height: 3, backgroundColor: Colors.primary, borderRadius: 2 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: 8, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14 },
  searchIcon: { fontSize: 18, color: Colors.textMuted, marginRight: 6 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, paddingVertical: 11 },
  clearTxt: { color: Colors.textMuted, fontSize: 14, padding: 4 },

  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: 8, gap: 10 },
  summaryTxt: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  summaryBadge: { backgroundColor: `${Colors.primary}20`, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  summaryBadgeTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTxt: { color: Colors.textMuted, fontSize: 14 },
});

const row = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  wrapModified: { backgroundColor: `${Colors.primary}06`, borderRadius: Radius.sm, marginHorizontal: -8, paddingHorizontal: 8 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  current: { fontSize: 11, color: Colors.textMuted },
  currentVal: { fontWeight: '700', color: Colors.textSecondary },
  inputWrap: { alignItems: 'flex-end', gap: 3 },
  diff: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  input: {
    width: 80, height: 42, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary,
  },
});
