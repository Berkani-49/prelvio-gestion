import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { Colors, Spacing, Radius } from '@/constants/colors';

const SEGMENTS = [
  { key: 'new',      label: 'Nouveau',  color: Colors.success },
  { key: 'regular',  label: 'Régulier', color: Colors.primary },
  { key: 'vip',      label: 'VIP',      color: Colors.warning },
  { key: 'inactive', label: 'Inactif',  color: Colors.textMuted },
];

function Field({
  label, value, onChange, placeholder, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label.replace(' *', '').toUpperCase()}{label.includes('*') ? ' *' : ''}</Text>
      <TextInput
        style={s.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

export default function AddCustomerScreen() {
  const { mutateAsync: createCustomer, isPending } = useCreateCustomer();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [segment, setSegment] = useState('new');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    if (!lastName.trim()) { setError('Le nom est obligatoire.'); return; }
    setError('');
    try {
      const customer = await createCustomer({
        store_id: '',
        first_name: firstName.trim() || null,
        last_name: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        segment,
        notes: notes.trim() || null,
      });
      router.replace(`/(app)/(tabs)/customers/${customer.id}` as any);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création');
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nouveau client</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={s.section}>
          <Text style={s.sectionTitle}>Identité</Text>
          <Field label="Prénom" value={firstName} onChange={setFirstName} placeholder="Jean" />
          <Field label="Nom *" value={lastName} onChange={setLastName} placeholder="Dupont" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Contact</Text>
          <Field label="Email" value={email} onChange={setEmail} placeholder="jean@example.com" keyboardType="email-address" />
          <Field label="Téléphone" value={phone} onChange={setPhone} placeholder="+33 6 00 00 00 00" keyboardType="phone-pad" />
          <Field label="Adresse" value={address} onChange={setAddress} placeholder="123 rue de la Paix, Paris" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Segment</Text>
          <View style={s.segmentRow}>
            {SEGMENTS.map((seg) => {
              const active = segment === seg.key;
              return (
                <TouchableOpacity
                  key={seg.key}
                  style={[s.segChip, active && { backgroundColor: `${seg.color}20`, borderColor: seg.color }]}
                  onPress={() => setSegment(seg.key)}
                >
                  {active && <View style={[s.segDot, { backgroundColor: seg.color }]} />}
                  <Text style={[s.segChipTxt, active && { color: seg.color, fontWeight: '700' }]}>{seg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Notes</Text>
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes internes…"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="warning-outline" size={15} color={Colors.danger} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={s.submitBtn} onPress={handleSave} disabled={isPending} activeOpacity={0.8}>
          {isPending
            ? <ActivityIndicator size="small" color="#0B0D11" />
            : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#0B0D11" />
                <Text style={s.submitBtnTxt}>Enregistrer le client</Text>
              </>
            )
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },

  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 12, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4 },
  fieldInput: { backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 12, fontSize: 15, color: Colors.textPrimary },

  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  segChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
  segDot: { width: 6, height: 6, borderRadius: 3 },
  segChipTxt: { fontSize: 13, color: Colors.textSecondary },

  notesInput: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, minHeight: 80, textAlignVertical: 'top' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B1212', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.danger}40` },
  errorTxt: { color: Colors.danger, fontSize: 13, flex: 1 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16 },
  submitBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 15 },
});
