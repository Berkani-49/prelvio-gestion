import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import {
  useTeamMembers, useMyRole, useInvitations, useInviteMember,
  useUpdateMemberRole, useRemoveMember, useCancelInvitation,
  useStoreInviteCode, type MemberRole, type TeamMember,
} from '@/hooks/useTeam';

// ── Config des rôles ──────────────────────────────────────
const ROLE_CONFIG: Record<MemberRole, { label: string; color: string; bg: string; border: string }> = {
  owner:      { label: 'Propriétaire', color: Colors.warning,   bg: '#281A00',        border: `${Colors.warning}40` },
  manager:    { label: 'Gérant',       color: Colors.primary,   bg: '#0D2423',        border: `${Colors.primary}40` },
  employee:   { label: 'Employé',      color: Colors.info,      bg: '#0F1E3A',        border: `${Colors.info}40` },
  accountant: { label: 'Comptable',    color: '#A78BFA',        bg: '#1A1030',        border: '#A78BFA40' },
};

const ASSIGNABLE_ROLES: MemberRole[] = ['manager', 'employee', 'accountant'];

function RoleBadge({ role }: { role: MemberRole }) {
  const rc = ROLE_CONFIG[role] ?? ROLE_CONFIG.employee;
  return (
    <View style={[s.roleBadge, { backgroundColor: rc.bg, borderColor: rc.border }]}>
      <View style={[s.roleDot, { backgroundColor: rc.color }]} />
      <Text style={[s.roleTxt, { color: rc.color }]}>{rc.label}</Text>
    </View>
  );
}

function MemberCard({
  member, canEdit, currentUserId, onChangeRole, onRemove,
}: {
  member: TeamMember;
  canEdit: boolean;
  currentUserId: string;
  onChangeRole: (m: TeamMember) => void;
  onRemove: (m: TeamMember) => void;
}) {
  const isMe = member.user_id === currentUserId;
  const displayName = member.full_name || member.email;
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const rc = ROLE_CONFIG[member.role];

  return (
    <View style={s.memberCard}>
      <View style={[s.memberAvatar, { backgroundColor: `${rc.color}18`, borderColor: `${rc.color}35` }]}>
        <Text style={[s.memberAvatarTxt, { color: rc.color }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.memberNameRow}>
          <Text style={s.memberName} numberOfLines={1}>{displayName}</Text>
          {isMe && (
            <View style={s.meBadge}>
              <Text style={s.meBadgeTxt}>Moi</Text>
            </View>
          )}
        </View>
        <Text style={s.memberEmail} numberOfLines={1}>{member.email}</Text>
      </View>
      <RoleBadge role={member.role} />
      {canEdit && !isMe && member.role !== 'owner' && (
        <View style={s.memberActions}>
          <TouchableOpacity style={s.memberActionBtn} onPress={() => onChangeRole(member)}>
            <Ionicons name="swap-vertical-outline" size={15} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.memberActionBtn} onPress={() => onRemove(member)}>
            <Ionicons name="person-remove-outline" size={15} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Modal changement de rôle ──────────────────────────────
import { Modal, Pressable } from 'react-native';

function RolePickerModal({
  visible, member, onClose, onSelect, isPending,
}: {
  visible: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onSelect: (role: MemberRole) => void;
  isPending: boolean;
}) {
  if (!member) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={s.modalTitle}>Changer le rôle</Text>
          <Text style={s.modalSub}>{member.full_name || member.email}</Text>
          <View style={s.modalDivider} />
          {ASSIGNABLE_ROLES.map((role) => {
            const rc = ROLE_CONFIG[role];
            const active = member.role === role;
            return (
              <TouchableOpacity
                key={role}
                style={[s.roleOption, active && { backgroundColor: `${rc.color}10`, borderColor: rc.color }]}
                onPress={() => onSelect(role)}
                disabled={isPending || active}
              >
                <View style={[s.roleDot, { backgroundColor: rc.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.roleOptionLabel, { color: active ? rc.color : Colors.textPrimary }]}>{rc.label}</Text>
                  <Text style={s.roleOptionDesc}>{roleDesc(role)}</Text>
                </View>
                {active && <Ionicons name="checkmark" size={18} color={rc.color} />}
                {isPending && !active && <ActivityIndicator size="small" color={Colors.textMuted} />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={s.modalCancel} onPress={onClose}>
            <Text style={s.modalCancelTxt}>Annuler</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function roleDesc(role: MemberRole): string {
  switch (role) {
    case 'manager':    return 'Accès complet sauf gestion d\'équipe';
    case 'employee':   return 'Caisse, stock, factures basiques';
    case 'accountant': return 'Lecture seule + export comptable';
    default: return '';
  }
}

// ── Écran principal ───────────────────────────────────────
export default function TeamScreen() {
  const { user } = useAuthStore();
  const { data: members = [], isLoading: loadingMembers, refetch } = useTeamMembers();
  const { data: myRole } = useMyRole();
  const { data: invitations = [], isLoading: loadingInv } = useInvitations();
  const { data: inviteCode } = useStoreInviteCode();

  const { mutateAsync: inviteMember, isPending: inviting } = useInviteMember();
  const { mutateAsync: updateRole, isPending: updatingRole } = useUpdateMemberRole();
  const { mutateAsync: removeMember, isPending: removing } = useRemoveMember();
  const { mutateAsync: cancelInvitation } = useCancelInvitation();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('employee');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const [roleModal, setRoleModal] = useState<TeamMember | null>(null);

  const canEdit = myRole === 'owner' || myRole === 'manager';

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteError('Email invalide.');
      return;
    }
    setInviteError('');
    try {
      const result = await inviteMember({ email: inviteEmail.trim(), role: inviteRole });
      setInviteSuccess(
        result.emailSent
          ? `Email d'invitation envoyé à ${inviteEmail.trim()} ✓`
          : `Invitation créée. Configurez Resend dans Paramètres pour envoyer les emails automatiquement.`
      );
      setInviteEmail('');
      setTimeout(() => setInviteSuccess(''), 5000);
    } catch (e: any) {
      setInviteError(e.message ?? 'Erreur lors de l\'invitation');
    }
  }

  async function handleChangeRole(role: MemberRole) {
    if (!roleModal) return;
    try {
      await updateRole({ memberId: roleModal.id, role });
      setRoleModal(null);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  }

  function confirmRemove(member: TeamMember) {
    Alert.alert(
      'Retirer du commerce',
      `Retirer ${member.full_name || member.email} de l'équipe ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer', style: 'destructive',
          onPress: async () => {
            try { await removeMember(member.id); }
            catch (e: any) { Alert.alert('Erreur', e.message); }
          },
        },
      ]
    );
  }

  function copyCode() {
    if (!inviteCode) return;
    Clipboard.setString(inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  }

  const owner = members.find((m) => m.role === 'owner');
  const otherMembers = members.filter((m) => m.role !== 'owner');

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Équipe</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroBar} />
          <View style={s.heroBody}>
            <View style={s.heroTop}>
              <View>
                <Text style={s.heroLabel}>MEMBRES</Text>
                <Text style={s.heroCount}>{members.length}</Text>
              </View>
              <View style={s.heroRight}>
                <Ionicons name="people-outline" size={26} color={Colors.primary} style={{ opacity: 0.6 }} />
              </View>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={[s.heroStatVal, { color: Colors.primary }]}>
                  {members.filter((m) => m.role === 'manager').length}
                </Text>
                <Text style={s.heroStatLbl}>Gérants</Text>
              </View>
              <View style={s.heroStatSep} />
              <View style={s.heroStat}>
                <Text style={[s.heroStatVal, { color: Colors.info }]}>
                  {members.filter((m) => m.role === 'employee').length}
                </Text>
                <Text style={s.heroStatLbl}>Employés</Text>
              </View>
              <View style={s.heroStatSep} />
              <View style={s.heroStat}>
                <Text style={[s.heroStatVal, { color: Colors.warning }]}>
                  {invitations.length}
                </Text>
                <Text style={s.heroStatLbl}>En attente</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Membres */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Membres de l'équipe</Text>
          {loadingMembers ? (
            <View style={s.loadingWrap}><ActivityIndicator color={Colors.primary} /></View>
          ) : members.length === 0 ? (
            <Text style={s.emptyTxt}>Aucun membre</Text>
          ) : (
            <>
              {owner && (
                <MemberCard
                  member={owner}
                  canEdit={false}
                  currentUserId={user?.id ?? ''}
                  onChangeRole={setRoleModal}
                  onRemove={confirmRemove}
                />
              )}
              {otherMembers.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  canEdit={canEdit}
                  currentUserId={user?.id ?? ''}
                  onChangeRole={setRoleModal}
                  onRemove={confirmRemove}
                />
              ))}
            </>
          )}
        </View>

        {/* Code d'invitation */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Code d'invitation</Text>
          <Text style={s.inviteCodeHint}>
            Partagez ce code à vos employés. Ils l'entrent dans l'app pour rejoindre votre commerce automatiquement.
          </Text>
          <View style={s.inviteCodeRow}>
            <View style={s.inviteCodeBox}>
              <Text style={s.inviteCode}>{inviteCode ?? '—'}</Text>
            </View>
            <TouchableOpacity style={s.copyBtn} onPress={copyCode} activeOpacity={0.75}>
              <Ionicons
                name={codeCopied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={codeCopied ? Colors.success : Colors.primary}
              />
              <Text style={[s.copyBtnTxt, codeCopied && { color: Colors.success }]}>
                {codeCopied ? 'Copié !' : 'Copier'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Invitations en attente */}
        {invitations.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Invitations en attente ({invitations.length})</Text>
            {loadingInv ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              invitations.map((inv) => (
                <View key={inv.id} style={s.invRow}>
                  <View style={[s.invIconWrap, { backgroundColor: `${Colors.warning}15` }]}>
                    <Ionicons name="time-outline" size={16} color={Colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.invEmail} numberOfLines={1}>{inv.email}</Text>
                    <RoleBadge role={inv.role} />
                  </View>
                  {canEdit && (
                    <TouchableOpacity
                      style={s.invCancelBtn}
                      onPress={() => cancelInvitation(inv.id)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Inviter par email */}
        {canEdit && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Inviter un membre</Text>
            <Text style={s.inviteHint}>
              L'employé créera un compte avec cet email et rejoindra automatiquement votre commerce.
            </Text>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Email</Text>
              <TextInput
                style={s.fieldInput}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="employe@exemple.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Rôle</Text>
              <View style={s.roleRow}>
                {ASSIGNABLE_ROLES.map((role) => {
                  const rc = ROLE_CONFIG[role];
                  const active = inviteRole === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[s.roleChip, active && { backgroundColor: rc.bg, borderColor: rc.color }]}
                      onPress={() => setInviteRole(role)}
                    >
                      {active && <View style={[s.roleDot, { backgroundColor: rc.color }]} />}
                      <Text style={[s.roleChipTxt, active && { color: rc.color, fontWeight: '700' }]}>
                        {rc.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {inviteError ? (
              <View style={s.errorBox}>
                <Ionicons name="warning-outline" size={14} color={Colors.danger} />
                <Text style={s.errorTxt}>{inviteError}</Text>
              </View>
            ) : null}
            {inviteSuccess ? (
              <View style={s.successBox}>
                <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                <Text style={s.successTxt}>{inviteSuccess}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={s.inviteBtn} onPress={handleInvite} disabled={inviting} activeOpacity={0.8}>
              {inviting
                ? <ActivityIndicator size="small" color="#0B0D11" />
                : (
                  <>
                    <Ionicons name="person-add-outline" size={17} color="#0B0D11" />
                    <Text style={s.inviteBtnTxt}>Créer l'invitation</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      <RolePickerModal
        visible={!!roleModal}
        member={roleModal}
        onClose={() => setRoleModal(null)}
        onSelect={handleChangeRole}
        isPending={updatingRole}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },

  /* Hero */
  hero: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  heroBar: { height: 4, backgroundColor: Colors.primary },
  heroBody: { padding: Spacing.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4, marginBottom: 2 },
  heroCount: { fontSize: 44, fontWeight: '900', color: Colors.primary, letterSpacing: -2, lineHeight: 48 },
  heroRight: { width: 56, height: 56, borderRadius: 16, backgroundColor: `${Colors.primary}10`, borderWidth: 1, borderColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  heroDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  heroStats: { flexDirection: 'row' },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatSep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  heroStatLbl: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },

  /* Section */
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 12, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },
  loadingWrap: { paddingVertical: 20, alignItems: 'center' },
  emptyTxt: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 8 },

  /* Member card */
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, flexShrink: 0 },
  memberAvatarTxt: { fontSize: 15, fontWeight: '900' },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  memberEmail: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  meBadge: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  meBadgeTxt: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  memberActions: { flexDirection: 'row', gap: 4 },
  memberActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },

  /* Role badge */
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  /* Invite code */
  inviteCodeHint: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  inviteCodeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inviteCodeBox: { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 14, alignItems: 'center' },
  inviteCode: { fontSize: 22, fontWeight: '900', color: Colors.primary, letterSpacing: 4 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${Colors.primary}15`, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: `${Colors.primary}30` },
  copyBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  /* Pending invitations */
  invRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt },
  invIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  invEmail: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  invCancelBtn: { padding: 4 },

  /* Invite form */
  inviteHint: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4 },
  fieldInput: { backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 12, fontSize: 15, color: Colors.textPrimary },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent' },
  roleChipTxt: { fontSize: 13, color: Colors.textSecondary },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B1212', borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: `${Colors.danger}40` },
  errorTxt: { color: Colors.danger, fontSize: 12, flex: 1 },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0F2E1A', borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: `${Colors.success}40` },
  successTxt: { color: Colors.success, fontSize: 12, flex: 1 },

  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14 },
  inviteBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 14 },

  /* Modal */
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 13, color: Colors.textSecondary, marginTop: -4 },
  modalDivider: { height: 1, backgroundColor: Colors.border },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  roleOptionLabel: { fontSize: 14, fontWeight: '700' },
  roleOptionDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  modalCancel: { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  modalCancelTxt: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
});
