import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Image,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Radius } from '@/constants/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email invalide';
    if (!password) e.password = 'Mot de passe requis';
    else if (password.length < 6) e.password = 'Minimum 6 caractères';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setGlobalError('');
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setGlobalError(error.message);
    else router.replace('/(app)/(tabs)/dashboard' as any);
    setIsLoading(false);
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />

      {/* Glows décoratifs (style carte Prelvio) */}
      <View style={s.glowTopRight} pointerEvents="none" />
      <View style={s.glowBottomLeft} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Branding ── */}
        <View style={s.brand}>
          <Image
            source={require('@/assets/logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
        </View>

        {/* ── Formulaire ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Connexion</Text>
            <Text style={s.cardSub}>Bon retour sur votre espace</Text>
          </View>

          {globalError ? (
            <View style={s.errorBox}>
              <Text style={s.errorTxt}>⚠️ {globalError}</Text>
            </View>
          ) : null}

          <View style={s.fields}>
            <Input
              label="Adresse email"
              placeholder="vous@exemple.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />
            <Input
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              isPassword
              error={errors.password}
            />
          </View>

          <TouchableOpacity style={s.forgotWrap} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={s.forgotTxt}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <Button
            label="Se connecter"
            onPress={handleLogin}
            isLoading={isLoading}
            fullWidth
            size="lg"
          />

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>ou</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.registerRow}>
            <Text style={s.registerTxt}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={s.registerLink}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={s.footer}>Prelvio · Solutions SaaS & Mobile</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const GLOW = '#4ECDC4';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.xl },

  // Glows
  glowTopRight: {
    position: 'absolute', top: -120, right: -120,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: GLOW, opacity: 0.12,
  },
  glowBottomLeft: {
    position: 'absolute', bottom: -80, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: GLOW, opacity: 0.09,
  },

  // Branding
  brand: { alignItems: 'center' },
  logo: { width: 260, height: 160 },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { gap: 4 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  cardSub: { fontSize: 13, color: Colors.textSecondary },
  fields: { gap: Spacing.md },

  errorBox: {
    backgroundColor: '#2A1010', borderRadius: Radius.sm, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.danger,
  },
  errorTxt: { color: '#FCA5A5', fontSize: 13 },

  forgotWrap: { alignSelf: 'flex-end', marginTop: -6 },
  forgotTxt: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerTxt: { color: Colors.textMuted, fontSize: 12 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerTxt: { color: Colors.textSecondary, fontSize: 14 },
  registerLink: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

  footer: {
    textAlign: 'center', fontSize: 11,
    color: Colors.textMuted, letterSpacing: 0.5,
  },
});
