import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSuppliers, type Supplier } from '@/hooks/useSuppliers';
import { Colors, Spacing, Radius } from '@/constants/colors';

// Palette de couleurs pour les avatars fournisseurs
const AVATAR_COLORS = [
  Colors.primary, Colors.info, Colors.success, '#A78BFA', Colors.warning,
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function SupplierCard({ supplier, onPress }: { supplier: Supplier; onPress: () => void }) {
  const color = avatarColor(supplier.name);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      {/* Barre couleur */}
      <View style={[s.cardBar, { backgroundColor: color }]} />

      <View style={[s.avatar, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
        <Text style={[s.avatarTxt, { color }]}>{initials(supplier.name)}</Text>
      </View>

      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{supplier.name}</Text>
        {supplier.contact_name && (
          <Text style={s.contact} numberOfLines={1}>{supplier.contact_name}</Text>
        )}
        <View style={s.chips}>
          {supplier.phone && (
            <View style={s.chip}>
              <Ionicons name="call-outline" size={10} color={Colors.textMuted} />
              <Text style={s.chipTxt}>{supplier.phone}</Text>
            </View>
          )}
          {supplier.email && (
            <View style={s.chip}>
              <Ionicons name="mail-outline" size={10} color={Colors.textMuted} />
              <Text style={s.chipTxt} numberOfLines={1}>{supplier.email}</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginRight: 4 }} />
    </TouchableOpacity>
  );
}

export default function SuppliersScreen() {
  const { data: suppliers = [], isLoading, refetch, isRefetching } = useSuppliers();
  const [search, setSearch] = useState('');

  const filtered = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact_name ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q)
    );
  });

  const withPhone = suppliers.filter((s) => !!s.phone).length;
  const withEmail = suppliers.filter((s) => !!s.email).length;

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Fournisseurs</Text>
          <Text style={s.subtitle}>{suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(app)/(tabs)/suppliers/add' as any)}>
          <Text style={s.addBtnTxt}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Hero card */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroLabel}>FOURNISSEURS</Text>
            <Text style={s.heroAmount}>{suppliers.length}</Text>
          </View>
          <View style={s.heroRight}>
            <Ionicons name="business-outline" size={28} color={Colors.primary} style={{ opacity: 0.5 }} />
          </View>
        </View>
        <View style={s.heroDivider} />
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.success }]}>{withPhone}</Text>
            <Text style={s.heroStatLbl}>Avec tél.</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatVal, { color: Colors.info }]}>{withEmail}</Text>
            <Text style={s.heroStatLbl}>Avec email</Text>
          </View>
          <View style={s.heroStatSep} />
          <View style={s.heroStat}>
            <Text style={s.heroStatVal}>{suppliers.length - withPhone - withEmail < 0 ? 0 : suppliers.filter((s) => !s.phone && !s.email).length}</Text>
            <Text style={s.heroStatLbl}>Sans contact</Text>
          </View>
        </View>
      </View>

      {/* Recherche */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={17} color={Colors.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Nom, contact, email…"
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

      {/* Liste */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="business-outline" size={32} color={Colors.textMuted} />
          </View>
          <Text style={s.emptyTitle}>{search ? 'Aucun résultat' : 'Aucun fournisseur'}</Text>
          <Text style={s.emptySub}>{search ? `Aucun résultat pour "${search}"` : 'Ajoutez votre premier fournisseur.'}</Text>
          {!search && (
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(app)/(tabs)/suppliers/add' as any)}>
              <Text style={s.emptyBtnTxt}>+ Ajouter un fournisseur</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SupplierCard
              supplier={item}
              onPress={() => router.push(`/(app)/(tabs)/suppliers/${item.id}` as any)}
            />
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
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, paddingBottom: 10 },
  heroLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },
  heroAmount: { fontSize: 44, fontWeight: '900', color: Colors.primary, letterSpacing: -2, lineHeight: 48 },
  heroRight: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: `${Colors.primary}10`, borderWidth: 1, borderColor: `${Colors.primary}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  heroDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  heroStats: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatSep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  heroStatLbl: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },

  /* Recherche */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, paddingVertical: 12 },
  clearBtn: { padding: 4 },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 8 },

  /* Card */
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  cardBar: { width: 4, alignSelf: 'stretch' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, flexShrink: 0,
  },
  avatarTxt: { fontSize: 15, fontWeight: '900' },
  info: { flex: 1, gap: 3, paddingVertical: Spacing.md },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  contact: { fontSize: 12, color: Colors.textSecondary },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  chipTxt: { fontSize: 10, color: Colors.textMuted, fontWeight: '500', maxWidth: 130 },

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
