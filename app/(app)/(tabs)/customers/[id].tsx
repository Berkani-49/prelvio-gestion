import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/colors';
import type { Customer } from '@/types/database';

const db = supabase as any;

const SEGMENT_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  vip:      { color: Colors.warning,   bg: '#281A00',        border: `${Colors.warning}40` },
  regular:  { color: Colors.primary,   bg: '#0D2423',        border: `${Colors.primary}40` },
  new:      { color: Colors.success,   bg: '#0C2820',        border: `${Colors.success}40` },
  inactive: { color: Colors.textMuted, bg: Colors.surfaceAlt, border: Colors.border },
};

const SEGMENTS = [
  { key: 'new',      label: 'Nouveau' },
  { key: 'regular',  label: 'Régulier' },
  { key: 'vip',      label: 'VIP' },
  { key: 'inactive', label: 'Inactif' },
];

function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from('customers').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Customer;
    },
  });
}

function useCustomerInvoices(customerId: string) {
  return useQuery({
    queryKey: ['customer-invoices', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await db
        .from('invoices')
        .select('id, invoice_number, total, status, issue_date')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as { id: string; invoice_number: string; total: number; status: string; issue_date: string }[];
    },
  });
}

function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { data, error } = await db.from('customers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', data.id] });
    },
  });
}

function computeSegment(totalSpent: number, paidCount: number, daysSinceLast: number | null): string {
  if (totalSpent >= 1000 && paidCount >= 3) return 'vip';
  if (daysSinceLast !== null && daysSinceLast > 90) return 'inactive';
  if (paidCount > 0) return 'regular';
  return 'new';
}

function EditField({ label, value, onChange, keyboardType }: { label: string; value: string; onChange: (v: string) => void; keyboardType?: any }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        style={s.fieldInput}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: invoices = [] } = useCustomerInvoices(id);
  const { mutateAsync: updateCustomer, isPending } = useUpdateCustomer();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [segment, setSegment] = useState('new');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const [pointsInput, setPointsInput] = useState('');
  const [pointsSuccess, setPointsSuccess] = useState('');
  const [autoSegMsg, setAutoSegMsg] = useState('');

  const { mutateAsync: applyAutoSegment, isPending: autoSegPending } = useMutation({
    mutationFn: async ({ newSeg }: { newSeg: string }) => {
      const { error } = await db.from('customers').update({ segment: newSeg }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { newSeg }) => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setAutoSegMsg(`Segment mis à jour → ${newSeg.toUpperCase()}`);
      setTimeout(() => setAutoSegMsg(''), 2500);
    },
  });

  const { mutateAsync: adjustPoints, isPending: adjustingPoints } = useMutation({
    mutationFn: async ({ delta }: { delta: number }) => {
      const current = customer?.loyalty_points ?? 0;
      const next = Math.max(0, current + delta);
      const { error } = await db.from('customers').update({ loyalty_points: next }).eq('id', id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setPointsInput('');
      setPointsSuccess(`Points mis à jour : ${next} pts`);
      setTimeout(() => setPointsSuccess(''), 2500);
    },
  });

  function startEdit() {
    if (!customer) return;
    setFirstName(customer.first_name ?? '');
    setLastName(customer.last_name);
    setEmail(customer.email ?? '');
    setPhone(customer.phone ?? '');
    setSegment(customer.segment);
    setNotes(customer.notes ?? '');
    setEditing(true);
  }

  async function saveEdit() {
    if (!lastName.trim()) { setError('Le nom est obligatoire.'); return; }
    setError('');
    try {
      await updateCustomer({
        id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        segment,
        notes: notes.trim() || null,
      });
      setEditing(false);
    } catch (e: any) {
      setError(e.message ?? 'Erreur');
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.errorText}>Client introuvable</Text>
          <TouchableOpacity style={s.fallbackBtn} onPress={() => router.back()}>
            <Text style={s.fallbackBtnTxt}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const seg = SEGMENT_COLORS[customer.segment] ?? SEGMENT_COLORS.regular;
  const fullName = `${customer.first_name ?? ''} ${customer.last_name}`.trim();
  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const totalSpent = paidInvoices.reduce((sum, i) => sum + i.total, 0);
  const avgOrder = paidInvoices.length > 0 ? totalSpent / paidInvoices.length : 0;

  const sortedDates = paidInvoices
    .map((i) => new Date(i.issue_date))
    .sort((a, b) => b.getTime() - a.getTime());
  const lastPurchase = sortedDates[0] ?? null;
  const daysSinceLast = lastPurchase
    ? Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let avgFrequency: number | null = null;
  if (sortedDates.length >= 2) {
    const gaps = sortedDates.slice(0, -1).map((d, i) =>
      (d.getTime() - sortedDates[i + 1].getTime()) / (1000 * 60 * 60 * 24)
    );
    avgFrequency = Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length);
  }

  const crmSuggestion = (() => {
    if (daysSinceLast === null) return null;
    if (daysSinceLast > 90) return { text: 'Inactif depuis +90 jours — relancer par email', color: Colors.danger };
    if (daysSinceLast > 30) return { text: "Pas d'achat depuis 1 mois — proposer une offre", color: Colors.warning };
    if (totalSpent > 500 && customer.segment !== 'vip') return { text: 'CA élevé — envisager de passer en VIP', color: Colors.primary };
    if (paidInvoices.length >= 5) return { text: 'Client fidèle — récompenser avec des points bonus', color: Colors.success };
    return null;
  })();

  const statusColors: Record<string, string> = { paid: Colors.success, sent: Colors.info, draft: Colors.textMuted, cancelled: Colors.danger };
  const statusLabels: Record<string, string> = { paid: 'Payée', sent: 'Envoyée', draft: 'Brouillon', cancelled: 'Annulée' };

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        {!editing && (
          <TouchableOpacity style={s.editBtn} onPress={startEdit}>
            <Ionicons name="create-outline" size={15} color="#0B0D11" />
            <Text style={s.editBtnTxt}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Hero card */}
        <View style={s.hero}>
          <View style={[s.heroBar, { backgroundColor: seg.color }]} />
          <View style={s.heroBody}>
            <View style={s.heroTop}>
              <View style={[s.avatar, { backgroundColor: `${seg.color}20`, borderColor: `${seg.color}40` }]}>
                <Text style={[s.avatarTxt, { color: seg.color }]}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroName}>{fullName}</Text>
                <View style={s.heroChips}>
                  <View style={[s.segBadge, { backgroundColor: seg.bg, borderColor: seg.border }]}>
                    <View style={[s.segDot, { backgroundColor: seg.color }]} />
                    <Text style={[s.segTxt, { color: seg.color }]}>{customer.segment.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.autoSegBtn}
                    onPress={() => {
                      const newSeg = computeSegment(totalSpent, paidInvoices.length, daysSinceLast);
                      if (newSeg !== customer.segment) applyAutoSegment({ newSeg });
                      else { setAutoSegMsg('Segment déjà à jour'); setTimeout(() => setAutoSegMsg(''), 2000); }
                    }}
                    disabled={autoSegPending}
                  >
                    {autoSegPending
                      ? <ActivityIndicator size="small" color={Colors.primary} />
                      : <Ionicons name="flash-outline" size={12} color={Colors.primary} />
                    }
                    <Text style={s.autoSegTxt}>Auto</Text>
                  </TouchableOpacity>
                </View>
                {autoSegMsg ? <Text style={s.autoSegMsg}>{autoSegMsg}</Text> : null}
              </View>
            </View>

            <View style={s.heroDivider} />

            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={[s.heroStatVal, { color: Colors.success }]}>{totalSpent.toFixed(0)} €</Text>
                <Text style={s.heroStatLbl}>Total dépensé</Text>
              </View>
              <View style={s.heroStatSep} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{invoices.length}</Text>
                <Text style={s.heroStatLbl}>Factures</Text>
              </View>
              <View style={s.heroStatSep} />
              <View style={s.heroStat}>
                <Text style={[s.heroStatVal, { color: Colors.warning }]}>{customer.loyalty_points}</Text>
                <Text style={s.heroStatLbl}>Points</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats CRM */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statVal}>{avgOrder > 0 ? `${avgOrder.toFixed(0)} €` : '—'}</Text>
            <Text style={s.statLbl}>Panier moyen</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statVal, daysSinceLast !== null && daysSinceLast > 60 ? { color: Colors.danger } : {}]}>
              {daysSinceLast === null ? '—' : daysSinceLast === 0 ? "Auj." : `${daysSinceLast}j`}
            </Text>
            <Text style={s.statLbl}>Dernière visite</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statVal}>{avgFrequency !== null ? `${avgFrequency}j` : '—'}</Text>
            <Text style={s.statLbl}>Fréquence</Text>
          </View>
        </View>

        {/* Suggestion CRM */}
        {crmSuggestion && (
          <View style={[s.crmTip, { borderLeftColor: crmSuggestion.color }]}>
            <Ionicons name="bulb-outline" size={16} color={crmSuggestion.color} />
            <Text style={[s.crmTipText, { color: crmSuggestion.color }]}>{crmSuggestion.text}</Text>
          </View>
        )}

        {/* Points fidélité */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Points fidélité</Text>
          <View style={s.pointsDisplay}>
            <Text style={s.pointsBig}>{customer.loyalty_points}</Text>
            <Text style={s.pointsUnit}>points</Text>
          </View>
          <View style={s.quickPoints}>
            {[-50, -10, +10, +50, +100].map((delta) => (
              <TouchableOpacity
                key={delta}
                style={[s.quickBtn, delta < 0 ? s.quickBtnMinus : s.quickBtnPlus]}
                onPress={() => adjustPoints({ delta })}
                disabled={adjustingPoints}
              >
                <Text style={[s.quickBtnTxt, delta < 0 ? s.quickBtnTxtMinus : s.quickBtnTxtPlus]}>
                  {delta > 0 ? `+${delta}` : delta}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.customPointsRow}>
            <TextInput
              style={s.pointsInput}
              value={pointsInput}
              onChangeText={setPointsInput}
              placeholder="Montant personnalisé…"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={s.pointsAddBtn}
              onPress={() => {
                const v = parseInt(pointsInput, 10);
                if (!isNaN(v) && v !== 0) adjustPoints({ delta: v });
              }}
              disabled={adjustingPoints || !pointsInput}
            >
              <Text style={s.pointsAddBtnTxt}>Appliquer</Text>
            </TouchableOpacity>
          </View>
          {pointsSuccess ? <Text style={s.successMsg}>{pointsSuccess}</Text> : null}
        </View>

        {/* Infos / Édition */}
        {editing ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Modifier les informations</Text>
            <EditField label="Prénom" value={firstName} onChange={setFirstName} />
            <EditField label="Nom *" value={lastName} onChange={setLastName} />
            <EditField label="Email" value={email} onChange={setEmail} keyboardType="email-address" />
            <EditField label="Téléphone" value={phone} onChange={setPhone} keyboardType="phone-pad" />

            <Text style={[s.sectionTitle, { marginTop: 8 }]}>Segment</Text>
            <View style={s.segRow}>
              {SEGMENTS.map((seg) => {
                const sc = SEGMENT_COLORS[seg.key];
                const active = segment === seg.key;
                return (
                  <TouchableOpacity
                    key={seg.key}
                    style={[s.segChip, active && { backgroundColor: sc.bg, borderColor: sc.color }]}
                    onPress={() => setSegment(seg.key)}
                  >
                    {active && <View style={[s.segChipDot, { backgroundColor: sc.color }]} />}
                    <Text style={[s.segChipTxt, active && { color: sc.color, fontWeight: '700' }]}>{seg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.sectionTitle, { marginTop: 8 }]}>Notes</Text>
            <TextInput
              style={s.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes internes…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />

            {error ? <Text style={s.errorMsg}>{error}</Text> : null}

            <View style={s.editActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditing(false); setError(''); }}>
                <Text style={s.cancelBtnTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={saveEdit} disabled={isPending}>
                {isPending
                  ? <ActivityIndicator size="small" color="#0B0D11" />
                  : <Text style={s.saveBtnTxt}>Enregistrer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Coordonnées</Text>
            {customer.email && <InfoRow label="Email" value={customer.email} />}
            {customer.phone && <InfoRow label="Téléphone" value={customer.phone} />}
            {customer.address && <InfoRow label="Adresse" value={customer.address} />}
            {customer.notes && <InfoRow label="Notes" value={customer.notes} />}
            {!customer.email && !customer.phone && !customer.address && (
              <Text style={s.emptyInfo}>Aucune coordonnée renseignée</Text>
            )}
          </View>
        )}

        {/* Historique des achats */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Historique ({invoices.length})</Text>
            <TouchableOpacity
              style={s.newInvBtn}
              onPress={() => router.push(`/(app)/(tabs)/invoices/create?customerId=${id}&customerName=${encodeURIComponent(fullName)}` as any)}
            >
              <Ionicons name="add" size={13} color="#0B0D11" />
              <Text style={s.newInvTxt}>Facture</Text>
            </TouchableOpacity>
          </View>
          {invoices.length === 0 ? (
            <Text style={s.emptyInfo}>Aucune facture pour ce client</Text>
          ) : (
            invoices.map((inv) => (
              <TouchableOpacity
                key={inv.id}
                style={s.invRow}
                onPress={() => router.push(`/(app)/(tabs)/invoices/${inv.id}` as any)}
              >
                <View style={[s.invDot, { backgroundColor: statusColors[inv.status] ?? Colors.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.invNum}>{inv.invoice_number}</Text>
                  <Text style={s.invDate}>
                    {new Date(inv.issue_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[s.invTotal, { color: statusColors[inv.status] ?? Colors.primary }]}>{inv.total.toFixed(2)} €</Text>
                <Text style={[s.invStatus, { color: statusColors[inv.status] ?? Colors.textMuted }]}>
                  {statusLabels[inv.status] ?? inv.status}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: Colors.danger, fontSize: 16 },
  fallbackBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  fallbackBtnTxt: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },

  /* Header */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 9 },
  editBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 13 },

  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },

  /* Hero */
  hero: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  heroBar: { height: 4 },
  heroBody: { padding: Spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, flexShrink: 0 },
  avatarTxt: { fontSize: 20, fontWeight: '900' },
  heroName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  heroChips: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  segBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  segDot: { width: 6, height: 6, borderRadius: 3 },
  segTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  autoSegBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  autoSegTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  autoSegMsg: { fontSize: 11, color: Colors.success, fontWeight: '600', marginTop: 4 },

  heroDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  heroStats: { flexDirection: 'row' },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatSep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  heroStatLbl: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },

  /* Stats CRM */
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  statVal: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  statLbl: { fontSize: 10, color: Colors.textMuted, fontWeight: '500', textAlign: 'center' },

  /* CRM tip */
  crmTip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderLeftWidth: 3, borderWidth: 1, borderColor: Colors.border },
  crmTipText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  /* Section */
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 10, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  newInvBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  newInvTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 12 },

  /* InfoRow */
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
  emptyInfo: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 8 },

  /* Edit form */
  fieldLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4 },
  fieldInput: { backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 12, fontSize: 15, color: Colors.textPrimary },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
  segChipDot: { width: 6, height: 6, borderRadius: 3 },
  segChipTxt: { fontSize: 13, color: Colors.textSecondary },
  notesInput: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, minHeight: 80, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  cancelBtnTxt: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.md },
  saveBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 14 },
  errorMsg: { color: Colors.danger, fontSize: 13 },

  /* Points */
  pointsDisplay: { alignItems: 'center', paddingVertical: 8, gap: 2 },
  pointsBig: { fontSize: 48, fontWeight: '900', color: Colors.primary },
  pointsUnit: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  quickPoints: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5 },
  quickBtnPlus: { backgroundColor: '#0F2E1A', borderColor: Colors.success },
  quickBtnMinus: { backgroundColor: '#3B1212', borderColor: Colors.danger },
  quickBtnTxt: { fontSize: 14, fontWeight: '700' },
  quickBtnTxtPlus: { color: Colors.success },
  quickBtnTxtMinus: { color: Colors.danger },
  customPointsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pointsInput: { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 10, fontSize: 15, color: Colors.textPrimary },
  pointsAddBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  pointsAddBtnTxt: { color: '#0B0D11', fontWeight: '700', fontSize: 14 },
  successMsg: { color: Colors.success, fontSize: 13, textAlign: 'center', fontWeight: '600' },

  /* Invoices list */
  invRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt, gap: 12 },
  invDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  invNum: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  invDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  invTotal: { fontSize: 15, fontWeight: '700' },
  invStatus: { fontSize: 12, fontWeight: '600', minWidth: 55, textAlign: 'right' },
});
