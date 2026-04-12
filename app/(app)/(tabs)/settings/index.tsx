import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useStore } from '@/hooks/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/colors';

const db = supabase as any;

// ── Composants réutilisables ──────────────────────────────
function SectionTitle({ children }: { children: string }) {
  return <Text style={st.sectionTitle}>{children}</Text>;
}

function SettingRow({
  label, value, onPress, rightText, danger, icon,
}: {
  label: string; value?: string; onPress?: () => void;
  rightText?: string; danger?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <TouchableOpacity style={row.wrap} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      {icon && (
        <View style={[row.iconWrap, danger && { backgroundColor: `${Colors.danger}15` }]}>
          <Ionicons name={icon} size={16} color={danger ? Colors.danger : Colors.textSecondary} />
        </View>
      )}
      <Text style={[row.label, danger && { color: Colors.danger }]}>{label}</Text>
      {value && <Text style={row.value} numberOfLines={1}>{value}</Text>}
      {rightText && <Text style={[row.right, danger && { color: Colors.danger }]}>{rightText}</Text>}
      {onPress && !rightText && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
    </TouchableOpacity>
  );
}

function EditField({ label, value, onChange, keyboardType, placeholder, secure }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboardType?: any; placeholder?: string; secure?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={ef.label}>{label}</Text>
      <TextInput
        style={ef.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        secureTextEntry={secure}
      />
    </View>
  );
}

// ── Écran ─────────────────────────────────────────────────
export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const { storeId } = useStore();
  const qc = useQueryClient();

  const { data: store } = useQuery({
    queryKey: ['store-detail', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db.from('stores').select('*').eq('id', storeId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { mutateAsync: updateStore, isPending: saving } = useMutation({
    mutationFn: async (updates: Record<string, string | null>) => {
      const { error } = await db.from('stores').update(updates).eq('id', storeId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-detail'] }),
  });

  // ── Boutique ──────────────────────────────────────────
  const [editingStore, setEditingStore] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  function startEditStore() {
    setStoreName(store?.name ?? '');
    setStorePhone(store?.phone ?? '');
    setStoreEmail(store?.email ?? '');
    setStoreAddress(store?.address ?? '');
    setEditingStore(true);
  }
  async function saveStore() {
    await updateStore({ name: storeName, phone: storePhone, email: storeEmail, address: storeAddress });
    setEditingStore(false);
  }

  // ── Intégration Resend ────────────────────────────────
  const [editingResend, setEditingResend] = useState(false);
  const [resendApiKey, setResendApiKey] = useState('');
  const [accountantEmail, setAccountantEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  function startEditResend() {
    setResendApiKey(store?.resend_api_key ?? '');
    setAccountantEmail(store?.accountant_email ?? '');
    setEditingResend(true);
  }
  async function saveResend() {
    await updateStore({
      resend_api_key: resendApiKey.trim() || null,
      accountant_email: accountantEmail.trim() || null,
    });
    setEditingResend(false);
  }

  async function testEmail() {
    const apiKey  = store?.resend_api_key;
    const toEmail = store?.accountant_email;
    if (!apiKey)  { Alert.alert('Clé manquante', 'Configurez d\'abord votre clé API Resend.'); return; }
    if (!toEmail) { Alert.alert('Email manquant', 'Configurez l\'email du comptable.'); return; }

    setTestingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          apiKey,
          to: [toEmail],
          subject: 'Test de connexion Prelvio Gestion',
          text: `Bonjour,\n\nCeci est un email de test envoyé depuis Prelvio Gestion.\n\nLa connexion fonctionne correctement.`,
        },
      });
      if (error) throw error;
      Alert.alert('Email envoyé !', `Email de test envoyé à ${toEmail}.`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? JSON.stringify(e));
    } finally {
      setTestingEmail(false);
    }
  }

  // ── Intégration Twilio ────────────────────────────────
  const [editingTwilio, setEditingTwilio] = useState(false);
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioFrom, setTwilioFrom] = useState('');

  function startEditTwilio() {
    setTwilioSid(store?.twilio_sid ?? '');
    setTwilioToken(store?.twilio_token ?? '');
    setTwilioFrom(store?.twilio_from ?? '');
    setEditingTwilio(true);
  }
  async function saveTwilio() {
    await updateStore({
      twilio_sid: twilioSid.trim() || null,
      twilio_token: twilioToken.trim() || null,
      twilio_from: twilioFrom.trim() || null,
    });
    setEditingTwilio(false);
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? '—';
  const initial = displayName[0]?.toUpperCase() ?? '?';
  const resendConfigured = !!store?.resend_api_key;
  const twilioConfigured = !!store?.twilio_sid && !!store?.twilio_token && !!store?.twilio_from;

  return (
    <SafeAreaView style={st.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Header profil */}
        <View style={st.profileHeader}>
          <View style={st.avatar}>
            <Text style={st.avatarTxt}>{initial}</Text>
          </View>
          <Text style={st.displayName}>{displayName}</Text>
          <Text style={st.emailTxt}>{user?.email}</Text>
        </View>

        {/* ── Ma boutique ── */}
        <SectionTitle>Ma boutique</SectionTitle>
        <View style={st.card}>
          {editingStore ? (
            <View style={st.editBlock}>
              <EditField label="Nom de la boutique" value={storeName} onChange={setStoreName} />
              <EditField label="Téléphone" value={storePhone} onChange={setStorePhone} keyboardType="phone-pad" />
              <EditField label="Email" value={storeEmail} onChange={setStoreEmail} keyboardType="email-address" />
              <EditField label="Adresse" value={storeAddress} onChange={setStoreAddress} />
              <View style={st.editBtns}>
                <TouchableOpacity onPress={() => setEditingStore(false)} style={st.cancelBtn}>
                  <Text style={st.cancelTxt}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveStore} style={st.saveBtn} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.saveTxt}>Enregistrer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <SettingRow icon="storefront-outline" label="Nom" value={store?.name ?? '—'} onPress={startEditStore} />
              <SettingRow icon="call-outline" label="Téléphone" value={store?.phone ?? 'Non renseigné'} onPress={startEditStore} />
              <SettingRow icon="mail-outline" label="Email" value={store?.email ?? 'Non renseigné'} onPress={startEditStore} />
              <SettingRow icon="location-outline" label="Adresse" value={store?.address ?? 'Non renseignée'} onPress={startEditStore} />
            </>
          )}
        </View>

        {/* ── Intégration comptable (Resend) ── */}
        <SectionTitle>Intégration comptable</SectionTitle>
        <View style={st.card}>
          {editingResend ? (
            <View style={st.editBlock}>
              <View style={st.n8nInfo}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
                <Text style={st.n8nInfoTxt}>
                  Collez votre clé API Resend pour envoyer les exports CSV directement à votre comptable par email.
                </Text>
              </View>
              <EditField
                label="Clé API Resend"
                value={resendApiKey}
                onChange={setResendApiKey}
                placeholder="re_xxxxxxxxxxxxxxxxxxxx"
              />
              <EditField
                label="Email du comptable"
                value={accountantEmail}
                onChange={setAccountantEmail}
                keyboardType="email-address"
                placeholder="comptable@cabinet.fr"
              />
              <View style={st.editBtns}>
                <TouchableOpacity onPress={() => setEditingResend(false)} style={st.cancelBtn}>
                  <Text style={st.cancelTxt}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveResend} style={st.saveBtn} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.saveTxt}>Enregistrer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Statut Resend */}
              <View style={[st.webhookStatus, { borderColor: resendConfigured ? `${Colors.success}40` : Colors.border }]}>
                <View style={[st.webhookDot, { backgroundColor: resendConfigured ? Colors.success : Colors.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={st.webhookStatusLabel}>
                    {resendConfigured ? 'Resend configuré' : 'Resend non configuré'}
                  </Text>
                  {resendConfigured && store?.accountant_email && (
                    <Text style={st.webhookUrl}>Envoi vers {store.accountant_email}</Text>
                  )}
                </View>
              </View>

              <SettingRow
                icon="key-outline"
                label="Clé API Resend"
                value={store?.resend_api_key ? 're_••••••••' + store.resend_api_key.slice(-6) : 'Non configurée'}
                onPress={startEditResend}
              />
              <SettingRow
                icon="person-outline"
                label="Email comptable"
                value={store?.accountant_email ?? 'Non renseigné'}
                onPress={startEditResend}
              />

              {/* Bouton tester */}
              <View style={st.testRow}>
                <TouchableOpacity
                  style={[st.testBtn, !resendConfigured && { opacity: 0.4 }]}
                  onPress={testEmail}
                  disabled={!resendConfigured || testingEmail}
                >
                  {testingEmail
                    ? <ActivityIndicator size="small" color={Colors.info} />
                    : <>
                        <Ionicons name="flash-outline" size={15} color={Colors.info} />
                        <Text style={st.testBtnTxt}>Envoyer un email de test</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Note explicative Resend */}
        {!editingResend && (
          <View style={st.noteBox}>
            <Text style={st.noteTxt}>
              <Text style={{ fontWeight: '700', color: Colors.primary }}>Comment ça marche ?{'\n'}</Text>
              Créez un compte gratuit sur resend.com, copiez votre clé API (re_xxx...) et collez-la ici. Les exports seront envoyés directement par email à votre comptable.
            </Text>
          </View>
        )}

        {/* ── Intégration Twilio (SMS) ── */}
        <SectionTitle>SMS (Twilio)</SectionTitle>
        <View style={st.card}>
          {editingTwilio ? (
            <View style={st.editBlock}>
              <View style={st.n8nInfo}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
                <Text style={st.n8nInfoTxt}>
                  Configurez Twilio pour envoyer des SMS en masse à vos clients depuis l'onglet Newsletter.
                </Text>
              </View>
              <EditField
                label="Account SID"
                value={twilioSid}
                onChange={setTwilioSid}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <EditField
                label="Auth Token"
                value={twilioToken}
                onChange={setTwilioToken}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                secure
              />
              <EditField
                label="Numéro Twilio (expéditeur)"
                value={twilioFrom}
                onChange={setTwilioFrom}
                placeholder="+33xxxxxxxxx"
                keyboardType="phone-pad"
              />
              <View style={st.editBtns}>
                <TouchableOpacity onPress={() => setEditingTwilio(false)} style={st.cancelBtn}>
                  <Text style={st.cancelTxt}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveTwilio} style={st.saveBtn} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.saveTxt}>Enregistrer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={[st.webhookStatus, { borderColor: twilioConfigured ? `${Colors.success}40` : Colors.border }]}>
                <View style={[st.webhookDot, { backgroundColor: twilioConfigured ? Colors.success : Colors.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={st.webhookStatusLabel}>
                    {twilioConfigured ? 'Twilio configuré' : 'Twilio non configuré'}
                  </Text>
                  {twilioConfigured && store?.twilio_from && (
                    <Text style={st.webhookUrl}>Envoi depuis {store.twilio_from}</Text>
                  )}
                </View>
              </View>
              <SettingRow
                icon="key-outline"
                label="Account SID"
                value={store?.twilio_sid ? 'AC••••••' + store.twilio_sid.slice(-6) : 'Non configuré'}
                onPress={startEditTwilio}
              />
              <SettingRow
                icon="call-outline"
                label="Numéro expéditeur"
                value={store?.twilio_from ?? 'Non configuré'}
                onPress={startEditTwilio}
              />
            </>
          )}
        </View>

        {!editingTwilio && (
          <View style={st.noteBox}>
            <Text style={st.noteTxt}>
              <Text style={{ fontWeight: '700', color: Colors.primary }}>Comment ça marche ?{'\n'}</Text>
              Créez un compte sur twilio.com, récupérez votre Account SID, Auth Token et achetez un numéro de téléphone. Les SMS seront envoyés automatiquement depuis l'onglet Newsletter.
            </Text>
          </View>
        )}

        {/* ── Équipe ── */}
        <SectionTitle>Équipe</SectionTitle>
        <View style={st.card}>
          <SettingRow
            icon="people-outline"
            label="Gestion de l'équipe"
            rightText="Membres & rôles"
            onPress={() => router.push('/(app)/(tabs)/settings/team' as any)}
          />
        </View>

        {/* ── Compte ── */}
        <SectionTitle>Compte</SectionTitle>
        <View style={st.card}>
          <SettingRow icon="mail-outline" label="Email" value={user?.email ?? '—'} />
          <SettingRow icon="key-outline" label="Identifiant boutique" value={storeId ? storeId.slice(0, 8) + '…' : '—'} />
        </View>

        {/* ── Application ── */}
        <SectionTitle>Application</SectionTitle>
        <View style={st.card}>
          <SettingRow icon="information-circle-outline" label="Version" rightText="1.0.0" />
          <SettingRow icon="code-slash-outline" label="Stack" rightText="Expo + Supabase" />
        </View>

        {/* ── Session ── */}
        <SectionTitle>Session</SectionTitle>
        <View style={st.card}>
          <SettingRow
            icon="refresh-outline"
            label="Vider le cache"
            rightText="Recharger"
            onPress={async () => {
              await supabase.auth.signOut();
              if (typeof window !== 'undefined') {
                localStorage.clear();
                window.location.href = '/';
              }
            }}
          />
          <SettingRow icon="log-out-outline" label="Se déconnecter" onPress={signOut} danger rightText="Quitter" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────
const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  value: { fontSize: 12, color: Colors.textSecondary, maxWidth: 160 },
  right: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
});

const ef = StyleSheet.create({
  label: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, fontSize: 14, color: Colors.textPrimary,
  },
});

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 6 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: `${Colors.primary}40`,
  },
  avatarTxt: { color: '#0B0D11', fontSize: 30, fontWeight: '900' },
  displayName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  emailTxt: { fontSize: 13, color: Colors.textSecondary },

  sectionTitle: {
    fontSize: 9, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.4,
    paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: 6,
  },
  card: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },

  editBlock: { padding: Spacing.md, gap: 12 },
  editBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  cancelTxt: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: Radius.md, backgroundColor: Colors.primary, minWidth: 100, alignItems: 'center' },
  saveTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 13 },

  /* n8n section */
  n8nInfo: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: `${Colors.info}10`, borderRadius: Radius.md,
    padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.info,
  },
  n8nInfoTxt: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  webhookStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 4,
    padding: 12, borderRadius: Radius.md, borderWidth: 1,
    backgroundColor: Colors.background,
  },
  webhookDot: { width: 8, height: 8, borderRadius: 4 },
  webhookStatusLabel: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  webhookUrl: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },

  testRow: { padding: Spacing.md, paddingTop: 8 },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 1.5, borderColor: `${Colors.info}50`,
    borderRadius: Radius.md, paddingVertical: 11,
    backgroundColor: `${Colors.info}0A`,
  },
  testBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.info },

  noteBox: {
    marginHorizontal: Spacing.lg, marginTop: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.primary,
    borderWidth: 1, borderColor: Colors.border,
  },
  noteTxt: { fontSize: 12, color: Colors.textSecondary, lineHeight: 19 },
});
