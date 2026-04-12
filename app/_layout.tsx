import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
  },
});

function AuthListener() {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    // Récupère la session existante au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Écoute les changements d'auth (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export default function RootLayout() {
  useFonts(Ionicons.font);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </QueryClientProvider>
  );
}
