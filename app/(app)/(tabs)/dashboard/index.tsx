import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import {
  useProducts, useRecentMovements,
  calcMargin,
  type MovementWithProduct,
} from '@/hooks/useProducts';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useProfileModal } from '@/app/(app)/(tabs)/_layout';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const MOVEMENT_COLORS = {
  in:         Colors.success,
  out:        Colors.danger,
  adjustment: Colors.warning,
};

const MOVEMENT_EMOJI = {
  in:         '📥',
  out:        '📤',
  adjustment: '🔧',
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toFixed(0);
}

// ── Graphique activité 7 jours ─────────────────────────────
function ActivityChart({ movements }: { movements: MovementWithProduct[] }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0); return d;
  }), []);

  const data = useMemo(() => days.map((day) => {
    const dayStr = day.toISOString().split('T')[0];
    const dayMvt = movements.filter((m) => m.created_at.startsWith(dayStr));
    const total = dayMvt.length;
    return { day, total };
  }), [movements, days]);

  const maxVal = Math.max(...data.map((d) => d.total), 1);

  return (
    <View style={chart.wrap}>
      <Text style={chart.label}>ACTIVITÉ 7J</Text>
      <View style={chart.bars}>
        {data.map(({ day, total }, i) => {
          const pct = total / maxVal;
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <View key={i} style={chart.col}>
              <View style={chart.track}>
                <View style={[
                  chart.bar,
                  { height: `${Math.max(4, pct * 100)}%` as any },
                  isToday && chart.barToday,
                  total === 0 && chart.barEmpty,
                ]} />
              </View>
              <Text style={[chart.lbl, isToday && chart.lblToday]}>
                {DAY_LABELS[day.getDay()]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chart = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 48, gap: 4 },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 },
  track: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 3 },
  barToday: { backgroundColor: '#FFFFFF' },
  barEmpty: { backgroundColor: 'rgba(255,255,255,0.15)' },
  lbl: { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  lblToday: { color: '#FFFFFF', fontWeight: '800' },
});

// ── Écran principal ────────────────────────────────────────
export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { setProfileOpen } = useProfileModal();
  const { data: products = [], isLoading: loadingP } = useProducts();
  const { data: movements = [], isLoading: loadingM } = useRecentMovements(50);
  const isLoading = loadingP || loadingM;

  const stats = useMemo(() => {
    const outOfStock  = products.filter((p) => p.stock_quantity === 0);
    const lowStock    = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_alert);
    const costValue   = products.reduce((s, p) => s + p.cost_price * p.stock_quantity, 0);
    const sellValue   = products.reduce((s, p) => s + p.selling_price * p.stock_quantity, 0);
    const potMargin   = sellValue - costValue;
    const avgMarginPct = products.length
      ? Math.round(products.reduce((s, p) => s + calcMargin(p.cost_price, p.selling_price).pct, 0) / products.length)
      : 0;

    const topByValue = [...products]
      .sort((a, b) => (b.cost_price * b.stock_quantity) - (a.cost_price * a.stock_quantity))
      .slice(0, 5);

    return { outOfStock, lowStock, costValue, sellValue, potMargin, avgMarginPct, topByValue };
  }, [products]);

  const now = new Date();
  const dateLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '';

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ gap: 1 }}>
            <Text style={s.dateLabel}>{dateLabel}</Text>
            <Text style={s.greeting}>📊 Tableau de bord</Text>
          </View>
          <TouchableOpacity style={s.avatar} onPress={() => setProfileOpen(true)} activeOpacity={0.8}>
            <Text style={s.avatarTxt}>{(userName[0] ?? 'U').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={s.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
        ) : (
          <>
            {/* ── Hero : Valeur du stock ── */}
            <View style={s.hero}>
              <View style={s.heroTop}>
                <View style={{ gap: 4 }}>
                  <Text style={s.heroLabel}>VALEUR DU STOCK (COÛT)</Text>
                  <Text style={s.heroValue}>{stats.costValue.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</Text>
                  <Text style={s.heroSub}>
                    Vente : {fmt(stats.sellValue)} € · Marge : {fmt(stats.potMargin)} €
                  </Text>
                </View>
                <View style={s.marginBadge}>
                  <Text style={s.marginVal}>
                    {stats.avgMarginPct >= 0 ? '+' : ''}{stats.avgMarginPct}%
                  </Text>
                  <Text style={s.marginLbl}>marge moy.</Text>
                </View>
              </View>

              <View style={s.heroDivider} />

              {/* Stats bar */}
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statVal}>{products.length}</Text>
                  <Text style={s.statLbl}>📦 Produits</Text>
                </View>
                <View style={s.statSep} />
                <View style={s.statItem}>
                  <Text style={[s.statVal, stats.outOfStock.length > 0 && s.statDanger]}>
                    {stats.outOfStock.length}
                  </Text>
                  <Text style={s.statLbl}>🔴 Ruptures</Text>
                </View>
                <View style={s.statSep} />
                <View style={s.statItem}>
                  <Text style={[s.statVal, stats.lowStock.length > 0 && s.statWarning]}>
                    {stats.lowStock.length}
                  </Text>
                  <Text style={s.statLbl}>🟡 Stock bas</Text>
                </View>
                <View style={s.statSep} />
                <ActivityChart movements={movements} />
              </View>
            </View>

            {/* ── Alertes ── */}
            {(stats.outOfStock.length > 0 || stats.lowStock.length > 0) && (
              <>
                <View style={s.sectionRow}>
                  <Text style={s.sectionTitle}>⚠️ ALERTES</Text>
                  <View style={s.badge}>
                    <Text style={s.badgeTxt}>{stats.outOfStock.length + stats.lowStock.length}</Text>
                  </View>
                </View>
                <View style={s.alertBox}>
                  {[
                    ...stats.outOfStock.map((p) => ({ ...p, alertType: 'out' as const })),
                    ...stats.lowStock.map((p) => ({ ...p, alertType: 'low' as const })),
                  ].slice(0, 6).map((p) => {
                    const color = p.alertType === 'out' ? Colors.danger : Colors.warning;
                    const emoji = p.alertType === 'out' ? '🔴' : '🟡';
                    const label = p.alertType === 'out' ? 'Rupture' : `${p.stock_quantity} restants`;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={s.alertRow}
                        onPress={() => router.push(`/(app)/(tabs)/stock/${p.id}` as any)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.alertEmoji}>{emoji}</Text>
                        <Text style={s.alertName} numberOfLines={1}>{p.name}</Text>
                        <Text style={[s.alertLabel, { color }]}>{label}</Text>
                        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Top produits par valeur ── */}
            {stats.topByValue.length > 0 && (
              <>
                <Text style={s.sectionTitle}>🏆 TOP PRODUITS PAR VALEUR</Text>
                <View style={s.listBox}>
                  {stats.topByValue.map((p, i) => {
                    const value = p.cost_price * p.stock_quantity;
                    const maxValue = stats.topByValue[0].cost_price * stats.topByValue[0].stock_quantity;
                    const fillPct = maxValue > 0 ? value / maxValue : 0;
                    const { pct: marginPct } = calcMargin(p.cost_price, p.selling_price);
                    const catColor = p.categories?.color ?? Colors.textMuted;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={s.topRow}
                        onPress={() => router.push(`/(app)/(tabs)/stock/${p.id}` as any)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.topRank}>{i + 1}</Text>
                        <Text style={[s.topCatDot, { color: catColor }]}>●</Text>
                        <View style={{ flex: 1, gap: 5 }}>
                          <View style={s.topNameRow}>
                            <Text style={s.topName} numberOfLines={1}>{p.name}</Text>
                            <Text style={s.topValue}>{value.toFixed(0)} €</Text>
                          </View>
                          <View style={s.barTrack}>
                            <View style={[s.barFill, { width: `${fillPct * 100}%` as any }]} />
                          </View>
                        </View>
                        <Text style={[s.topMargin, { color: marginPct >= 0 ? Colors.success : Colors.danger }]}>
                          {marginPct >= 0 ? '+' : ''}{marginPct}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Derniers mouvements ── */}
            {movements.length > 0 && (
              <>
                <Text style={s.sectionTitle}>🔄 MOUVEMENTS RÉCENTS</Text>
                <View style={s.listBox}>
                  {movements.slice(0, 8).map((m) => {
                    const color = MOVEMENT_COLORS[m.type];
                    const emoji = MOVEMENT_EMOJI[m.type];
                    const sign = m.type === 'adjustment' ? '=' : m.type === 'in' ? '+' : '−';
                    const date = new Date(m.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    });
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={s.mvtRow}
                        onPress={() => router.push(`/(app)/(tabs)/stock/${m.product_id}` as any)}
                        activeOpacity={0.7}
                      >
                        <View style={[s.mvtDot, { backgroundColor: `${color}15` }]}>
                          <Text style={s.mvtEmoji}>{emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.mvtProduct} numberOfLines={1}>{m.products?.name ?? '—'}</Text>
                          <Text style={s.mvtDate}>{date}{m.reason ? ` · ${m.reason}` : ''}</Text>
                        </View>
                        <Text style={[s.mvtQty, { color }]}>{sign}{m.quantity} {m.products?.unit ?? ''}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Actions rapides ── */}
            <Text style={s.sectionTitle}>⚡ ACTIONS RAPIDES</Text>
            <View style={s.actionsGrid}>
              <TouchableOpacity
                style={[s.actionCard, s.actionPrimary]}
                onPress={() => router.push('/(app)/(tabs)/stock/add' as any)}
                activeOpacity={0.8}
              >
                <Text style={s.actionEmoji}>➕</Text>
                <Text style={s.actionLabelPrimary}>Ajouter un produit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionCard, s.actionSecondary]}
                onPress={() => router.push('/(app)/(tabs)/stock/inventory' as any)}
                activeOpacity={0.8}
              >
                <Text style={s.actionEmoji}>📋</Text>
                <Text style={s.actionLabel}>Inventaire physique</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionCard, s.actionSecondary]}
                onPress={() => router.push('/(app)/(tabs)/export' as any)}
                activeOpacity={0.8}
              >
                <Text style={s.actionEmoji}>📥</Text>
                <Text style={s.actionLabel}>Exporter CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionCard, s.actionSecondary]}
                onPress={() => router.push('/(app)/(tabs)/stock' as any)}
                activeOpacity={0.8}
              >
                <Text style={s.actionEmoji}>📦</Text>
                <Text style={s.actionLabel}>Voir le stock</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 56, gap: 16 },
  loader: { height: 300, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.xs },
  dateLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500', textTransform: 'capitalize' },
  greeting: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.3 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  avatarTxt: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },

  // Hero — fond indigo
  hero: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: Spacing.md },
  heroLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, textTransform: 'uppercase' },
  heroValue: { fontSize: 38, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1.5, lineHeight: 42 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 2 },
  marginBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  marginVal: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  marginLbl: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(255,255,255,0.75)' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statItem: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statDanger: { color: '#FFB3B3' },
  statWarning: { color: '#FFE5A0' },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  statSep: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Sections
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.2 },
  badge: { backgroundColor: `${Colors.danger}20`, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: Colors.danger },

  // Alertes
  alertBox: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  alertEmoji: { fontSize: 18 },
  alertName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  alertLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  // Top produits
  listBox: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  topRank: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, width: 16, textAlign: 'center' },
  topCatDot: { fontSize: 12 },
  topNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  topValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  topMargin: { fontSize: 12, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  barTrack: { height: 3, backgroundColor: Colors.surfaceAlt, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2, opacity: 0.5 },

  // Mouvements
  mvtRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  mvtDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mvtEmoji: { fontSize: 18 },
  mvtProduct: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  mvtDate: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  mvtQty: { fontSize: 14, fontWeight: '800' },

  // Actions rapides
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { borderRadius: Radius.lg, padding: Spacing.md, gap: 8, minWidth: '47%', flex: 1 },
  actionPrimary: { backgroundColor: Colors.primary },
  actionSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  actionEmoji: { fontSize: 24 },
  actionLabelPrimary: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  actionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
});
