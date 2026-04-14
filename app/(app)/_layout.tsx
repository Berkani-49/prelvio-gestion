import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useStore } from '@/hooks/useStore';

export default function AppLayout() {
  const { storeId, isLoading } = useStore();

  useEffect(() => {
    // Attend la fin du chargement avant de vérifier
    if (isLoading) return;
    // Si l'utilisateur n'a pas de boutique, redirige vers l'onboarding
    if (storeId === null) {
      router.replace('/(app)/setup' as any);
    }
  }, [storeId, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="setup" />
    </Stack>
  );
}
