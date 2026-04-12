import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';

export default function ContentScreen() {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Calendrier</Text>
          <Text style={s.sub}>Planification de contenu</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Ionicons name="add" size={16} color="#0B0D11" />
          <Text style={s.addBtnTxt}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <View style={s.emptyCard}>
          <View style={[s.emptyBar, { backgroundColor: '#A78BFA' }]} />
          <View style={s.emptyBody}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>Aucun post planifié</Text>
            <Text style={s.emptySub}>
              Connectez Metricool pour synchroniser votre calendrier éditorial et planifier vos publications.
            </Text>
            <TouchableOpacity style={s.connectBtn}>
              <Ionicons name="logo-buffer" size={16} color="#0B0D11" />
              <Text style={s.connectBtnTxt}>Connecter Metricool</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Fonctionnalités après connexion</Text>
          {[
            { icon: 'calendar-outline' as const,      label: 'Calendrier mensuel interactif',  color: '#A78BFA' },
            { icon: 'image-outline' as const,          label: 'Prévisualisation des posts',      color: '#E1306C' },
            { icon: 'notifications-outline' as const,  label: 'Rappels avant publication',       color: Colors.warning },
            { icon: 'repeat-outline' as const,         label: 'Posts récurrents automatiques',   color: Colors.success },
          ].map((f) => (
            <View key={f.label} style={s.featureRow}>
              <View style={[s.featureIcon, { backgroundColor: `${f.color}15` }]}>
                <Ionicons name={f.icon} size={17} color={f.color} />
              </View>
              <Text style={s.featureLabel}>{f.label}</Text>
              <Ionicons name="lock-closed-outline" size={14} color={Colors.textMuted} />
            </View>
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
  emptyCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  emptyBar: { height: 4 },
  emptyBody: { padding: Spacing.lg, alignItems: 'center', gap: 12 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  connectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  connectBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 14 },
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 4, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  featureIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
});
