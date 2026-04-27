import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useStore } from './useStore';

const db = supabase as any;

export type MemberRole = 'owner' | 'manager' | 'employee' | 'accountant';

export type TeamMember = {
  id: string;
  user_id: string;
  role: MemberRole;
  email: string;
  full_name: string | null;
};

export type Invitation = {
  id: string;
  email: string;
  role: MemberRole;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
};

// ── Rôle du user courant ──────────────────────────────────
export function useMyRole() {
  const { user } = useAuthStore();
  const { storeId } = useStore();

  return useQuery({
    queryKey: ['my-role', storeId, user?.id],
    enabled: !!storeId && !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await db
        .from('store_members')
        .select('role')
        .eq('store_id', storeId!)
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return (data as any)?.role as MemberRole;
    },
  });
}

// ── Liste des membres ─────────────────────────────────────
export function useTeamMembers() {
  const { storeId } = useStore();

  return useQuery({
    queryKey: ['team-members', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from('store_members')
        .select('id, user_id, role')
        .eq('store_id', storeId!);
      if (error) throw error;

      const members = (data ?? []) as { id: string; user_id: string; role: MemberRole }[];
      if (members.length === 0) return [];

      // Récupère les profils
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await db
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap: Record<string, { email: string; full_name: string | null }> = {};
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.id] = { email: p.email, full_name: p.full_name };
      });

      return members.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        email: profileMap[m.user_id]?.email ?? 'Email inconnu',
        full_name: profileMap[m.user_id]?.full_name ?? null,
      })) as TeamMember[];
    },
  });
}

// ── Invitations en attente ────────────────────────────────
export function useInvitations() {
  const { storeId } = useStore();

  return useQuery({
    queryKey: ['invitations', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from('store_invitations')
        .select('id, email, role, status, created_at, expires_at')
        .eq('store_id', storeId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invitation[];
    },
  });
}

const ROLE_LABELS: Record<string, string> = {
  manager: 'Gérant',
  employee: 'Employé',
  accountant: 'Comptable',
};

// ── Inviter par email ─────────────────────────────────────
export function useInviteMember() {
  const { user } = useAuthStore();
  const { storeId } = useStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: MemberRole }) => {
      // 1. Créer l'invitation en base
      const { data: invitation, error } = await db
        .from('store_invitations')
        .insert({
          store_id: storeId!,
          email: email.toLowerCase().trim(),
          role,
          invited_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;

      // 2. Récupérer les infos du store pour l'email
      const { data: store } = await db
        .from('stores')
        .select('name, resend_api_key')
        .eq('id', storeId!)
        .single();

      // 3. Envoyer l'email si Resend est configuré
      if (store?.resend_api_key) {
        const storeName = store.name ?? 'votre boutique';
        const roleLabel = ROLE_LABELS[role] ?? role;
        await supabase.functions.invoke('send-email', {
          body: {
            apiKey: store.resend_api_key,
            to: [email],
            subject: `Invitation à rejoindre ${storeName} sur Prelvio`,
            text: [
              `Bonjour,`,
              ``,
              `Vous avez été invité(e) à rejoindre "${storeName}" en tant que ${roleLabel} sur Prelvio Gestion.`,
              ``,
              `Pour accepter l'invitation :`,
              `1. Téléchargez l'application Prelvio Gestion`,
              `2. Créez un compte avec cet email (${email})`,
              `3. Vous rejoindrez automatiquement l'équipe`,
              ``,
              `À bientôt !`,
              `L'équipe Prelvio`,
            ].join('\n'),
          },
        });
        return { ...invitation, emailSent: true };
      }

      return { ...invitation, emailSent: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations', storeId] });
    },
  });
}

// ── Changer le rôle d'un membre ───────────────────────────
export function useUpdateMemberRole() {
  const { storeId } = useStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: MemberRole }) => {
      const { error } = await db
        .from('store_members')
        .update({ role })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members', storeId] });
    },
  });
}

// ── Retirer un membre ─────────────────────────────────────
export function useRemoveMember() {
  const { storeId } = useStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await db
        .from('store_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members', storeId] });
    },
  });
}

// ── Annuler une invitation ────────────────────────────────
export function useCancelInvitation() {
  const { storeId } = useStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await db
        .from('store_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations', storeId] });
    },
  });
}

// ── Code d'invitation du store ────────────────────────────
export function useStoreInviteCode() {
  const { storeId } = useStore();

  return useQuery({
    queryKey: ['store-invite-code', storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await db
        .from('stores')
        .select('invite_code')
        .eq('id', storeId!)
        .single();
      if (error) throw error;
      return (data as any)?.invite_code as string ?? null;
    },
  });
}

// ── Rejoindre un store avec un code ──────────────────────
export function useJoinStore() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      // Trouve le store par son code
      const { data: store, error: storeError } = await db
        .from('stores')
        .select('id')
        .eq('invite_code', code.trim().toLowerCase())
        .single();
      if (storeError || !store) throw new Error('Code invalide ou expiré.');

      // Vérifie si l'utilisateur est déjà membre
      const { data: existing } = await db
        .from('store_members')
        .select('id')
        .eq('store_id', (store as any).id)
        .eq('user_id', user!.id)
        .single();
      if (existing) throw new Error('Vous êtes déjà membre de ce commerce.');

      // Rejoint le store en tant qu'employé
      const { error } = await db
        .from('store_members')
        .insert({ store_id: (store as any).id, user_id: user!.id, role: 'employee' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-id'] });
      qc.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}
