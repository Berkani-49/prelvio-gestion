import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInvoices, type InvoiceWithCustomer } from '@/hooks/useInvoices';
import { Colors, Spacing, Radius } from '@/constants/colors';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Brouillon', color: '#7A8FA6', bg: '#7A8FA610' },
  sent:      { label: 'Envoyée',   color: '#38BDF8', bg: '#38BDF810' },
  paid:      { label: 'Payée',     color: '#2DD4AA', bg: '#2DD4AA12' },
  cancelled: { label: 'Annulée',   color: '#EF4444', bg: '#EF444410' },
};

const FILTERS = [
  { label: 'Toutes', key: null },
  { label: 'Payées', key: 'paid' },
  { label: 'Envoyées', key: 'sent' },
  { label: 'Brouillons', key: 'draft' },
  { label: 'Annulées', key: 'cancelled' },
];

function InvoiceCard({ invoice, onPress }: { invoice: InvoiceWithCustomer; onPress: () => void }) {
  const st = STATUS_CFG[invoice.status] ?? STATUS_CFG.draft;
  const customerName = invoice.customers
    ? `${invoice.customers.first_name ?? ''} ${invoice.customers.last_name}`.trim()
    : 'Client anonyme';
  const dateStr = new Date(invoice.issue_date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const dueStr = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : null;

  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.7}>
      {/* Accent latéral coloré */}
      <View style={[card.bar, { backgroundColor: st.color }]} />

      <View style={card.body}>
        {/* Ligne 1 — numéro + montant */}
        <View style={card.row1}>
          <Text style={card.num}>{invoice.invoice_number}</Text>
          <Text style={card.total}>{invoice.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</Text>
        </View>

        {/* Ligne 2 — client + badge statut */}
        <View style={card.row2}>
          <Text style={card.customer} numberOfLines={1}>{customerName}</Text>
          <View style={[card.badge, { backgroundColor: st.bg }]}>
            <View style={[card.badgeDot, { backgroundColor: st.color }]} />
            <Text style={[card.badgeTxt, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        {/* Ligne 3 — date */}
        <Text style={card.date}>
          {dateStr}{dueStr ? <Text style={card.dateDue}> · échéance {dueStr}</Text> : null}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function InvoicesScreen() {
  const { data: invoices = [], isLoading, refetch, isRefetching } = useInvoices();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filtered = invoices.filter((inv) => {
    if (activeFilter && inv.status !== activeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = inv.customers
        ? `${inv.customers.first_name ?? ''} ${inv.customers.last_name}`.toLowerCase()
        : '';
      return inv.invoice_number.toLowerCase().includes(q) || name.includes(q);
    }
    return true;
  });

  const paidTotal  = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const paidCount  = invoices.filter((i) => i.status === 'paid').length;
  const sentCount  = invoices.filter((i) => i.status === 'sent').length;
  const draftCount = invoices.filter((i) => i.status === 'draft').length;
  const pending    = invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.total, 0);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Factures</Text>
          <Text style={s.subtitle}>{invoices.length} au total</Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={() => router.push('/(app)/(tabs)/invoices/create' as any)}>
          <Text style={s.newBtnTxt}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {/* Hero card */}
      <View style={s.hero}>
        <View style={s.heroMain}>
          <View style={s.heroLeft}>
            <Text style={s.heroLabel}>ENCAISSÉ CE MOIS</Text>
            <Text style={s.heroAmount}>{paidTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</Text>
            {pending > 0 && (
              <Text style={s.heroPending}>{pending.toFixed(0)} € en attente de paiement</Text>
            )}
          </View>
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeNum}>{paidCount}</Text>
            <Text style={s.heroBadgeLbl}>payées</Text>
          </View>
        </View>
        <View style={s.heroDivider} />
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{sentCount}</Text>
            <Text style={s.heroStatLbl}>Envoyées</Text>
          </View>
          <View style={s.heroStatDiv} />
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{draftCount}</Text>
            <Text style={s.heroStatLbl}>Brouillons</Text>
          </View>
          <View style={s.heroStatDiv} />
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{invoices.length}</Text>
            <Text style={s.heroStatLbl}>Total</Text>
          </View>
        </View>
      </View>

      {/* Recherche */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          style={s.searchInput}
          placeholder="N° facture ou nom client…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={s.clearBtn}>
            <Text style={s.clearTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 0 }} contentContainerStyle={s.filtersRow}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          const cfg = f.key ? STATUS_CFG[f.key] : null;
          return (
            <TouchableOpacity
              key={String(f.key)}
              style={[s.chip, active && { borderColor: cfg?.color ?? Colors.primary, backgroundColor: cfg?.bg ?? `${Colors.primary}12` }]}
              onPress={() => setActiveFilter(f.key)}
            >
              {active && cfg && <View style={[s.chipDot, { backgroundColor: cfg.color }]} />}
              <Text style={[s.chipTxt, active && { color: cfg?.color ?? Colors.primary, fontWeight: '700' }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Liste */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>Aucune facture</Text>
          <Text style={s.emptySub}>{search ? 'Modifiez votre recherche.' : 'Créez votre première facture.'}</Text>
          {!search && (
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(app)/(tabs)/invoices/create' as any)}>
              <Text style={s.emptyBtnTxt}>Créer une facture</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <InvoiceCard invoice={item} onPress={() => router.push(`/(app)/(tabs)/invoices/${item.id}` as any)} />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Card styles ────────────────────────────────────────────
const card = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bar: { width: 3.5 },
  body: { flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: 16, gap: 6 },

  row1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  num: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  total: { fontSize: 19, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.3 },

  row2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customer: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flex: 1, marginRight: 8 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },

  date: { fontSize: 11, color: Colors.textMuted },
  dateDue: { color: Colors.textMuted },
});

// ── Screen styles ──────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: { fontSize: 30, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  newBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10 },
  newBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 13 },

  /* Hero card */
  hero: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 22, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  heroMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md, paddingBottom: 14 },
  heroLeft: { gap: 4, flex: 1 },
  heroLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },
  heroAmount: { fontSize: 38, fontWeight: '900', color: Colors.primary, letterSpacing: -1, lineHeight: 42 },
  heroPending: { fontSize: 11, color: Colors.warning, fontWeight: '500' },

  heroBadge: { alignItems: 'center', backgroundColor: `${Colors.success}12`, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: `${Colors.success}25` },
  heroBadgeNum: { fontSize: 22, fontWeight: '900', color: Colors.success },
  heroBadgeLbl: { fontSize: 10, color: Colors.success, fontWeight: '600', opacity: 0.8 },

  heroDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  heroStats: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatDiv: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  heroStatLbl: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },

  /* Recherche */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: 10,
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14,
  },
  searchIcon: { fontSize: 18, color: Colors.textMuted, marginRight: 6 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, paddingVertical: 12 },
  clearBtn: { padding: 4 },
  clearTxt: { color: Colors.textMuted, fontSize: 14 },

  /* Filtres */
  filtersRow: { paddingHorizontal: Spacing.lg, gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1,
    backgroundColor: Colors.surface, borderColor: Colors.border,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipTxt: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  /* Liste */
  list: { paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 40, gap: 10 },

  /* Empty */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: Spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 13, marginTop: 6 },
  emptyBtnTxt: { color: '#0B0D11', fontWeight: '700', fontSize: 14 },
});
