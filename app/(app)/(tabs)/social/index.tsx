import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';

const PLATFORMS = [
  { label: 'Instagram', icon: 'logo-instagram' as const, color: '#E1306C' },
  { label: 'Facebook',  icon: 'logo-facebook' as const,  color: '#1877F2' },
  { label: 'TikTok',    icon: 'logo-tiktok' as const,    color: '#010101' },
];

export default function SocialScreen() {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Social Media</Text>
          <Text style={s.sub}>Vue d'ensemble</Text>
        </View>
        <TouchableOpacity style={s.connectBtn}>
          <Ionicons name="link-outline" size={15} color={Colors.primary} />
          <Text style={s.connectBtnTxt}>Connecter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* État vide — connexion requise */}
        <View style={s.emptyCard}>
          <View style={[s.emptyBar, { backgroundColor: '#E1306C' }]} />
          <View style={s.emptyBody}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="stats-chart-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>Aucune donnée disponible</Text>
            <Text style={s.emptySub}>
              Connectez votre compte Metricool pour synchroniser vos statistiques Instagram, Facebook et TikTok.
            </Text>
            <TouchableOpacity style={s.connectBig}>
              <Ionicons name="logo-buffer" size={16} color="#0B0D11" />
              <Text style={s.connectBigTxt}>Connecter Metricool</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comptes à connecter */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Plateformes</Text>
          {PLATFORMS.map((p) => (
            <View key={p.label} style={s.platformRow}>
              <View style={[s.platformIcon, { backgroundColor: `${p.color}18` }]}>
                <Ionicons name={p.icon} size={20} color={p.color} />
              </View>
              <Text style={s.platformLabel}>{p.label}</Text>
              <View style={s.disconnectedBadge}>
                <Text style={s.disconnectedTxt}>Non connecté</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
          <Text style={s.infoTxt}>
            La synchronisation des statistiques nécessite un compte Metricool actif. Les données se mettront à jour automatiquement toutes les 24h.
          </Text>
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
  connectBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: `${Colors.primary}40`, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7 },
  connectBtnTxt: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 48 },

  emptyCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  emptyBar: { height: 4 },
  emptyBody: { padding: Spacing.lg, alignItems: 'center', gap: 12 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  connectBig: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  connectBigTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 14 },

  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 4, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 },

  platformRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  platformIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  platformLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  disconnectedBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  disconnectedTxt: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: `${Colors.info}10`, borderRadius: Radius.md, borderWidth: 1, borderColor: `${Colors.info}25`, padding: Spacing.md },
  infoTxt: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
});
