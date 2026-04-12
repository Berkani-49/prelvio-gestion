import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Platform, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/hooks/useStore';
import { useCustomers } from '@/hooks/useCustomers';
import { Colors, Spacing, Radius } from '@/constants/colors';

const db = supabase as any;

function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('0')) cleaned = '+33' + cleaned.slice(1);
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  return cleaned;
}

type Segment = 'all' | 'vip' | 'regular' | 'new';
const SEGMENTS: { key: Segment; label: string; icon: string }[] = [
  { key: 'all',     label: 'Tous',       icon: 'people' },
  { key: 'vip',     label: 'VIP',        icon: 'star' },
  { key: 'regular', label: 'Réguliers',  icon: 'person' },
  { key: 'new',     label: 'Nouveaux',   icon: 'person-add' },
];

type SendMethod = 'whatsapp' | 'sms';

export default function NewsletterScreen() {
  const { storeId } = useStore();
  const { data: customers = [] } = useCustomers();

  const { data: storeData } = useQuery({
    queryKey: ['store-newsletter', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db.from('stores')
        .select('name, twilio_sid, twilio_token, twilio_from')
        .eq('id', storeId!).single();
      if (error) throw error;
      return data as { name: string; twilio_sid: string | null; twilio_token: string | null; twilio_from: string | null };
    },
  });

  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [sendMethod, setSendMethod] = useState<SendMethod>('sms');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });

  const twilioConfigured = !!storeData?.twilio_sid && !!storeData?.twilio_token && !!storeData?.twilio_from;

  const recipients = useMemo(() => {
    const withPhone = customers.filter(c => c.phone);
    if (segment === 'all') return withPhone;
    if (segment === 'vip') return withPhone.filter(c => c.segment === 'vip');
    if (segment === 'new') return withPhone.filter(c => c.segment === 'new');
    return withPhone.filter(c => c.segment === 'regular' || !c.segment);
  }, [customers, segment]);

  const customersWithoutPhone = customers.filter(c => !c.phone).length;

  // WhatsApp: open manually per client
  function openWhatsApp(phone: string, customerId: string) {
    if (!message.trim()) {
      showAlert('Message requis', 'Rédigez votre message avant d\'envoyer.');
      return;
    }
    const cleaned = cleanPhone(phone).replace('+', '');
    const encoded = encodeURIComponent(message.trim());
    Linking.openURL(`https://wa.me/${cleaned}?text=${encoded}`);
    setSentTo(prev => new Set(prev).add(customerId));
  }

  // SMS via Twilio: automatic bulk send
  async function sendSmsAutomatic() {
    if (!twilioConfigured) {
      showAlert('Configuration requise', 'Configurez Twilio dans les Réglages pour envoyer des SMS automatiques.');
      return;
    }
    if (!message.trim()) {
      showAlert('Message requis', 'Rédigez votre message avant d\'envoyer.');
      return;
    }
    if (recipients.length === 0) {
      showAlert('Aucun destinataire', 'Aucun client avec téléphone dans ce segment.');
      return;
    }

    setSending(true);
    setSendProgress({ sent: 0, failed: 0, total: recipients.length });

    try {
      const phones = recipients.map(c => cleanPhone(c.phone!));

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          accountSid: storeData!.twilio_sid,
          authToken: storeData!.twilio_token,
          from: storeData!.twilio_from,
          to: phones,
          body: message.trim(),
        },
      });

      if (error) throw error;

      const result = data as { sent: number; failed: number; results: { phone: string; success: boolean }[] };
      setSendProgress({ sent: result.sent, failed: result.failed, total: recipients.length });

      // Mark successful ones
      const newSentTo = new Set(sentTo);
      result.results.forEach((r, i) => {
        if (r.success) newSentTo.add(recipients[i].id);
      });
      setSentTo(newSentTo);

      showAlert(
        'Envoi terminé',
        `${result.sent} SMS envoyé${result.sent > 1 ? 's' : ''} avec succès.${result.failed > 0 ? `\n${result.failed} échec(s).` : ''}`
      );
    } catch (e: any) {
      showAlert('Erreur d\'envoi', e.message);
    } finally {
      setSending(false);
    }
  }

  // WhatsApp: open first, then user clicks each
  function sendWhatsAppAll() {
    if (!message.trim()) {
      showAlert('Message requis', 'Rédigez votre message avant d\'envoyer.');
      return;
    }
    if (recipients.length === 0) {
      showAlert('Aucun destinataire', 'Aucun client avec téléphone dans ce segment.');
      return;
    }
    const first = recipients[0];
    openWhatsApp(first.phone!, first.id);
    if (recipients.length > 1) {
      showAlert('Envoi WhatsApp', `Cliquez sur chaque client dans la liste pour envoyer le message.\n${recipients.length - 1} restant(s).`);
    }
  }

  function handleSend() {
    if (sendMethod === 'sms') {
      sendSmsAutomatic();
    } else {
      sendWhatsAppAll();
    }
  }

  function handleReset() {
    setMessage('');
    setSegment('all');
    setSentTo(new Set());
    setSendProgress({ sent: 0, failed: 0, total: 0 });
  }

  const allSent = recipients.length > 0 && recipients.every(c => sentTo.has(c.id));

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Newsletter</Text>
          <Text style={s.subtitle}>{customers.length} clients enregistrés</Text>
        </View>

        {/* Send method */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ENVOYER VIA</Text>
          <View style={s.methodRow}>
            <TouchableOpacity
              style={[s.methodBtn, sendMethod === 'sms' && s.methodBtnActive]}
              onPress={() => setSendMethod('sms')}
            >
              <Ionicons name="chatbubble-outline" size={18} color={sendMethod === 'sms' ? '#0A0A0A' : Colors.info} />
              <View>
                <Text style={[s.methodTxt, sendMethod === 'sms' && s.methodTxtActive]}>SMS auto</Text>
                <Text style={[s.methodSub, sendMethod === 'sms' && s.methodSubActive]}>via Twilio</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.methodBtn, sendMethod === 'whatsapp' && s.methodBtnActive]}
              onPress={() => setSendMethod('whatsapp')}
            >
              <Ionicons name="logo-whatsapp" size={20} color={sendMethod === 'whatsapp' ? '#0A0A0A' : '#25D366'} />
              <View>
                <Text style={[s.methodTxt, sendMethod === 'whatsapp' && s.methodTxtActive]}>WhatsApp</Text>
                <Text style={[s.methodSub, sendMethod === 'whatsapp' && s.methodSubActive]}>manuel</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Twilio status for SMS mode */}
          {sendMethod === 'sms' && !twilioConfigured && (
            <View style={s.warningBox}>
              <Ionicons name="warning-outline" size={16} color={Colors.warning} />
              <Text style={s.warningTxt}>
                Twilio non configuré. Allez dans Réglages → SMS (Twilio) pour l'activer.
              </Text>
            </View>
          )}
          {sendMethod === 'sms' && twilioConfigured && (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={s.successTxt}>
                Twilio configuré — les SMS seront envoyés automatiquement
              </Text>
            </View>
          )}
        </View>

        {/* Segment picker */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>DESTINATAIRES</Text>
          <View style={s.segmentRow}>
            {SEGMENTS.map(seg => {
              const active = segment === seg.key;
              return (
                <TouchableOpacity
                  key={seg.key}
                  style={[s.segmentBtn, active && s.segmentBtnActive]}
                  onPress={() => setSegment(seg.key)}
                >
                  <Ionicons name={seg.icon as any} size={16} color={active ? '#0A0A0A' : Colors.textSecondary} />
                  <Text style={[s.segmentTxt, active && s.segmentTxtActive]}>{seg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={s.recipientInfo}>
            <Ionicons name="call-outline" size={14} color={Colors.primary} />
            <Text style={s.recipientTxt}>
              {recipients.length} destinataire{recipients.length > 1 ? 's' : ''}
            </Text>
            {customersWithoutPhone > 0 && (
              <Text style={s.recipientWarn}>· {customersWithoutPhone} sans téléphone</Text>
            )}
          </View>
        </View>

        {/* Message */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>MESSAGE</Text>
          <TextInput
            style={[s.input, s.messageInput]}
            placeholder="Rédigez votre message ici..."
            placeholderTextColor={Colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{message.length} caractères</Text>
        </View>

        {/* Preview */}
        {message ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>APERÇU</Text>
            <View style={s.previewBox}>
              <View style={s.previewBubble}>
                <Text style={s.previewBody}>{message}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Send button */}
        <View style={{ marginBottom: Spacing.lg }}>
          {allSent ? (
            <TouchableOpacity style={s.sendBtn} onPress={handleReset} activeOpacity={0.85}>
              <Ionicons name="refresh" size={20} color="#0A0A0A" />
              <Text style={s.sendBtnTxt}>Nouveau message</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.sendBtn, (!message.trim() || sending || (sendMethod === 'sms' && !twilioConfigured)) && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={!message.trim() || sending || (sendMethod === 'sms' && !twilioConfigured)}
              activeOpacity={0.85}
            >
              {sending ? (
                <>
                  <ActivityIndicator color="#0A0A0A" />
                  <Text style={s.sendBtnTxt}>Envoi en cours...</Text>
                </>
              ) : (
                <>
                  <Ionicons name={sendMethod === 'whatsapp' ? 'logo-whatsapp' : 'send'} size={18} color="#0A0A0A" />
                  <Text style={s.sendBtnTxt}>
                    Envoyer à {recipients.length} client{recipients.length > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Progress */}
          {sendProgress.total > 0 && (
            <View style={s.progressBox}>
              <Text style={s.progressTxt}>
                <Text style={{ color: Colors.success }}>{sendProgress.sent} envoyé{sendProgress.sent > 1 ? 's' : ''}</Text>
                {sendProgress.failed > 0 && (
                  <Text style={{ color: Colors.danger }}> · {sendProgress.failed} échoué{sendProgress.failed > 1 ? 's' : ''}</Text>
                )}
                <Text style={{ color: Colors.textMuted }}> / {sendProgress.total}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Recipients list */}
        {recipients.length > 0 && message.trim() ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>
              LISTE DES CLIENTS · {sentTo.size}/{recipients.length} ENVOYÉ{sentTo.size > 1 ? 'S' : ''}
            </Text>
            {recipients.map(c => {
              const isSent = sentTo.has(c.id);
              const name = `${c.last_name}${c.first_name ? ' ' + c.first_name : ''}`;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[s.customerRow, isSent && s.customerRowSent]}
                  onPress={() => sendMethod === 'whatsapp' ? openWhatsApp(c.phone!, c.id) : undefined}
                  activeOpacity={sendMethod === 'whatsapp' ? 0.7 : 1}
                  disabled={sendMethod === 'sms'}
                >
                  <View style={[s.customerAvatar, isSent && s.customerAvatarSent]}>
                    {isSent ? (
                      <Ionicons name="checkmark" size={16} color={Colors.success} />
                    ) : (
                      <Text style={s.customerInitial}>{name[0]?.toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.customerName, isSent && { color: Colors.textMuted }]}>{name}</Text>
                    <Text style={s.customerPhone}>{c.phone}</Text>
                  </View>
                  <Ionicons
                    name={isSent ? 'checkmark-circle' : (sendMethod === 'whatsapp' ? 'logo-whatsapp' : 'chatbubble-outline')}
                    size={20}
                    color={isSent ? Colors.success : Colors.primary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 48 },

  header: { marginBottom: Spacing.lg },
  title: { fontSize: 30, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  section: { marginBottom: Spacing.lg },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: Spacing.sm },

  methodRow: { flexDirection: 'row', gap: 10 },
  methodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  methodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  methodTxt: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  methodTxtActive: { color: '#0A0A0A' },
  methodSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  methodSubActive: { color: '#0A0A0A80' },

  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: `${Colors.warning}15`, borderRadius: Radius.md, borderWidth: 1, borderColor: `${Colors.warning}30`, marginTop: Spacing.sm },
  warningTxt: { flex: 1, fontSize: 12, color: Colors.warning, fontWeight: '500' },

  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: `${Colors.success}15`, borderRadius: Radius.md, borderWidth: 1, borderColor: `${Colors.success}30`, marginTop: Spacing.sm },
  successTxt: { flex: 1, fontSize: 12, color: Colors.success, fontWeight: '500' },

  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  segmentBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentTxt: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  segmentTxtActive: { color: '#0A0A0A' },

  recipientInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  recipientTxt: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  recipientWarn: { fontSize: 12, color: Colors.textMuted },

  input: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  messageInput: { minHeight: 160, lineHeight: 22 },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },

  previewBox: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  previewBubble: { backgroundColor: `${Colors.primary}20`, borderRadius: Radius.md, padding: 14, borderTopLeftRadius: 4 },
  previewBody: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16 },
  sendBtnTxt: { fontSize: 15, fontWeight: '800', color: '#0A0A0A' },

  progressBox: { alignItems: 'center', marginTop: Spacing.sm },
  progressTxt: { fontSize: 13, fontWeight: '600' },

  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  customerRowSent: { borderColor: `${Colors.success}40`, backgroundColor: `${Colors.success}08` },
  customerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  customerAvatarSent: { backgroundColor: `${Colors.success}20` },
  customerInitial: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  customerName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  customerPhone: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
});
