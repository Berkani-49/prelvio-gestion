import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Radius } from '@/constants/colors';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    storeName: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const newErrors: Partial<typeof form> = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Nom requis';
    if (!form.storeName.trim()) newErrors.storeName = 'Nom de boutique requis';
    if (!form.email.trim()) newErrors.email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Email invalide';
    if (!form.password) newErrors.password = 'Mot de passe requis';
    else if (form.password.length < 8) newErrors.password = 'Minimum 8 caractères';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setGlobalError('');
    setSuccessMsg('');
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, store_name: form.storeName },
      },
    });

    if (error) {
      setGlobalError(error.message);
    } else if (data.session) {
      // Connecté directement (email confirmation désactivé)
      router.replace('/(app)/(tabs)/dashboard' as any);
    } else {
      // Email de confirmation envoyé
      setSuccessMsg(`Un lien de confirmation a été envoyé à ${form.email}. Vérifiez votre boîte mail.`);
    }

    setIsLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>📦</Text>
          </View>
          <Text style={styles.appName}>Prelvio Gestion</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Commencez gratuitement. Aucune carte requise.</Text>

          {globalError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>⚠️ {globalError}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successBoxText}>✅ {successMsg}</Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.successBtn}>
                <Text style={styles.successBtnText}>Aller à la connexion →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.fields}>
                <Input
                  label="Votre nom complet"
                  placeholder="Jean Dupont"
                  value={form.fullName}
                  onChangeText={(v) => update('fullName', v)}
                  autoCapitalize="words"
                  error={errors.fullName}
                />
                <Input
                  label="Nom de votre boutique"
                  placeholder="Ma Super Boutique"
                  value={form.storeName}
                  onChangeText={(v) => update('storeName', v)}
                  autoCapitalize="words"
                  error={errors.storeName}
                />
                <Input
                  label="Adresse email"
                  placeholder="vous@exemple.com"
                  value={form.email}
                  onChangeText={(v) => update('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                />
                <Input
                  label="Mot de passe"
                  placeholder="Minimum 8 caractères"
                  value={form.password}
                  onChangeText={(v) => update('password', v)}
                  isPassword
                  error={errors.password}
                />
                <Input
                  label="Confirmer le mot de passe"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChangeText={(v) => update('confirmPassword', v)}
                  isPassword
                  error={errors.confirmPassword}
                />
              </View>

              <Button
                label="Créer mon compte"
                onPress={handleRegister}
                isLoading={isLoading}
                fullWidth
                size="lg"
              />
            </>
          )}

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, paddingVertical: Spacing.xl },

  header: { alignItems: 'center', marginBottom: Spacing.lg },
  logoContainer: {
    width: 56, height: 56, borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  logoIcon: { fontSize: 28 },
  appName: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },

  form: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: -8 },
  fields: { gap: Spacing.md },

  errorBox: { backgroundColor: '#3B1212', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.danger },
  errorBoxText: { color: '#FCA5A5', fontSize: 13 },

  successBox: { backgroundColor: '#0F2E1A', borderRadius: Radius.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.success, gap: 8 },
  successBoxText: { color: '#6EE7B7', fontSize: 13, lineHeight: 20 },
  successBtn: { alignSelf: 'flex-start' },
  successBtnText: { color: Colors.success, fontWeight: '600', fontSize: 14 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: Colors.textSecondary, fontSize: 14 },
  loginLink: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
