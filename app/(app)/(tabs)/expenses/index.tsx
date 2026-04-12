import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, RefreshControl,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { Colors, Spacing, Radius } from '@/constants/colors';
import type { Expense } from '@/hooks/useExpenses';

const CATEGORIES = ['Loyer', 'Salaires', 'Fournisseurs', 'Marketing', 'Transport', 'Charges', 'Autre'];
const TYPE_CONFIG = {
  fixed:    { label: 'Fixe',     color: Colors.info    },
  variable: { label: 'Variable', color: Colors.warning  },
};

// ── Carte dépense ─────────────────────────────────────────
function ExpenseCard({ expense, onDelete }: { expense: Expense; onDelete: () => void }) {
  const tc = TYPE_CONFIG[expense.type];
  return (
    <View style={s.card}>
      <View style={[s.typeBar, { backgroundColor: tc.color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={s.cardDesc} numberOfLines={1}>{expense.description}</Text>
          <Text style={[s.cardAmount, { color: Colors.danger }]}>−{expense.amount.toFixed(2)} €</Text>
        </View>
        <View style={s.cardBot}>
          <View style={s.cardTags}>
            {expense.category && (
              <View style={s.catBadge}>
                <Text style={s.catTxt}>{expense.category}</Text>
              </View>
            )}
            <View style={[s.typeBadge, { backgroundColor: `${tc.color}15`, borderColor: `${tc.color}30` }]}>
              <View style={[s.typeDot, { backgroundColor: tc.color }]} />
              <Text style={[s.typeTxt, { color: tc.color }]}>{tc.label}</Text>
            </View>
          </View>
          <View style={s.cardDateRow}>
            <Text style={s.cardDate}>
              {new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Modal création ────────────────────────────────────────
function CreateModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { mutateAsync: create, isPending } = useCreateExpense();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'fixed' | 'variable'>('variable');
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!description.trim()) { setError('Description requise'); return; }
    const amt = parseFloat(amount.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) { setError('Montant invalide'); return; }
    setError('');
    try {
      await create({ description: description.trim(), amount: amt, type, category, date });
      setDescription(''); setAmount(''); setType('variable'); setCategory(null);
      setDate(new Date().toISOString().split('T')[0]);
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Erreur');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <View style={m.handle} />

          <View style={m.sheetHeader}>
            <Text style={m.title}>Nouvelle dépense</Text>
            <TouchableOpacity onPress={onClose} style={m.closeBtn}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.md }}>
            <View style={m.fieldWrap}>
              <Text style={m.label}>DESCRIPTION *</Text>
              <TextInput
                style={m.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Ex : Loyer octobre…"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={m.fieldWrap}>
              <Text style={m.label}>MONTANT (€) *</Text>
              <TextInput
                style={m.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={m.fieldWrap}>
              <Text style={m.label}>DATE</Text>
              <TextInput
                style={m.input}
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={m.fieldWrap}>
              <Text style={m.label}>TYPE</Text>
              <View style={m.toggleRow}>
                {(['fixed', 'variable'] as const).map((t) => {
                  const active = type === t;
                  const color = TYPE_CONFIG[t].color;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[m.toggleBtn, active && { borderColor: color, backgroundColor: `${color}15` }]}
                      onPress={() => setType(t)}
                    >
                      {active && <View style={[m.toggleDot, { backgroundColor: color }]} />}
                      <Text style={[m.toggleTxt, active && { color, fontWeight: '800' }]}>
                        {TYPE_CONFIG[t].label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={m.fieldWrap}>
              <Text style={m.label}>CATÉGORIE</Text>
              <View style={m.catGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[m.catChip, category === cat && m.catChipActive]}
                    onPress={() => setCategory(category === cat ? null : cat)}
                  >
                    <Text style={[m.catChipTxt, category === cat && m.catChipTxtActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error ? <Text style={m.error}>{error}</Text> : null}

            <View style={m.actions}>
              <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
                <Text style={m.cancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.createBtn} onPress={handleCreate} disabled={isPending}>
                {isPending
                  ? <ActivityIndicator color="#0B0D11" size="small" />
                  : <Text style={m.createTxt}>Enregistrer</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Écran principal ───────────────────────────────────────
export default function ExpensesScreen() {
  const { data: expenses = [], isLoading, refetch, isRefetching } = useExpenses();
  const { mutateAsync: deleteExpense } = useDeleteExpense();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'fixed' | 'variable'>('all');

  const filtered = useMemo(() =>
    filter === 'all' ? expenses : expenses.filter((e) => e.type === filter),
    [expenses, filter]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthExp = expenses.filter((e) => new Date(e.date) >= monthStart);
    const totalMonth = monthExp.reduce((s, e) => s + e.amount, 0);
    const totalFixed = expenses.filter((e) => e.type === 'fixed').reduce((s, e) => s + e.amount, 0);
    const totalVariable = expenses.filter((e) => e.type === 'variable').reduce((s, e) => s + e.amount, 0);
    const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
    return { totalMonth, totalFixed, totalVariable, totalAll };
  }, [expenses]);

  function confirmDelete(id: string) {
    Alert.alert('Supprimer', 'Confirmer la suppression de cette dépense ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteExpense(id) },
    ]);
  }

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Dépenses</Text>
          <Text style={s.subtitle}>{expenses.length} entrée{expenses.length > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={s.addBtnTxt}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Hero card */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroLabel}>DÉPENSES CE MOIS</Text>
            <Text style={s.heroAmount}>−{stats.totalMonth.toFixed(0)} €</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroRightNum}>{stats.totalAll.toFixed(0)} €</Text>
            <Text style={s.heroRightLbl}>total cumulé</Text>
          </View>
        </View>
        <View style={s.heroDivider} />
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.info }]}>{stats.totalFixed.toFixed(0)} €</Text>
            <Text style={s.heroStatLbl}>Fixes</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.warning }]}>{stats.totalVariable.toFixed(0)} €</Text>
            <Text style={s.heroStatLbl}>Variables</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{expenses.length}</Text>
            <Text style={s.heroStatLbl}>Entrées</Text>
          </View>
        </View>
      </View>

      {/* Filtres */}
      <View style={s.filtersRow}>
        {([['all', 'Toutes', null], ['fixed', 'Fixes', Colors.info], ['variable', 'Variables', Colors.warning]] as const).map(([key, lbl, color]) => {
          const active = filter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[s.chip, active && { borderColor: color ?? Colors.primary, backgroundColor: `${color ?? Colors.primary}15` }]}
              onPress={() => setFilter(key)}
            >
              {active && color && <View style={[s.chipDot, { backgroundColor: color }]} />}
              <Text style={[s.chipTxt, active && { color: color ?? Colors.primary, fontWeight: '700' }]}>{lbl}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="trending-down-outline" size={32} color={Colors.textMuted} />
          </View>
          <Text style={s.emptyTitle}>Aucune dépense</Text>
          <Text style={s.emptySub}>Enregistrez vos charges et dépenses.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.emptyBtnTxt}>+ Ajouter une dépense</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <ExpenseCard expense={item} onDelete={() => confirmDelete(item.id)} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        />
      )}

      <CreateModal visible={showCreate} onClose={() => setShowCreate(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: { fontSize: 30, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 13 },

  /* Hero */
  hero: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md, paddingBottom: 10 },
  heroLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },
  heroAmount: { fontSize: 36, fontWeight: '900', color: Colors.danger, letterSpacing: -1, lineHeight: 40 },
  heroRight: { alignItems: 'flex-end', backgroundColor: `${Colors.danger}10`, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: `${Colors.danger}20` },
  heroRightNum: { fontSize: 18, fontWeight: '900', color: Colors.danger },
  heroRightLbl: { fontSize: 9, color: Colors.danger, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  heroStats: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatSep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  heroStatVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  heroStatLbl: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },

  /* Filtres */
  filtersRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipTxt: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 8 },

  /* Card */
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  typeBar: { width: 4 },
  cardBody: { flex: 1, padding: Spacing.md, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDesc: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 10 },
  cardAmount: { fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  cardBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTags: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  catBadge: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  catTxt: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  typeDot: { width: 5, height: 5, borderRadius: 3 },
  typeTxt: { fontSize: 10, fontWeight: '800' },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardDate: { fontSize: 11, color: Colors.textMuted },

  /* Empty */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: Spacing.xl },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md },
  emptyBtnTxt: { color: '#0B0D11', fontWeight: '700', fontSize: 14 },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40, maxHeight: '92%',
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  fieldWrap: { gap: 6 },
  label: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 13, fontSize: 15, color: Colors.textPrimary,
  },

  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
  },
  toggleDot: { width: 6, height: 6, borderRadius: 3 },
  toggleTxt: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipTxt: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  catChipTxtActive: { color: '#0B0D11', fontWeight: '700' },

  error: { color: Colors.danger, fontSize: 13, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelTxt: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  createBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  createTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 15 },
});
