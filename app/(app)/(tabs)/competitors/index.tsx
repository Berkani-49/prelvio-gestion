import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';

const COMPETITORS = [
  { name: 'BoutiqueAlpha',  followers: '12.4K', engagement: '5.2%', growth: '+3.1%',  posts: 48, up: true,  color: '#6366F1' },
  { name: 'ShopBeta',       followers: '8.7K',  engagement: '3.8%', growth: '+1.4%',  posts: 32, up: true,  color: '#10B981' },
  { name: 'ModeGamma',      followers: '21.2K', engagement: '2.9%', growth: '-0.7%',  posts: 67, up: false, color: '#F59E0B' },
  { name: 'TrendDelta',     followers: '5.1K',  engagement: '6.7%', growth: '+8.2%',  posts: 21, up: true,  color: '#EC4899' },
  { name: 'StyleEpsilon',   followers: '15.8K', engagement: '4.1%', growth: '+2.3%',  posts: 55, up: true,  color: '#3B82F6' },
];

export default function CompetitorsScreen() {
  const avgEngagement = (COMPETITORS.reduce((s, c) => s + parseFloat(c.engagement), 0) / COMPETITORS.length).toFixed(1);
  const topComp = COMPETITORS.reduce((a, b) => parseFloat(a.engagement) > parseFloat(b.engagement) ? a : b);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Concurrents</Text>
          <Text style={s.sub}>{COMPETITORS.length} concurrents suivis</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={16} color="#0B0D11" />
          <Text style={s.addBtnTxt}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Résumé */}
        <View style={s.hero}>
          <View style={[s.heroBar, { backgroundColor: Colors.info }]} />
          <View style={s.heroBody}>
            <View style={s.heroRow}>
              <View style={s.heroStat}>
                <Text style={s.heroStatLbl}>MOY. ENGAGEMENT</Text>
                <Text style={[s.heroStatVal, { color: Colors.primary }]}>{avgEngagement}%</Text>
              </View>
              <View style={s.heroSep} />
              <View style={s.heroStat}>
                <Text style={s.heroStatLbl}>MEILLEUR</Text>
                <Text style={[s.heroStatVal, { color: Colors.warning }]}>{topComp.name}</Text>
              </View>
              <View style={s.heroSep} />
              <View style={s.heroStat}>
                <Text style={s.heroStatLbl}>EN HAUSSE</Text>
                <Text style={[s.heroStatVal, { color: Colors.success }]}>{COMPETITORS.filter(c => c.up).length}/{COMPETITORS.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Liste concurrents */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tableau de bord</Text>
          {COMPETITORS.map((comp) => (
            <TouchableOpacity key={comp.name} style={s.compCard} activeOpacity={0.75}>
              <View style={[s.compAvatar, { backgroundColor: `${comp.color}20` }]}>
                <Text style={[s.compInitial, { color: comp.color }]}>{comp.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.compNameRow}>
                  <Text style={s.compName}>{comp.name}</Text>
                  <View style={[s.growthBadge, { backgroundColor: comp.up ? `${Colors.success}15` : `${Colors.danger}15`, borderColor: comp.up ? `${Colors.success}30` : `${Colors.danger}30` }]}>
                    <Ionicons name={comp.up ? 'trending-up' : 'trending-down'} size={11} color={comp.up ? Colors.success : Colors.danger} />
                    <Text style={[s.growthTxt, { color: comp.up ? Colors.success : Colors.danger }]}>{comp.growth}</Text>
                  </View>
                </View>
                <View style={s.compStats}>
                  <Text style={s.compStat}><Text style={s.compStatVal}>{comp.followers}</Text> abonnés</Text>
                  <Text style={s.compDot}>·</Text>
                  <Text style={s.compStat}><Text style={[s.compStatVal, { color: Colors.primary }]}>{comp.engagement}</Text> eng.</Text>
                  <Text style={s.compDot}>·</Text>
                  <Text style={s.compStat}><Text style={s.compStatVal}>{comp.posts}</Text> posts/mois</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 13 },

  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 48 },

  hero: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  heroBar: { height: 4 },
  heroBody: { padding: Spacing.md },
  heroRow: { flexDirection: 'row' },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroSep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  heroStatLbl: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4 },
  heroStatVal: { fontSize: 16, fontWeight: '900', color: Colors.textPrimary },

  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 4, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 },

  compCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  compAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  compInitial: { fontSize: 18, fontWeight: '900' },
  compNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  compName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  growthBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  growthTxt: { fontSize: 10, fontWeight: '700' },
  compStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compStat: { fontSize: 11, color: Colors.textMuted },
  compStatVal: { fontWeight: '700', color: Colors.textSecondary },
  compDot: { color: Colors.textMuted, fontSize: 11 },
});
