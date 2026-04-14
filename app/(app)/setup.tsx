import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Radius } from '@/constants/colors';

export default function SetupScreen() {
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const qc = useQueryClient();

  async function handleCreate() {
    const name = storeName.trim();
    if (!name) {
      setError('Le nom de la boutique est requis.');
      return;
    }
    setError('');
    setIsLoading(true);

    const { error: rpcError } = await (supabase as any).rpc('create_store_for_user', {
      p_store_name: name,
    });

    if (rpcError) {
      setError('Impossible de créer la boutique. Réessayez.');
      setIsLoading(false);
      return;
    }

    // Invalide le cache pour que useStore recharge le nouveau storeId
    await qc.invalidateQueries({ queryKey: ['store-id'] });
    await qc.invalidateQueries({ queryKey: ['user-stores'] });

    router.replace('/(app)/(tabs)/dashboard' as any);
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>📦</Text>
          </View>
          <Text style={s.appName}>Prelvio Gestion</Text>
        </View>

        {/* Carte */}
        <View style={s.card}>
          <View style={s.stepBadge}>
            <Text style={s.stepTxt}>CONFIGURATION INITIALE</Text>
          </View>

          <Text style={s.title}>Créez votre boutique</Text>
          <Text style={s.subtitle}>
            Donnez un nom à votre boutique. Vous pourrez le modifier plus tard dans les paramètres.
          </Text>

          <Input
            label="Nom de la boutique"
            placeholder="Ex : Ma Librairie, Boutique Zen…"
            value={storeName}
            onChangeText={(v) => { setStoreName(v); setError(''); }}
            autoCapitalize="words"
            autoFocus
            error={error || undefined}
          />

          <Button
            label="Créer ma boutique →"
            onPress={handleCreate}
            isLoading={isLoading}
            fullWidth
            size="lg"
          />
        </View>

        {/* Légende features */}
        <View style={s.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={s.featRow}>
              <Text style={s.featEmoji}>{f.emoji}</Text>
              <Text style={s.featTxt}>{f.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const FEATURES = [
  { emoji: '📦', label: 'Gestion du stock en temps réel' },
  { emoji: '🧾', label: 'Facturation et caisse intégrées' },
  { emoji: '👥', label: 'CRM clients & fidélité' },
  { emoji: '📊', label: 'Tableau de bord & analytiques' },
];

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1, justifyContent: 'center',
    padding: Spacing.lg, paddingVertical: Spacing.xl, gap: Spacing.lg,
  },

  logoWrap: { alignItems: 'center', gap: Spacing.xs },
  logoBox: {
    width: 60, height: 60, borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  logoEmoji: { fontSize: 30 },
  appName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.primary}15`,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  stepTxt: {
    fontSize: 9, fontWeight: '800', color: Colors.primary,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginTop: -8 },

  features: { gap: Spacing.sm },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  featTxt: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
});
