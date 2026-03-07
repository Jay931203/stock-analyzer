import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL = 'https://wmekpggsbkpxeavfesvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZWtwZ2dzYmtweGVhdmZlc3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjcxODYsImV4cCI6MjA2NDkwMzE4Nn0.IBfhpTcjmFsNMRTEqLiiKvig6tJkTt1xYAyUKBfdr3c';

// Web: use localStorage directly for Supabase compatibility
// Native: use AsyncStorage
const webStorage = typeof window !== 'undefined' ? {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
} : undefined;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: (Platform.OS === 'web' ? webStorage : AsyncStorage) as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
