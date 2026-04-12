import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { session, user, isLoading, signOut, setSession } = useAuthStore();

  useEffect(() => {
    // Récupère la session existante au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Écoute les changements d'état d'auth (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, isLoading, signOut };
}
