import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Config } from '@/constants/config';

// Sur web → localStorage (avec garde SSR), sur iOS/Android → SecureStore
const hasLocalStorage = typeof localStorage !== 'undefined';
const storage = Platform.OS === 'web'
  ? {
      getItem: (key: string) => Promise.resolve(hasLocalStorage ? localStorage.getItem(key) : null),
      setItem: (key: string, value: string) => Promise.resolve(hasLocalStorage ? localStorage.setItem(key, value) : undefined),
      removeItem: (key: string) => Promise.resolve(hasLocalStorage ? localStorage.removeItem(key) : undefined),
    }
  : {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    };

export const supabase = createClient(
  Config.supabaseUrl,
  Config.supabaseAnonKey,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
