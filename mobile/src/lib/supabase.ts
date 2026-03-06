import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://wmekpggsbkpxeavfesvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtZWtwZ2dzYmtweGVhdmZlc3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjcxODYsImV4cCI6MjA2NDkwMzE4Nn0.IBfhpTcjmFsNMRTEqLiiKvig6tJkTt1xYAyUKBfdr3c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: typeof window !== 'undefined',
  },
});
