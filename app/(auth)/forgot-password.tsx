import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Radius } from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!email.trim()) {
      setError('Veuillez saisir votre email');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email invalide');
      return;
    }

    setIsLoading(true);
    const { error: supaError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'prelvio-gestion://reset-password',
    });

    if (supaError) {
      Alert.alert('Erreur', supaError.message);
    } else {
      setIsSent(true);
    }
    setIsLoading(false);
  }

  if (isSent) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>📧</Text>
          <Text style={styles.successTitle}>Email envoyé !</Text>
          <Text style={styles.successText}>
            Vérifiez votre boîte mail. Un lien de réinitialisation a été envoyé à{' '}
            <Text style={styles.emailHighlight}>{email}</Text>.
          </Text>
          <Button
            label="Retour à la connexion"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
            size="lg"
            style={styles.backBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔑</Text>
        </View>

        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </Text>

        <Input
          label="Adresse email"
          placeholder="vous@exemple.com"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={error}
          containerStyle={styles.input}
        />

        <Button
          label="Envoyer le lien"
          onPress={handleReset}
          isLoading={isLoading}
          fullWidth
          size="lg"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  backLink: { position: 'absolute', top: Spacing.xl, left: Spacing.lg },
  backLinkText: { color: Colors.primary, fontSize: 15, fontWeight: '500' },

  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  icon: { fontSize: 36 },

  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  input: { marginTop: Spacing.sm },

  successContainer: { flex: 1, padding: Spacing.lg, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  successIcon: { fontSize: 64, marginBottom: Spacing.sm },
  successTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  successText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  emailHighlight: { color: Colors.primary, fontWeight: '600' },
  backBtn: { marginTop: Spacing.lg },
});
