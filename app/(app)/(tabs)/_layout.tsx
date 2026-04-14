import React from 'react';
import { Tabs } from 'expo-router';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable, ActivityIndicator,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { create } from 'zustand';
import { useStore, useUserStores, useStoreOverride } from '@/hooks/useStore';
import { useAuthStore } from '@/stores/authStore';

// Store global — permet d'ouvrir le profil depuis n'importe quel écran
export const useProfileModal = create<{ profileOpen: boolean; setProfileOpen: (v: boolean) => void }>((set) => ({
  profileOpen: false,
  setProfileOpen: (v) => set({ profileOpen: v }),
}));

// ── Tab icon ──────────────────────────────────────────────
function TabIcon({ emoji, label, focused }: {
  emoji: string; label: string; focused: boolean;
}) {
  return (
    <View style={ti.wrap}>
      <View style={[ti.iconWrap, focused && ti.iconWrapActive]}>
        <Text style={[ti.emoji, focused && ti.emojiActive]}>{emoji}</Text>
      </View>
      <Text style={[ti.label, focused && ti.labelActive]}>{label}</Text>
    </View>
  );
}

const ti = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 3, paddingVertical: 4 },
  iconWrap: { width: 42, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: `${Colors.primary}18` },
  emoji: { fontSize: 20, opacity: 0.5 },
  emojiActive: { opacity: 1 },
  label: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  labelActive: { color: Colors.primary, fontWeight: '700' },
});

// ── Modal profil / switch boutique ────────────────────────
function ProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, signOut } = useAuthStore();
  const { storeId } = useStore();
  const { data: stores = [], isLoading } = useUserStores();
  const { setOverrideStoreId } = useStoreOverride();
  const queryClient = useQueryClient();

  function switchStore(id: string) {
    setOverrideStoreId(id === storeId ? null : id);
    queryClient.invalidateQueries();
    onClose();
  }

  function handleSignOut() {
    onClose();
    signOut();
  }

  const initial = (user?.email ?? 'U')[0].toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pr.overlay} onPress={onClose}>
        <Pressable style={pr.card} onPress={(e) => e.stopPropagation()}>
          <View style={pr.profileRow}>
            <View style={pr.avatar}>
              <Text style={pr.avatarTxt}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={pr.email} numberOfLines={1}>{user?.email ?? ''}</Text>
              <Text style={pr.role}>Propriétaire</Text>
            </View>
          </View>

          <View style={pr.divider} />

          <Text style={pr.sectionLabel}>MES BOUTIQUES</Text>
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 16 }} />
          ) : stores.length === 0 ? (
            <Text style={pr.emptyTxt}>Aucune boutique trouvée</Text>
          ) : (
            stores.map((store: any) => {
              const active = store.id === storeId;
              return (
                <TouchableOpacity
                  key={store.id}
                  style={[pr.storeRow, active && pr.storeRowActive]}
                  onPress={() => switchStore(store.id)}
                  activeOpacity={0.7}
                >
                  <View style={[pr.storeIcon, active && pr.storeIconActive]}>
                    <Text style={pr.storeIconEmoji}>🏪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[pr.storeName, active && pr.storeNameActive]}>{store.name}</Text>
                    <Text style={pr.storeRole}>
                      {store.role === 'owner' ? 'Propriétaire'
                        : store.role === 'manager' ? 'Manager'
                        : store.role === 'accountant' ? 'Comptable'
                        : 'Employé'}
                    </Text>
                  </View>
                  {active && <Text style={pr.checkEmoji}>✓</Text>}
                </TouchableOpacity>
              );
            })
          )}

          <View style={pr.divider} />

          <TouchableOpacity style={pr.logoutBtn} onPress={handleSignOut} activeOpacity={0.7}>
            <Text style={pr.logoutEmoji}>🚪</Text>
            <Text style={pr.logoutTxt}>Déconnexion</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Layout principal ──────────────────────────────────────
export default function TabLayout() {
  const { profileOpen, setProfileOpen } = useProfileModal();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: tab.bar,
          tabBarShowLabel: false,
        }}
      >
        {/* ── Onglets visibles ── */}
        <Tabs.Screen
          name="dashboard/index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="📊" label="Tableau de bord" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="stock/index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="📦" label="Stock" focused={focused} />
            ),
          }}
        />

        {/* ── Bouton profil ── */}
        <Tabs.Screen
          name="settings/index"
          options={{
            tabBarButton: () => (
              <TouchableOpacity style={tab.profileWrap} onPress={() => setProfileOpen(true)} activeOpacity={0.8}>
                <View style={tab.profileBtn}>
                  <Text style={tab.profileEmoji}>👤</Text>
                </View>
                <Text style={tab.profileLabel}>Profil</Text>
              </TouchableOpacity>
            ),
          }}
        />

        {/* ── Écrans stock sans onglet ── */}
        <Tabs.Screen name="stock/add"       options={{ href: null }} />
        <Tabs.Screen name="stock/[id]"      options={{ href: null }} />
        <Tabs.Screen name="stock/edit/[id]" options={{ href: null }} />
        <Tabs.Screen name="stock/inventory" options={{ href: null }} />

        {/* ── Routes hors-périmètre : masquées mais enregistrées (Expo Router) ── */}
        <Tabs.Screen name="settings/team"      options={{ href: null }} />
        <Tabs.Screen name="export/index"       options={{ href: null }} />
        <Tabs.Screen name="invoices/index"     options={{ href: null }} />
        <Tabs.Screen name="invoices/create"    options={{ href: null }} />
        <Tabs.Screen name="invoices/[id]"      options={{ href: null }} />
        <Tabs.Screen name="customers/index"    options={{ href: null }} />
        <Tabs.Screen name="customers/add"      options={{ href: null }} />
        <Tabs.Screen name="customers/[id]"     options={{ href: null }} />
        <Tabs.Screen name="suppliers/index"    options={{ href: null }} />
        <Tabs.Screen name="suppliers/add"      options={{ href: null }} />
        <Tabs.Screen name="suppliers/[id]"     options={{ href: null }} />
        <Tabs.Screen name="expenses/index"     options={{ href: null }} />
        <Tabs.Screen name="pos/index"          options={{ href: null }} />
        <Tabs.Screen name="transactions/index" options={{ href: null }} />
        <Tabs.Screen name="social/index"       options={{ href: null }} />
        <Tabs.Screen name="content/index"      options={{ href: null }} />
        <Tabs.Screen name="news/index"         options={{ href: null }} />
        <Tabs.Screen name="newsletter/index"   options={{ href: null }} />
        <Tabs.Screen name="competitors/index"  options={{ href: null }} />
      </Tabs>

      <ProfileModal visible={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────
const tab = StyleSheet.create({
  bar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
    paddingTop: 6,
  },
  profileWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  profileBtn: {
    width: 42, height: 32, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  profileLabel: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  profileEmoji: { fontSize: 16 },
});

const pr = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 100, paddingRight: 16,
  },
  card: {
    width: 300, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${Colors.primary}20`, borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  email: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  role: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  sectionLabel: {
    fontSize: 9, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8,
  },
  emptyTxt: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  storeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: Radius.md, marginBottom: 4,
  },
  storeRowActive: { backgroundColor: `${Colors.primary}12` },
  storeIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  storeIconActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  storeName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  storeNameActive: { color: Colors.primary },
  storeRole: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  storeIconEmoji: { fontSize: 16 },
  checkEmoji: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: Radius.md,
    backgroundColor: `${Colors.danger}10`, borderWidth: 1, borderColor: `${Colors.danger}25`,
  },
  logoutEmoji: { fontSize: 16 },
  logoutTxt: { fontSize: 14, fontWeight: '700', color: Colors.danger },
});
