import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking, Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInvoice, useUpdateInvoiceStatus } from '@/hooks/useInvoices';
import { Colors, Spacing, Radius } from '@/constants/colors';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Brouillon', color: '#94A3B8', bg: '#1E293B',  border: '#94A3B830' },
  sent:      { label: 'Envoyée',   color: '#3B82F6', bg: '#0F1E3A',  border: '#3B82F630' },
  paid:      { label: 'Payée',     color: '#10B981', bg: '#0F2E1A',  border: '#10B98130' },
  cancelled: { label: 'Annulée',   color: '#EF4444', bg: '#3B1212',  border: '#EF444430' },
};

type ActionIconName = 'paper-plane-outline' | 'checkmark-circle-outline' | 'close-circle-outline';

const NEXT_ACTIONS: Record<string, {
  label: string;
  to: string;
  icon: ActionIconName;
  color: string;
  bg: string;
  border: string;
}[]> = {
  draft: [
    { label: 'Marquer Envoyée', to: 'sent',      icon: 'paper-plane-outline',      color: Colors.info,    bg: `${Colors.info}15`,    border: `${Colors.info}40` },
    { label: 'Marquer Payée',   to: 'paid',      icon: 'checkmark-circle-outline', color: Colors.success, bg: `${Colors.success}15`, border: `${Colors.success}40` },
    { label: 'Annuler',         to: 'cancelled', icon: 'close-circle-outline',     color: Colors.danger,  bg: `${Colors.danger}15`,  border: `${Colors.danger}40` },
  ],
  sent: [
    { label: 'Marquer Payée', to: 'paid',      icon: 'checkmark-circle-outline', color: Colors.success, bg: `${Colors.success}15`, border: `${Colors.success}40` },
    { label: 'Annuler',       to: 'cancelled', icon: 'close-circle-outline',     color: Colors.danger,  bg: `${Colors.danger}15`,  border: `${Colors.danger}40` },
  ],
  paid: [],
  cancelled: [],
};

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, accent && { color: Colors.primary }]}>{value}</Text>
    </View>
  );
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: invoice, isLoading } = useInvoice(id);
  const { mutateAsync: updateStatus, isPending } = useUpdateInvoiceStatus();
  const [error, setError] = useState('');

  async function handleStatus(status: string) {
    setError('');
    try {
      await updateStatus({ id, status });
    } catch (e: any) {
      setError(e.message ?? 'Erreur');
    }
  }

  async function handleGeneratePDF() {
    if (!invoice) return;
    const customerName = invoice.customers
      ? `${invoice.customers.first_name ?? ''} ${invoice.customers.last_name}`.trim()
      : 'Client anonyme';
    const issueDate = new Date(invoice.issue_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    const itemsRows = (invoice.invoice_items ?? []).map((item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${item.unit_price.toFixed(2)} €</td>
        <td style="text-align:right"><strong>${item.total.toFixed(2)} €</strong></td>
      </tr>`).join('');

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<style>
  body { font-family: Arial, sans-serif; color: #1a1a2e; padding: 40px; font-size: 14px; }
  h1 { font-size: 28px; color: #4ECDC4; margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .brand { font-size: 11px; color: #666; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
  .badge { background: #e0faf8; color: #0a8c84; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .info-row { display: flex; gap: 60px; margin-bottom: 30px; }
  .info-block label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-block p { margin: 4px 0 0; font-weight: 600; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; }
  .totals { float: right; width: 260px; margin-top: 10px; }
  .totals tr td { padding: 6px 0; }
  .totals tr td:last-child { text-align: right; font-weight: 600; }
  .total-ttc td { font-size: 18px; color: #4ECDC4; border-top: 2px solid #4ECDC4; padding-top: 10px; }
  .footer { margin-top: 60px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
</style></head><body>
<div class="header">
  <div>
    <h1>${invoice.invoice_number}</h1>
    <div class="brand">Prelvio Gestion · Solutions SaaS &amp; Mobile</div>
  </div>
  <span class="badge">${invoice.status === 'paid' ? 'Payée' : invoice.status === 'sent' ? 'Envoyée' : invoice.status === 'cancelled' ? 'Annulée' : 'Brouillon'}</span>
</div>

<div class="info-row">
  <div class="info-block"><label>Client</label><p>${customerName}</p>${invoice.customers?.email ? `<p style="font-weight:normal;font-size:13px;color:#666">${invoice.customers.email}</p>` : ''}</div>
  <div class="info-block"><label>Date d'émission</label><p>${issueDate}</p></div>
  ${dueDate ? `<div class="info-block"><label>Échéance</label><p>${dueDate}</p></div>` : ''}
</div>

<table>
  <thead><tr><th>Article</th><th style="text-align:center">Qté</th><th style="text-align:right">Prix unitaire</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${itemsRows}</tbody>
</table>

<table class="totals">
  <tr><td>Sous-total</td><td>${invoice.subtotal.toFixed(2)} €</td></tr>
  ${invoice.discount > 0 ? `<tr><td>Remise</td><td>−${invoice.discount.toFixed(2)} €</td></tr>` : ''}
  <tr><td>TVA</td><td>${invoice.tax_amount.toFixed(2)} €</td></tr>
  <tr class="total-ttc"><td><strong>Total TTC</strong></td><td><strong>${invoice.total.toFixed(2)} €</strong></td></tr>
</table>

${invoice.notes ? `<div style="clear:both;margin-top:20px;padding:14px;background:#f9f9f9;border-radius:8px;font-size:13px;color:#555"><strong>Notes :</strong> ${invoice.notes}</div>` : ''}

<div class="footer">Généré avec Prelvio Gestion · Solutions SaaS &amp; Mobile</div>
</body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Facture ${invoice.invoice_number}` });
      } else {
        Alert.alert('PDF généré', `Fichier disponible à : ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Impossible de générer le PDF');
    }
  }

  async function handleSendByEmail() {
    if (!invoice) return;
    const customerEmail = invoice.customers?.email ?? '';
    const customerName = invoice.customers
      ? `${invoice.customers.first_name ?? ''} ${invoice.customers.last_name}`.trim()
      : 'Client';

    const issueDate = new Date(invoice.issue_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    const itemsLines = (invoice.invoice_items ?? [])
      .map((item) => `  - ${item.name} : ${item.quantity} × ${item.unit_price.toFixed(2)} € = ${item.total.toFixed(2)} €`)
      .join('\n');

    const body = [
      `Bonjour ${customerName},`,
      '',
      `Veuillez trouver ci-dessous le récapitulatif de votre facture ${invoice.invoice_number}.`,
      '',
      `Date d'émission : ${issueDate}`,
      dueDate ? `Date d'échéance : ${dueDate}` : null,
      '',
      'Articles :',
      itemsLines,
      '',
      `Sous-total : ${invoice.subtotal.toFixed(2)} €`,
      invoice.discount > 0 ? `Remise : -${invoice.discount.toFixed(2)} €` : null,
      `TVA : ${invoice.tax_amount.toFixed(2)} €`,
      `Total TTC : ${invoice.total.toFixed(2)} €`,
      invoice.payment_method ? `\nMode de paiement : ${invoice.payment_method}` : null,
      invoice.notes ? `\nNotes : ${invoice.notes}` : null,
      '',
      'Cordialement,',
    ].filter(Boolean).join('\n');

    const subject = encodeURIComponent(`Facture ${invoice.invoice_number}`);
    const encodedBody = encodeURIComponent(body);
    const mailto = `mailto:${customerEmail}?subject=${subject}&body=${encodedBody}`;

    const canOpen = await Linking.canOpenURL(mailto);
    if (!canOpen) {
      Alert.alert('Erreur', "Impossible d'ouvrir le client email.");
      return;
    }
    await Linking.openURL(mailto);

    if (invoice.status === 'draft') {
      try { await updateStatus({ id, status: 'sent' }); } catch (_) {}
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.errorText}>Facture introuvable</Text>
          <TouchableOpacity style={s.backBtnFallback} onPress={() => router.back()}>
            <Text style={s.backBtnFallbackTxt}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const st = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft;
  const customerName = invoice.customers
    ? `${invoice.customers.first_name ?? ''} ${invoice.customers.last_name}`.trim()
    : 'Client anonyme';
  const actions = NEXT_ACTIONS[invoice.status] ?? [];

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={[s.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
          <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={s.hero}>
          <View style={[s.heroBar, { backgroundColor: st.color }]} />
          <View style={s.heroBody}>
            <View style={s.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.heroMeta}>{invoice.invoice_number.toUpperCase()}</Text>
                <Text style={s.heroCustomer} numberOfLines={1}>{customerName}</Text>
              </View>
              <View style={[s.heroBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                <Text style={[s.heroBadgeTxt, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroBottom}>
              <View>
                <Text style={s.heroTotalLabel}>TOTAL TTC</Text>
                <Text style={s.heroTotal}>{invoice.total.toFixed(2)} €</Text>
              </View>
              <View style={s.heroSubStats}>
                <View style={s.heroSubStat}>
                  <Text style={s.heroSubVal}>{invoice.subtotal.toFixed(2)} €</Text>
                  <Text style={s.heroSubLbl}>HT</Text>
                </View>
                {invoice.discount > 0 && (
                  <View style={s.heroSubStat}>
                    <Text style={[s.heroSubVal, { color: Colors.warning }]}>−{invoice.discount.toFixed(2)} €</Text>
                    <Text style={s.heroSubLbl}>Remise</Text>
                  </View>
                )}
                <View style={s.heroSubStat}>
                  <Text style={s.heroSubVal}>{invoice.tax_amount.toFixed(2)} €</Text>
                  <Text style={s.heroSubLbl}>TVA</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Paid banner */}
        {invoice.status === 'paid' && (
          <View style={s.paidBanner}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={s.paidText}>Facture payée — aucune action requise</Text>
          </View>
        )}

        {/* Dates */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Dates</Text>
          <Row
            label="Émission"
            value={new Date(invoice.issue_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          />
          {invoice.due_date && (
            <Row
              label="Échéance"
              value={new Date(invoice.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            />
          )}
        </View>

        {/* Articles */}
        {invoice.invoice_items && invoice.invoice_items.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Articles ({invoice.invoice_items.length})</Text>
            {invoice.invoice_items.map((item, idx) => (
              <View key={item.id ?? idx} style={s.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{item.name}</Text>
                  <Text style={s.itemSub}>{item.quantity} × {item.unit_price.toFixed(2)} €</Text>
                </View>
                <Text style={s.itemTotal}>{item.total.toFixed(2)} €</Text>
              </View>
            ))}
          </View>
        )}

        {/* Infos complémentaires */}
        {(invoice.payment_method || invoice.notes) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Informations</Text>
            {invoice.payment_method && <Row label="Mode de paiement" value={invoice.payment_method} />}
            {invoice.notes && (
              <View style={s.notesBlock}>
                <Text style={s.notesLabel}>NOTES</Text>
                <Text style={s.notesText}>{invoice.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Export / Envoi */}
        {invoice.status !== 'cancelled' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Export & Envoi</Text>
            <View style={s.exportRow}>
              <TouchableOpacity style={s.exportBtn} onPress={handleGeneratePDF} activeOpacity={0.75}>
                <View style={[s.exportIconWrap, { backgroundColor: `${Colors.primary}15`, borderColor: `${Colors.primary}30` }]}>
                  <Ionicons name="document-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={s.exportBtnTxt}>Exporter PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.exportBtn} onPress={handleSendByEmail} activeOpacity={0.75}>
                <View style={[s.exportIconWrap, { backgroundColor: `${Colors.info}15`, borderColor: `${Colors.info}30` }]}>
                  <Ionicons name="mail-outline" size={20} color={Colors.info} />
                </View>
                <Text style={s.exportBtnTxt}>Envoyer email</Text>
              </TouchableOpacity>
            </View>
            {!invoice.customers?.email && (
              <Text style={s.emailHint}>Aucun email client — vous pourrez le saisir manuellement dans votre client email.</Text>
            )}
          </View>
        )}

        {/* Actions statut */}
        {actions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Changer le statut</Text>
            {error ? <Text style={s.errorMsg}>{error}</Text> : null}
            <View style={s.actionsGrid}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.to}
                  style={[s.actionBtn, { backgroundColor: action.bg, borderColor: action.border }]}
                  onPress={() => handleStatus(action.to)}
                  activeOpacity={0.75}
                  disabled={isPending}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color={action.color} />
                  ) : (
                    <Ionicons name={action.icon} size={18} color={action.color} />
                  )}
                  <Text style={[s.actionBtnTxt, { color: action.color }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: Colors.danger, fontSize: 16 },
  backBtnFallback: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  backBtnFallbackTxt: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },

  /* Header */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  statusText: { fontSize: 13, fontWeight: '700' },

  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },

  /* Hero */
  hero: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  heroBar: { height: 4 },
  heroBody: { padding: Spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  heroMeta: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4, marginBottom: 3 },
  heroCustomer: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  heroBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  heroBadgeTxt: { fontSize: 12, fontWeight: '700' },
  heroDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroTotalLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4, marginBottom: 2 },
  heroTotal: { fontSize: 44, fontWeight: '900', color: Colors.primary, letterSpacing: -2, lineHeight: 48 },
  heroSubStats: { flexDirection: 'row', gap: 16, alignItems: 'flex-end', paddingBottom: 4 },
  heroSubStat: { alignItems: 'flex-end', gap: 2 },
  heroSubVal: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  heroSubLbl: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },

  /* Paid banner */
  paidBanner: { backgroundColor: '#0F2E1A', borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: `${Colors.success}25` },
  paidText: { fontSize: 14, fontWeight: '600', color: Colors.success, flex: 1 },

  /* Section */
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 4, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 },

  /* Row */
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  rowLabel: { fontSize: 14, color: Colors.textSecondary },
  rowValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },

  /* Items */
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt, gap: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itemSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  /* Notes */
  notesBlock: { paddingTop: 6 },
  notesLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4, marginBottom: 6 },
  notesText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

  /* Export */
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 12, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  exportIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  exportBtnTxt: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },

  /* Actions */
  actionsGrid: { gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  actionBtnTxt: { fontSize: 14, fontWeight: '700' },
  errorMsg: { color: Colors.danger, fontSize: 13 },

  emailHint: { fontSize: 12, color: Colors.textMuted, marginTop: 6, textAlign: 'center' },
});
