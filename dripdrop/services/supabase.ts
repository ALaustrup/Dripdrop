import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  // Keep runtime warning instead of hard crash so app can run with offline fallback.
  // Supabase calls should gracefully fail until env vars are configured.
  // eslint-disable-next-line no-console
  console.warn('Supabase environment variables are missing. Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

// Fallback placeholders prevent client-constructor crashes when env is missing.
const safeSupabaseUrl = hasSupabaseConfig ? supabaseUrl : 'https://example.supabase.co';
const safeSupabaseAnonKey = hasSupabaseConfig ? supabaseAnonKey : 'public-anon-placeholder';

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key: string): Promise<string | null> => {
        if (Platform.OS === 'web') {
          if (typeof window === 'undefined' || !window.localStorage) {
            return null;
          }
          return window.localStorage.getItem(key);
        }

        return SecureStore.getItemAsync(key);
      },
      setItem: async (key: string, value: string): Promise<void> => {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
          }
          return;
        }

        await SecureStore.setItemAsync(key, value);
      },
      removeItem: async (key: string): Promise<void> => {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
          }
          return;
        }

        await SecureStore.deleteItemAsync(key);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: { 'x-client-info': 'dripdrop-mobile' },
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
    return;
  }

  supabase.auth.stopAutoRefresh();
});

const SESSION_KEY = 'dripdrop-auth-session';

export function hasSupabaseEnv(): boolean {
  return hasSupabaseConfig;
}

export async function persistSessionSecurely(sessionJson: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SESSION_KEY, sessionJson);
    }
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, sessionJson);
}

export async function readPersistedSession(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(SESSION_KEY);
  }

  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function clearPersistedSession(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SESSION_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }
}

export async function signOutSession(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

type EnsureProfileInput = {
  email?: string;
  walletAddress?: string;
};

export async function ensureProfile(input: EnsureProfileInput): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const usernameFromEmail = input.email?.split('@')[0] ?? user.email?.split('@')[0] ?? `dripper_${user.id.slice(0, 8)}`;
  const profilePayload = {
    user_id: user.id,
    email: input.email ?? user.email ?? null,
    username: usernameFromEmail,
    wallet_address: input.walletAddress ?? null,
  };

  const { error } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'user_id' });
  if (error) {
    throw error;
  }
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (!session) {
    await clearPersistedSession();
    return;
  }

  await persistSessionSecurely(JSON.stringify(session));
});
