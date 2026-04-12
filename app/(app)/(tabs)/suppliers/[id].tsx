import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers';
import { Colors, Spacing, Radius } from '@/constants/colors';

const AVATAR_COLORS = [Colors.primary, Colors.info, Colors.success, '#A78BFA', Colors.warning];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function EditField({ label, value, onChange, keyboardType, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        style={[s.fieldInput, multiline && s.fieldInputMulti]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: supplier, isLoading } = useSupplier(id);
  const { mutateAsync: updateSupplier, isPending: isSaving } = useUpdateSupplier();
  const { mutateAsync: deleteSupplier, isPending: isDeleting } = useDeleteSupplier();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function startEdit() {
    if (!supplier) return;
    setName(supplier.name);
    setContactName(supplier.contact_name ?? '');
    setEmail(supplier.email ?? '');
    setPhone(supplier.phone ?? '');
    setAddress(supplier.address ?? '');
    setNotes(supplier.notes ?? '');
    setEditing(true);
  }

  async function saveEdit() {
    if (!name.trim()) { setError('Le nom est obligatoire.'); return; }
    setError('');
    try {
      await updateSupplier({
        id,
        name: name.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      setEditing(false);
    } catch (e: any) {
      setError(e.message ?? 'Erreur');
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Supprimer le fournisseur',
      `Supprimer "${supplier?.name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await deleteSupplier(id);
              router.back();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!supplier) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.errorText}>Fournisseur introuvable</Text>
          <TouchableOpacity style={s.fallbackBtn} onPress={() => router.back()}>
            <Text style={s.fallbackBtnTxt}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const color = avatarColor(supplier.name);
  const createdAt = new Date(supplier.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

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
          <View style={[s.heroBar, { backgroundColor: color }]} />
          <View style={s.heroBody}>
            <View style={s.heroTop}>
              <View style={[s.avatar, { backgroundColor: `${color}15`, borderColor: `${color}35` }]}>
                <Text style={[s.avatarTxt, { color }]}>{initials(supplier.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroName}>{supplier.name}</Text>
                {supplier.contact_name && (
                  <Text style={s.heroContact}>{supplier.contact_name}</Text>
                )}
                <View style={s.heroChips}>
                  {supplier.phone && (
                    <View style={s.heroChip}>
                      <Ionicons name="call-outline" size={11} color={Colors.textMuted} />
                      <Text style={s.heroChipTxt}>{supplier.phone}</Text>
                    </View>
                  )}
                  {supplier.email && (
                    <View style={s.heroChip}>
                      <Ionicons name="mail-outline" size={11} color={Colors.textMuted} />
                      <Text style={s.heroChipTxt} numberOfLines={1}>{supplier.email}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={s.heroDivider} />
            <Text style={s.heroSince}>Partenaire depuis le {createdAt}</Text>
          </View>
        </View>

        {/* Infos / Édition */}
        {editing ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Modifier</Text>
            <EditField label="Nom *" value={name} onChange={setName} />
            <EditField label="Contact" value={contactName} onChange={setContactName} />
            <EditField label="Email" value={email} onChange={setEmail} keyboardType="email-address" />
            <EditField label="Téléphone" value={phone} onChange={setPhone} keyboardType="phone-pad" />
            <EditField label="Adresse" value={address} onChange={setAddress} />
            <EditField label="Notes" value={notes} onChange={setNotes} multiline />

            {error ? <Text style={s.errorMsg}>{error}</Text> : null}

            <View style={s.editActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditing(false); setError(''); }}>
                <Text style={s.cancelBtnTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={saveEdit} disabled={isSaving}>
                {isSaving
                  ? <ActivityIndicator size="small" color="#0B0D11" />
                  : <Text style={s.saveBtnTxt}>Enregistrer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Coordonnées</Text>
            {supplier.email   && <InfoRow label="Email"     value={supplier.email} />}
            {supplier.phone   && <InfoRow label="Téléphone" value={supplier.phone} />}
            {supplier.address && <InfoRow label="Adresse"   value={supplier.address} />}
            {!supplier.email && !supplier.phone && !supplier.address && (
              <Text style={s.emptyInfo}>Aucune coordonnée renseignée</Text>
            )}
          </View>
        )}

        {!editing && supplier.notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.notesText}>{supplier.notes}</Text>
          </View>
        )}

        {!editing && (
          <View style={s.dangerZone}>
            <Text style={s.dangerTitle}>Zone dangereuse</Text>
            <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete} disabled={isDeleting}>
              {isDeleting
                ? <ActivityIndicator color={Colors.danger} size="small" />
                : (
                  <>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    <Text style={s.deleteBtnTxt}>Supprimer ce fournisseur</Text>
                  </>
                )
              }
            </TouchableOpacity>
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
  heroTop: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, flexShrink: 0 },
  avatarTxt: { fontSize: 20, fontWeight: '900' },
  heroName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  heroContact: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  heroChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  heroChipTxt: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', maxWidth: 140 },
  heroDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 10 },
  heroSince: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  /* Section */
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 10, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
  emptyInfo: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 6 },
  notesText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 21 },

  /* Edit form */
  fieldLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4 },
  fieldInput: { backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 12, fontSize: 15, color: Colors.textPrimary },
  fieldInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  cancelBtnTxt: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.md },
  saveBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 14 },
  errorMsg: { color: Colors.danger, fontSize: 13 },

  /* Danger */
  dangerZone: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 10, borderWidth: 1, borderColor: `${Colors.danger}30` },
  dangerTitle: { fontSize: 9, fontWeight: '800', color: Colors.danger, textTransform: 'uppercase', letterSpacing: 1.4 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: `${Colors.danger}15`, borderRadius: Radius.md, paddingVertical: 13, borderWidth: 1, borderColor: `${Colors.danger}40` },
  deleteBtnTxt: { color: Colors.danger, fontWeight: '700', fontSize: 14 },
});
