import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function Index() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(app)/(tabs)/dashboard' as any);
      } else {
        router.replace('/(auth)/login' as any);
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
