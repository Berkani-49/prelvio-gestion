import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView,
  Modal, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, useCategories, useCreateCategory, useDeleteCategory, CAT_COLORS, calcMargin } from '@/hooks/useProducts';
import { ProductCard } from '@/components/stock/ProductCard';
import { Colors, Spacing, Radius } from '@/constants/colors';

type SortKey = 'name_asc' | 'stock_asc' | 'stock_desc' | 'value_desc' | 'margin_desc';
type StockFilter = 'all' | 'out' | 'low';

const SORT_OPTIONS: { key: SortKey; label: string; emoji: string }[] = [
  { key: 'name_asc',    label: 'Nom A → Z',          emoji: '🔤' },
  { key: 'stock_asc',   label: 'Stock le plus bas',   emoji: '📉' },
  { key: 'stock_desc',  label: 'Stock le plus haut',  emoji: '📈' },
  { key: 'value_desc',  label: 'Valeur décroissante', emoji: '💰' },
  { key: 'margin_desc', label: 'Marge décroissante',  emoji: '📊' },
];

export default function StockScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('name_asc');
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState<string>(CAT_COLORS[0]);

  const { data: products, isLoading, refetch, isRefetching } = useProducts();
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  function handleAddCategory() {
    if (!newCatName.trim()) return;
    createCategory.mutate({ name: newCatName.trim(), color: newCatColor }, {
      onSuccess: () => { setNewCatName(''); setNewCatColor(CAT_COLORS[0]); },
    });
  }

  function handleDeleteCategory(id: string, name: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer la catégorie "${name}" ?`)) deleteCategory.mutate(id);
    } else {
      Alert.alert('Supprimer ?', `La catégorie "${name}" sera supprimée.`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteCategory.mutate(id) },
      ]);
    }
  }

  const filtered = useMemo(() => {
    if (!products) return [];

    let list = products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').includes(search);
      const matchCat = !selectedCategory || p.category_id === selectedCategory;
      const matchFilter =
        stockFilter === 'all' ||
        (stockFilter === 'out' && p.stock_quantity === 0) ||
        (stockFilter === 'low' && p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_alert);
      return matchSearch && matchCat && matchFilter;
    });

    switch (sortBy) {
      case 'stock_asc':   list = [...list].sort((a, b) => a.stock_quantity - b.stock_quantity); break;
      case 'stock_desc':  list = [...list].sort((a, b) => b.stock_quantity - a.stock_quantity); break;
      case 'value_desc':  list = [...list].sort((a, b) => (b.cost_price * b.stock_quantity) - (a.cost_price * a.stock_quantity)); break;
      case 'margin_desc': list = [...list].sort((a, b) => calcMargin(b.cost_price, b.selling_price).pct - calcMargin(a.cost_price, a.selling_price).pct); break;
      // name_asc : déjà trié par Supabase (.order('name'))
    }

    return list;
  }, [products, search, selectedCategory, stockFilter, sortBy]);

  const outOfStock = products?.filter((p) => p.stock_quantity === 0) ?? [];
  const lowStock   = products?.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_alert) ?? [];
  const totalValue = products?.reduce((s, p) => s + p.cost_price * p.stock_quantity, 0) ?? 0;
  const avgMargin  = products?.length
    ? Math.round(products.reduce((s, p) => {
        const m = p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.cost_price) * 100 : 0;
        return s + m;
      }, 0) / products.length)
    : 0;

  const activeSortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? '';

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>📦 Stock</Text>
          <Text style={s.subtitle}>{products?.length ?? 0} produits référencés</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.sortBtn} onPress={() => setSortModalOpen(true)} activeOpacity={0.75}>
            <Text style={s.sortBtnEmoji}>⇅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(app)/(tabs)/stock/add' as any)}>
            <Text style={s.addBtnTxt}>＋ Ajouter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero card */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroLabel}>VALEUR DU STOCK</Text>
            <Text style={s.heroAmount}>{totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroRightNum}>{avgMargin}%</Text>
            <Text style={s.heroRightLbl}>marge moy.</Text>
          </View>
        </View>

        {(outOfStock.length > 0 || lowStock.length > 0) && (
          <View style={s.alertsRow}>
            {outOfStock.length > 0 && (
              <TouchableOpacity
                style={[s.alertPill, { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.35)' }]}
                onPress={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
              >
                <Text style={s.alertPillEmoji}>🔴</Text>
                <Text style={[s.alertPillTxt, { color: '#FFFFFF' }]}>{outOfStock.length} en rupture</Text>
              </TouchableOpacity>
            )}
            {lowStock.length > 0 && (
              <TouchableOpacity
                style={[s.alertPill, { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.35)' }]}
                onPress={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
              >
                <Text style={s.alertPillEmoji}>🟡</Text>
                <Text style={[s.alertPillTxt, { color: '#FFFFFF' }]}>{lowStock.length} stock bas</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={s.heroDivider} />
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{products?.length ?? 0}</Text>
            <Text style={s.heroStatLbl}>📦 Produits</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, outOfStock.length > 0 && { color: Colors.danger }]}>{outOfStock.length}</Text>
            <Text style={s.heroStatLbl}>🔴 Ruptures</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, lowStock.length > 0 && { color: Colors.warning }]}>{lowStock.length}</Text>
            <Text style={s.heroStatLbl}>🟡 Stock bas</Text>
          </View>
        </View>
      </View>

      {/* Recherche */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Nom, SKU, code-barres…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={s.clearBtn}>
            <Text style={s.clearBtnTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres rapides stock */}
      <View style={s.filterRow}>
        {([
          { key: 'all' as StockFilter, label: 'Tous' },
          { key: 'out' as StockFilter, label: 'Rupture' },
          { key: 'low' as StockFilter, label: 'Stock bas' },
        ]).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[s.filterChip, stockFilter === key && s.filterChipActive]}
            onPress={() => setStockFilter(key)}
          >
            <Text style={[s.filterChipTxt, stockFilter === key && s.filterChipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {sortBy !== 'name_asc' && (
          <View style={s.sortActivePill}>
            <Ionicons name="funnel" size={10} color={Colors.primary} />
            <Text style={s.sortActiveTxt} numberOfLines={1}>{activeSortLabel}</Text>
          </View>
        )}
      </View>

      {/* Filtres catégories */}
      <View style={s.catSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow} style={{ flex: 1 }}>
          <TouchableOpacity
            style={[s.catChip, !selectedCategory && s.catChipAll]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[s.catChipTxt, !selectedCategory && s.catChipTxtAll]}>Tous</Text>
          </TouchableOpacity>
          {(categories ?? []).map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[s.catChip, active && { borderColor: cat.color, backgroundColor: `${cat.color}18` }]}
                onPress={() => setSelectedCategory(active ? null : cat.id)}
              >
                <Text style={[s.catDotEmoji, { color: cat.color }]}>●</Text>
                <Text style={[s.catChipTxt, active && { color: cat.color, fontWeight: '700' }]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={s.catManageBtn} onPress={() => setCatModalOpen(true)}>
          <Ionicons name="settings-outline" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Liste */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>{search || stockFilter !== 'all' ? 'Aucun résultat' : 'Aucun produit'}</Text>
          <Text style={s.emptySub}>
            {search ? `Aucun produit pour "${search}"` : stockFilter !== 'all' ? 'Aucun produit dans ce filtre.' : 'Ajoutez votre premier produit.'}
          </Text>
          {!search && stockFilter === 'all' && (
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(app)/(tabs)/stock/add' as any)}>
              <Text style={s.emptyBtnTxt}>+ Ajouter un produit</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard product={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        />
      )}

      {/* Modal tri */}
      <Modal visible={sortModalOpen} animationType="slide" transparent onRequestClose={() => setSortModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Trier par</Text>
              <TouchableOpacity onPress={() => setSortModalOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.sortRow, sortBy === opt.key && s.sortRowActive]}
                onPress={() => { setSortBy(opt.key); setSortModalOpen(false); }}
              >
                <View style={[s.sortIconWrap, sortBy === opt.key && s.sortIconWrapActive]}>
                  <Text style={[s.sortIconEmoji, sortBy === opt.key && s.sortIconEmojiActive]}>{opt.emoji}</Text>
                </View>
                <Text style={[s.sortLabel, sortBy === opt.key && s.sortLabelActive]}>{opt.label}</Text>
                {sortBy === opt.key && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal gestion catégories */}
      <Modal visible={catModalOpen} animationType="slide" transparent onRequestClose={() => setCatModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Gérer les catégories</Text>
              <TouchableOpacity onPress={() => setCatModalOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={s.modalCreateRow}>
              <TextInput
                style={s.modalInput}
                placeholder="Nouvelle catégorie..."
                placeholderTextColor={Colors.textMuted}
                value={newCatName}
                onChangeText={setNewCatName}
              />
              <TouchableOpacity
                style={[s.modalAddBtn, !newCatName.trim() && { opacity: 0.4 }]}
                onPress={handleAddCategory}
                disabled={!newCatName.trim()}
              >
                <Ionicons name="add" size={20} color="#0B0D11" />
              </TouchableOpacity>
            </View>

            <View style={s.modalColorRow}>
              {CAT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.modalColorDot, { backgroundColor: c }, newCatColor === c && s.modalColorDotActive]}
                  onPress={() => setNewCatColor(c)}
                />
              ))}
            </View>

            <ScrollView style={s.modalList} showsVerticalScrollIndicator={false}>
              {(categories ?? []).length === 0 ? (
                <Text style={s.modalEmpty}>Aucune catégorie créée</Text>
              ) : (
                (categories ?? []).map((cat) => (
                  <View key={cat.id} style={s.modalCatRow}>
                    <View style={[s.modalCatDot, { backgroundColor: cat.color }]} />
                    <Text style={s.modalCatName}>{cat.name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)} style={s.modalDeleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: 30, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: `${Colors.primary}15`, borderWidth: 1, borderColor: `${Colors.primary}30`,
    alignItems: 'center', justifyContent: 'center',
  },
  sortBtnEmoji: { fontSize: 16, color: Colors.primary },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnTxt: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  /* Hero */
  hero: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.xl, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md, paddingBottom: 10 },
  heroLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 1.4 },
  heroAmount: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1, lineHeight: 40 },
  heroRight: { alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  heroRightNum: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  heroRightLbl: { fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  alertsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingBottom: 10 },
  alertPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  alertPillDot: { width: 6, height: 6, borderRadius: 3 },
  alertPillEmoji: { fontSize: 12 },
  alertPillTxt: { fontSize: 11, fontWeight: '700' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: Spacing.md },
  heroStats: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },

  /* Recherche */
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: 8, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14 },
  searchIcon: { fontSize: 18, color: Colors.textMuted, marginRight: 6 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, paddingVertical: 12 },
  clearBtn: { padding: 4 },
  clearBtnTxt: { color: Colors.textMuted, fontSize: 14 },

  /* Filtres rapides */
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, gap: 6, marginBottom: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipTxt: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  filterChipTxtActive: { color: '#FFFFFF', fontWeight: '700' },
  sortActivePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: `${Colors.primary}15`, borderRadius: Radius.full, maxWidth: 120 },
  sortActiveTxt: { fontSize: 10, fontWeight: '600', color: Colors.primary },

  /* Catégories */
  catSection: { flexDirection: 'row', alignItems: 'center', paddingRight: Spacing.md, marginBottom: 12 },
  catRow: { paddingHorizontal: Spacing.lg, gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  catChipAll: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  catDot: { width: 7, height: 7, borderRadius: 4 },
  catDotEmoji: { fontSize: 10 },
  catChipTxt: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  catChipTxtAll: { color: Colors.primary, fontWeight: '700' },
  catManageBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: `${Colors.primary}15`, borderWidth: 1, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },

  /* Liste */
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: Spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md },
  emptyBtnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  /* Modal partagé */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, maxHeight: '70%' },
  modalHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },

  /* Tri */
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: Radius.md, marginBottom: 2 },
  sortRowActive: { backgroundColor: `${Colors.primary}10` },
  sortIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  sortIconWrapActive: { backgroundColor: Colors.primary },
  sortIconEmoji: { fontSize: 16 },
  sortIconEmojiActive: { fontSize: 16 },
  sortLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  sortLabelActive: { color: Colors.primary, fontWeight: '700' },

  /* Catégories modal */
  modalCreateRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modalInput: { flex: 1, height: 46, borderRadius: 14, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, color: Colors.textPrimary, fontSize: 14 },
  modalAddBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  modalColorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  modalColorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  modalColorDotActive: { borderColor: Colors.primary, shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 6 },
  modalList: { marginBottom: Spacing.md },
  modalEmpty: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  modalCatRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCatDot: { width: 12, height: 12, borderRadius: 6 },
  modalCatName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  modalDeleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: `${Colors.danger}12`, alignItems: 'center', justifyContent: 'center' },
});
