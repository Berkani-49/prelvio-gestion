import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCustomers } from '@/hooks/useCustomers';
import { Colors, Spacing, Radius } from '@/constants/colors';
import type { Customer } from '@/types/database';

const SEGMENT_CONFIG: Record<string, { color: string; label: string }> = {
  vip:      { color: Colors.warning,   label: 'VIP' },
  regular:  { color: Colors.primary,   label: 'Régulier' },
  new:      { color: Colors.success,   label: 'Nouveau' },
  inactive: { color: Colors.textMuted, label: 'Inactif' },
};

function CustomerCard({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const seg = SEGMENT_CONFIG[customer.segment] ?? SEGMENT_CONFIG.regular;
  const fullName = `${customer.first_name ?? ''} ${customer.last_name}`.trim();
  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      {/* Barre couleur segment */}
      <View style={[s.cardBar, { backgroundColor: seg.color }]} />

      <View style={[s.avatar, { backgroundColor: `${seg.color}15`, borderColor: `${seg.color}30` }]}>
        <Text style={[s.avatarTxt, { color: seg.color }]}>{initials}</Text>
      </View>

      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{fullName}</Text>
        <Text style={s.contact} numberOfLines={1}>
          {customer.email ?? customer.phone ?? 'Aucun contact'}
        </Text>
      </View>

      <View style={s.right}>
        <View style={[s.segBadge, { backgroundColor: `${seg.color}15`, borderColor: `${seg.color}30` }]}>
          <View style={[s.segDot, { backgroundColor: seg.color }]} />
          <Text style={[s.segTxt, { color: seg.color }]}>{seg.label}</Text>
        </View>
        {customer.loyalty_points > 0 && (
          <Text style={s.pts}>{customer.loyalty_points} pts</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const SEGMENTS = ['Tous', 'VIP', 'Régulier', 'Nouveau', 'Inactif'];
const SEG_KEYS: Record<string, string | null> = {
  Tous: null, VIP: 'vip', Régulier: 'regular', Nouveau: 'new', Inactif: 'inactive',
};

export default function CustomersScreen() {
  const { data: customers = [], isLoading, refetch, isRefetching } = useCustomers();
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('Tous');

  const filtered = useMemo(() => customers.filter((c) => {
    const key = SEG_KEYS[segment];
    if (key && c.segment !== key) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        `${c.first_name ?? ''} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
      );
    }
    return true;
  }), [customers, search, segment]);

  const vipCount      = customers.filter((c) => c.segment === 'vip').length;
  const newCount      = customers.filter((c) => c.segment === 'new').length;
  const totalPoints   = customers.reduce((sum, c) => sum + c.loyalty_points, 0);

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Clients</Text>
          <Text style={s.subtitle}>{customers.length} clients enregistrés</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(app)/(tabs)/customers/add' as any)}>
          <Text style={s.addBtnTxt}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Hero card */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroLabel}>TOTAL CLIENTS</Text>
            <Text style={s.heroAmount}>{customers.length}</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroRightNum}>{totalPoints}</Text>
            <Text style={s.heroRightLbl}>pts cumulés</Text>
          </View>
        </View>
        <View style={s.heroDivider} />
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.warning }]}>{vipCount}</Text>
            <Text style={s.heroStatLbl}>VIP</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.success }]}>{newCount}</Text>
            <Text style={s.heroStatLbl}>Nouveaux</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{customers.filter((c) => c.segment === 'regular').length}</Text>
            <Text style={s.heroStatLbl}>Réguliers</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.textMuted }]}>{customers.filter((c) => c.segment === 'inactive').length}</Text>
            <Text style={s.heroStatLbl}>Inactifs</Text>
          </View>
        </View>
      </View>

      {/* Recherche */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={17} color={Colors.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Nom, email, téléphone…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={s.clearBtn}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres segment */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
        {SEGMENTS.map((seg) => {
          const active = segment === seg;
          const segKey = SEG_KEYS[seg];
          const color = segKey ? SEGMENT_CONFIG[segKey]?.color : Colors.primary;
          return (
            <TouchableOpacity
              key={seg}
              style={[s.chip, active && { borderColor: color, backgroundColor: `${color}15` }]}
              onPress={() => setSegment(seg)}
            >
              {active && segKey && <View style={[s.chipDot, { backgroundColor: color }]} />}
              <Text style={[s.chipTxt, active && { color, fontWeight: '700' }]}>{seg}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
          </View>
          <Text style={s.emptyTitle}>{search ? 'Aucun résultat' : 'Aucun client'}</Text>
          <Text style={s.emptySub}>{search ? `Aucun client pour "${search}"` : 'Ajoutez votre premier client.'}</Text>
          {!search && (
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(app)/(tabs)/customers/add' as any)}>
              <Text style={s.emptyBtnTxt}>+ Ajouter un client</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CustomerCard customer={item} onPress={() => router.push(`/(app)/(tabs)/customers/${item.id}` as any)} />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        />
      )}
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
  heroAmount: { fontSize: 44, fontWeight: '900', color: Colors.primary, letterSpacing: -2, lineHeight: 48 },
  heroRight: { alignItems: 'flex-end', backgroundColor: `${Colors.warning}12`, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: `${Colors.warning}25` },
  heroRightNum: { fontSize: 20, fontWeight: '900', color: Colors.warning },
  heroRightLbl: { fontSize: 9, color: Colors.warning, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  heroStats: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatSep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  heroStatLbl: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },

  /* Recherche */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, paddingVertical: 12 },
  clearBtn: { padding: 4 },

  /* Filtres */
  filtersRow: { paddingHorizontal: Spacing.lg, gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipTxt: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 8 },

  /* Card */
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  cardBar: { width: 4, alignSelf: 'stretch' },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, flexShrink: 0,
  },
  avatarTxt: { fontWeight: '900', fontSize: 14 },
  info: { flex: 1, gap: 3, paddingVertical: Spacing.md },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  contact: { fontSize: 12, color: Colors.textSecondary },
  right: { alignItems: 'flex-end', gap: 4, paddingRight: Spacing.md },
  segBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1,
  },
  segDot: { width: 5, height: 5, borderRadius: 3 },
  segTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  pts: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },

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
