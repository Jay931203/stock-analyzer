import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearAnalysisCache } from '../api/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // On web, manually detect OAuth tokens in URL hash
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { data } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (mounted && data.session) {
              setSession(data.session);
              setLoading(false);
              // Clean URL hash
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }
          }
        }
      }

      // Fallback: recover session from storage
      const { data: { session: s } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(s);
        setLoading(false);
      }
    }

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS === 'web') {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/`
        : undefined;
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
    } else {
      // For native apps, use a different flow (expo-auth-session)
      // TODO: implement native Google sign-in
      console.warn('Native Google sign-in not yet implemented');
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearAnalysisCache();
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    signInWithGoogle,
    signOut,
  }), [session, loading, signInWithGoogle, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
