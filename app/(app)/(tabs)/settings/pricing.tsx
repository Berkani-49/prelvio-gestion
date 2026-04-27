import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/colors';

const FEATURES = [
  'Produits & stock illimités',
  'Utilisateurs illimités',
  'Caisse (POS) avec scanner code-barres',
  'Factures & devis',
  'Gestion des clients & fidélité',
  'Gestion des fournisseurs',
  'Tableau de bord & analytics',
  'Export CSV comptable',
  'SMS clients (Twilio)',
  'Email comptable (Resend)',
  'Gestion des dépenses',
  'Transactions & historique',
  'Équipe multi-utilisateurs & rôles',
  'Support prioritaire',
];

export default function PricingScreen() {
  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tarifs</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroPill}>
            <Ionicons name="flash" size={12} color={Colors.primary} />
            <Text style={s.heroPillTxt}>Sans engagement · Résiliable à tout moment</Text>
          </View>
          <Text style={s.heroTitle}>Un seul plan.{'\n'}Tout inclus.</Text>
          <Text style={s.heroSub}>
            Accédez à toutes les fonctionnalités sans restriction, dès le premier jour.
          </Text>
        </View>

        {/* Carte unique */}
        <View style={s.card}>
          {/* Prix */}
          <View style={s.priceBlock}>
            <View style={s.priceRow}>
              <Text style={s.price}>45 €</Text>
              <Text style={s.period}>/ mois</Text>
            </View>
            <Text style={s.priceHT}>HT · Facturation mensuelle</Text>
          </View>

          {/* Séparateur */}
          <View style={s.divider} />

          {/* Features */}
          <View style={s.featureList}>
            {FEATURES.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <View style={s.checkWrap}>
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </View>
                <Text style={s.featureTxt}>{f}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={s.ctaBtn}
            activeOpacity={0.85}
            onPress={() => {
              // TODO: connecter à Stripe
              if (Platform.OS === 'web') {
                window.alert('Intégration Stripe à venir !');
              }
            }}
          >
            <Ionicons name="flash" size={18} color="#0B0D11" />
            <Text style={s.ctaTxt}>S'abonner · 45 € / mois</Text>
          </TouchableOpacity>
        </View>

        {/* Note bas de page */}
        <View style={s.footerNote}>
          <Ionicons name="lock-closed-outline" size={13} color={Colors.textMuted} />
          <Text style={s.footerNoteTxt}>
            Paiements sécurisés via Stripe. Prix HT. Résiliable à tout moment depuis votre espace.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },

  hero: {
    alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl, paddingBottom: Spacing.lg, gap: 12,
  },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${Colors.primary}12`, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: `${Colors.primary}25`,
  },
  heroPillTxt: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  heroTitle: {
    fontSize: 30, fontWeight: '900', color: Colors.textPrimary,
    textAlign: 'center', lineHeight: 38, letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 21, maxWidth: 280,
  },

  card: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 2, borderColor: Colors.primary,
    padding: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },

  priceBlock: { alignItems: 'center', paddingVertical: Spacing.md, gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 52, fontWeight: '900', color: Colors.primary, letterSpacing: -2 },
  period: { fontSize: 18, color: Colors.textSecondary, fontWeight: '600' },
  priceHT: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },

  featureList: { gap: 12, marginBottom: Spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkWrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  featureTxt: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', flex: 1 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 17,
  },
  ctaTxt: { fontSize: 16, fontWeight: '900', color: '#0B0D11' },

  footerNote: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  footerNoteTxt: { fontSize: 11, color: Colors.textMuted, flex: 1, lineHeight: 17 },
});
