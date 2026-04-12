import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateSupplier } from '@/hooks/useSuppliers';
import { Colors, Spacing, Radius } from '@/constants/colors';

function Field({
  label, value, onChange, placeholder, keyboardType, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        style={[s.fieldInput, multiline && s.fieldInputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function AddSupplierScreen() {
  const { mutateAsync: createSupplier, isPending } = useCreateSupplier();

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Le nom du fournisseur est obligatoire.'); return; }
    setError('');
    try {
      const supplier = await createSupplier({
        name: name.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      router.replace(`/(app)/(tabs)/suppliers/${supplier.id}` as any);
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
        <Text style={s.headerTitle}>Nouveau fournisseur</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={s.section}>
          <Text style={s.sectionTitle}>Entreprise</Text>
          <Field label="Nom *" value={name} onChange={setName} placeholder="Ex : Grossiste ABC" />
          <Field label="Contact" value={contactName} onChange={setContactName} placeholder="Jean Martin" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Coordonnées</Text>
          <Field label="Email" value={email} onChange={setEmail} placeholder="contact@fournisseur.com" keyboardType="email-address" />
          <Field label="Téléphone" value={phone} onChange={setPhone} placeholder="+33 1 00 00 00 00" keyboardType="phone-pad" />
          <Field label="Adresse" value={address} onChange={setAddress} placeholder="123 rue du Commerce, Paris" />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Notes</Text>
          <Field label="" value={notes} onChange={setNotes} placeholder="Conditions de paiement, délais, remarques…" multiline />
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
                <Text style={s.submitBtnTxt}>Enregistrer le fournisseur</Text>
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
  fieldInputMulti: { minHeight: 90, textAlignVertical: 'top' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B1212', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.danger}40` },
  errorTxt: { color: Colors.danger, fontSize: 13, flex: 1 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16 },
  submitBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 15 },
});
