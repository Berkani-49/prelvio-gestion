import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/colors';

// Plan courant simulé — à remplacer par la donnée Stripe
const CURRENT_PLAN = 'free';

type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  color: string;
  badge?: string;
  features: { label: string; included: boolean }[];
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    price: '0 €',
    period: 'pour toujours',
    tagline: 'Pour démarrer sereinement',
    color: Colors.textSecondary,
    features: [
      { label: 'Jusqu\'à 100 produits', included: true },
      { label: '1 utilisateur', included: true },
      { label: 'Gestion du stock', included: true },
      { label: 'Dashboard basique', included: true },
      { label: 'Factures & devis', included: false },
      { label: 'Export CSV', included: false },
      { label: 'SMS clients (Twilio)', included: false },
      { label: 'Email comptable', included: false },
      { label: 'Équipe multi-utilisateurs', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '29 €',
    period: '/ mois',
    tagline: 'Pour les boutiques en croissance',
    color: Colors.primary,
    badge: 'Populaire',
    features: [
      { label: 'Produits illimités', included: true },
      { label: 'Jusqu\'à 5 utilisateurs', included: true },
      { label: 'Gestion du stock avancée', included: true },
      { label: 'Dashboard complet', included: true },
      { label: 'Factures & devis', included: true },
      { label: 'Export CSV', included: true },
      { label: 'SMS clients (Twilio)', included: true },
      { label: 'Email comptable', included: true },
      { label: 'Équipe multi-utilisateurs', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '79 €',
    period: '/ mois',
    tagline: 'Pour les équipes ambitieuses',
    color: Colors.warning,
    features: [
      { label: 'Produits illimités', included: true },
      { label: 'Utilisateurs illimités', included: true },
      { label: 'Toutes les fonctionnalités Pro', included: true },
      { label: 'Dashboard avancé & analytics', included: true },
      { label: 'Factures & devis', included: true },
      { label: 'Export CSV', included: true },
      { label: 'SMS clients (Twilio)', included: true },
      { label: 'Email comptable', included: true },
      { label: 'Support prioritaire', included: true },
    ],
  },
];

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const isPro = plan.id === 'pro';

  return (
    <View style={[s.card, isCurrent && s.cardCurrent, isPro && s.cardPro]}>
      {/* Badge Populaire */}
      {plan.badge && (
        <View style={[s.badge, { backgroundColor: plan.color }]}>
          <Text style={s.badgeTxt}>{plan.badge}</Text>
        </View>
      )}

      {/* En-tête */}
      <View style={s.cardHeader}>
        <View style={[s.planDot, { backgroundColor: `${plan.color}20` }]}>
          <View style={[s.planDotInner, { backgroundColor: plan.color }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.planName, { color: plan.color }]}>{plan.name}</Text>
          <Text style={s.planTagline}>{plan.tagline}</Text>
        </View>
        {isCurrent && (
          <View style={s.currentBadge}>
            <Text style={s.currentBadgeTxt}>Actuel</Text>
          </View>
        )}
      </View>

      {/* Prix */}
      <View style={s.priceRow}>
        <Text style={[s.price, { color: plan.color }]}>{plan.price}</Text>
        <Text style={s.period}>{plan.period}</Text>
      </View>

      {/* Séparateur */}
      <View style={s.divider} />

      {/* Fonctionnalités */}
      <View style={s.featureList}>
        {plan.features.map((f, i) => (
          <View key={i} style={s.featureRow}>
            <Ionicons
              name={f.included ? 'checkmark-circle' : 'close-circle-outline'}
              size={16}
              color={f.included ? Colors.success : Colors.textMuted}
            />
            <Text style={[s.featureTxt, !f.included && s.featureTxtOff]}>
              {f.label}
            </Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      {!isCurrent && (
        <TouchableOpacity
          style={[s.ctaBtn, { borderColor: plan.color, backgroundColor: isPro ? plan.color : 'transparent' }]}
          activeOpacity={0.75}
          onPress={() => {
            // TODO: connecter à Stripe
            if (Platform.OS === 'web') {
              window.alert('Intégration Stripe à venir !');
            }
          }}
        >
          <Text style={[s.ctaTxt, { color: isPro ? '#fff' : plan.color }]}>
            {plan.id === 'free' ? 'Rétrograder' : 'Choisir ce plan'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={isPro ? '#fff' : plan.color}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

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
          <Text style={s.heroTitle}>Choisissez votre plan</Text>
          <Text style={s.heroSub}>
            Passez à l'offre qui correspond à votre activité. Changez de plan quand vous voulez.
          </Text>
        </View>

        {/* Plans */}
        <View style={s.plansList}>
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === CURRENT_PLAN}
            />
          ))}
        </View>

        {/* Note bas de page */}
        <View style={s.footerNote}>
          <Ionicons name="lock-closed-outline" size={13} color={Colors.textMuted} />
          <Text style={s.footerNoteTxt}>
            Paiements sécurisés via Stripe. Les prix sont HT. Facturation mensuelle.
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

  hero: { alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md, gap: 10 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${Colors.primary}12`, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: `${Colors.primary}25`,
  },
  heroPillTxt: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  heroTitle: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center' },
  heroSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 300 },

  plansList: { paddingHorizontal: Spacing.md, gap: 16, paddingTop: Spacing.md },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md, gap: 0, overflow: 'hidden',
  },
  cardCurrent: { borderColor: Colors.primary, borderWidth: 2 },
  cardPro: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },

  badge: {
    position: 'absolute', top: 14, right: 14,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  planDot: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  planDotInner: { width: 12, height: 12, borderRadius: 6 },
  planName: { fontSize: 17, fontWeight: '800' },
  planTagline: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  currentBadge: {
    backgroundColor: `${Colors.primary}15`, borderRadius: Radius.full,
    paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: `${Colors.primary}30`,
  },
  currentBadgeTxt: { fontSize: 10, fontWeight: '700', color: Colors.primary },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 14 },
  price: { fontSize: 32, fontWeight: '900' },
  period: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 14 },

  featureList: { gap: 10, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  featureTxt: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  featureTxtOff: { color: Colors.textMuted },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingVertical: 13, marginTop: 4,
  },
  ctaTxt: { fontSize: 14, fontWeight: '800' },

  footerNote: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  footerNoteTxt: { fontSize: 11, color: Colors.textMuted, flex: 1, lineHeight: 17 },
});
