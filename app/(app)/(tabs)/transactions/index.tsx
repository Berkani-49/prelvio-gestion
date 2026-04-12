import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInvoices, useDeleteInvoice } from '@/hooks/useInvoices';
import { useExpenses, useDeleteExpense } from '@/hooks/useExpenses';
import { Colors, Spacing, Radius } from '@/constants/colors';

type Period = '7j' | '30j' | '3m' | 'tout';

type Transaction = {
  id: string;
  date: string;
  label: string;
  sublabel: string;
  amount: number;
  type: 'income' | 'expense';
  route?: string;
};

const PERIOD_DAYS: Record<Period, number | null> = {
  '7j': 7, '30j': 30, '3m': 90, 'tout': null,
};

function groupByDate(transactions: Transaction[]): { title: string; data: Transaction[] }[] {
  const groups: Record<string, Transaction[]> = {};
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = "Aujourd'hui";
    else if (d.toDateString() === yesterday.toDateString()) key = 'Hier';
    else key = d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function TransactionsScreen() {
  const { data: invoices = [], isLoading: loadI, refetch: refetchI, isRefetching: refI } = useInvoices();
  const { data: expenses = [], isLoading: loadE, refetch: refetchE, isRefetching: refE } = useExpenses();
  const [period, setPeriod] = useState<Period>('30j');
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const deleteInvoice = useDeleteInvoice();
  const deleteExpense = useDeleteExpense();

  const isLoading = loadI || loadE;
  const isRefreshing = refI || refE;

  const allTransactions = useMemo((): Transaction[] => {
    const cutoff = PERIOD_DAYS[period] !== null
      ? new Date(Date.now() - (PERIOD_DAYS[period]! * 86400000))
      : null;

    const income: Transaction[] = invoices
      .filter((inv) => inv.status === 'paid')
      .filter((inv) => !cutoff || new Date(inv.issue_date) >= cutoff)
      .map((inv) => {
        const name = inv.customers
          ? `${inv.customers.first_name ?? ''} ${inv.customers.last_name}`.trim()
          : 'Client anonyme';
        return {
          id: `inv-${inv.id}`,
          date: inv.issue_date,
          label: inv.invoice_number,
          sublabel: name,
          amount: inv.total,
          type: 'income',
          route: `/(app)/(tabs)/invoices/${inv.id}`,
        };
      });

    const exp: Transaction[] = expenses
      .filter((e) => !cutoff || new Date(e.date) >= cutoff)
      .map((e) => ({
        id: `exp-${e.id}`,
        date: e.date,
        label: e.description,
        sublabel: e.category ?? (e.type === 'fixed' ? 'Charge fixe' : 'Variable'),
        amount: e.amount,
        type: 'expense' as const,
      }));

    return [...income, ...exp]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, expenses, period]);

  const filtered = useMemo(() =>
    type === 'all' ? allTransactions : allTransactions.filter((t) => t.type === type),
    [allTransactions, type]
  );

  const stats = useMemo(() => {
    const totalIn  = allTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalOut = allTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [allTransactions]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);

  function refresh() { refetchI(); refetchE(); }

  function confirmDelete(item: Transaction) {
    if (item.id.startsWith('inv-')) deleteInvoice.mutate(item.id.replace('inv-', ''));
    else deleteExpense.mutate(item.id.replace('exp-', ''));
  }

  function handleDelete(item: Transaction) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer "${item.label}" — ${item.amount.toFixed(2)} € ?`)) {
        confirmDelete(item);
      }
    } else {
      Alert.alert(
        'Supprimer cette transaction ?',
        `${item.label} — ${item.amount.toFixed(2)} €`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: () => confirmDelete(item) },
        ]
      );
    }
  }

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Transactions</Text>
        <Text style={s.subtitle}>{filtered.length} opération{filtered.length > 1 ? 's' : ''}</Text>
      </View>

      {/* Hero card solde net */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroLabel}>SOLDE NET</Text>
            <Text style={[s.heroAmount, { color: stats.net >= 0 ? Colors.success : Colors.danger }]}>
              {stats.net >= 0 ? '+' : ''}{stats.net.toFixed(0)} €
            </Text>
          </View>
          <View style={[s.heroRight, { backgroundColor: stats.net >= 0 ? `${Colors.success}12` : `${Colors.danger}12`, borderColor: stats.net >= 0 ? `${Colors.success}25` : `${Colors.danger}25` }]}>
            <Text style={[s.heroRightNum, { color: stats.net >= 0 ? Colors.success : Colors.danger }]}>
              {allTransactions.length}
            </Text>
            <Text style={[s.heroRightLbl, { color: stats.net >= 0 ? Colors.success : Colors.danger }]}>opérations</Text>
          </View>
        </View>
        <View style={s.heroDivider} />
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.success }]}>+{stats.totalIn.toFixed(0)} €</Text>
            <Text style={s.heroStatLbl}>Revenus</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.danger }]}>−{stats.totalOut.toFixed(0)} €</Text>
            <Text style={s.heroStatLbl}>Dépenses</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.success }]}>
              {invoices.filter((i) => i.status === 'paid').length}
            </Text>
            <Text style={s.heroStatLbl}>Factures payées</Text>
          </View>
        </View>
      </View>

      {/* Filtres */}
      <View style={s.filterRow}>
        {/* Période */}
        {(['7j', '30j', '3m', 'tout'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.chip, period === p && s.chipActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[s.chipTxt, period === p && s.chipTxtActive]}>{p}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ flex: 1 }} />

        {/* Type */}
        <TouchableOpacity
          style={[s.typeChip, type === 'income' && { backgroundColor: `${Colors.success}15`, borderColor: Colors.success }]}
          onPress={() => setType(type === 'income' ? 'all' : 'income')}
        >
          <Ionicons name="trending-up-outline" size={16} color={type === 'income' ? Colors.success : Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.typeChip, type === 'expense' && { backgroundColor: `${Colors.danger}15`, borderColor: Colors.danger }]}
          onPress={() => setType(type === 'expense' ? 'all' : 'expense')}
        >
          <Ionicons name="trending-down-outline" size={16} color={type === 'expense' ? Colors.danger : Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="swap-horizontal-outline" size={32} color={Colors.textMuted} />
          </View>
          <Text style={s.emptyTitle}>Aucune transaction</Text>
          <Text style={s.emptySub}>Aucune opération sur cette période.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />}
          renderSectionHeader={({ section: { title, data } }) => {
            const dayTotal = data.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
            return (
              <View style={s.sectionHead}>
                <Text style={s.sectionDate}>{title}</Text>
                <Text style={[s.sectionTotal, { color: dayTotal >= 0 ? Colors.success : Colors.danger }]}>
                  {dayTotal >= 0 ? '+' : ''}{dayTotal.toFixed(0)} €
                </Text>
              </View>
            );
          }}
          renderItem={({ item, index, section }) => {
            const isLast = index === section.data.length - 1;
            const isIncome = item.type === 'income';
            return (
              <TouchableOpacity
                style={[s.row, isLast && s.rowLast]}
                onPress={() => item.route && router.push(item.route as any)}
                onLongPress={() => handleDelete(item)}
                activeOpacity={item.route ? 0.75 : 1}
              >
                <View style={[s.iconWrap, { backgroundColor: isIncome ? `${Colors.success}15` : `${Colors.danger}15` }]}>
                  <Ionicons
                    name={isIncome ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={isIncome ? Colors.success : Colors.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={s.rowSub} numberOfLines={1}>{item.sublabel}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[s.rowAmount, { color: isIncome ? Colors.success : Colors.danger }]}>
                    {isIncome ? '+' : '−'}{item.amount.toFixed(2)} €
                  </Text>
                  {item.route && <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} />}
                </View>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: 30, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  /* Hero */
  hero: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md, paddingBottom: 10 },
  heroLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },
  heroAmount: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5, lineHeight: 44 },
  heroRight: { alignItems: 'flex-end', borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  heroRightNum: { fontSize: 22, fontWeight: '900' },
  heroRightLbl: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  heroStats: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatSep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  heroStatVal: { fontSize: 15, fontWeight: '800' },
  heroStatLbl: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },

  /* Filtres */
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 6, marginBottom: Spacing.sm, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  chipTxtActive: { color: '#0B0D11', fontWeight: '800' },
  typeChip: {
    width: 36, height: 32, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 48 },

  /* Section header */
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingTop: 16,
  },
  sectionDate: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'capitalize', letterSpacing: 0.3 },
  sectionTotal: { fontSize: 12, fontWeight: '800' },

  /* Ligne transaction */
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md,
  },
  rowLast: { borderBottomWidth: 0, borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg, marginBottom: 4 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  rowAmount: { fontSize: 14, fontWeight: '800' },

  /* Empty */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: Spacing.xl },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  /* Delete button */
  deleteBtn: {
    width: 32, height: 32, borderRadius: Radius.md,
    backgroundColor: `${Colors.danger}12`, borderWidth: 1, borderColor: `${Colors.danger}20`,
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
});
