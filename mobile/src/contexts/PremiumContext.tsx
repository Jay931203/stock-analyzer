import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Platform, Linking } from 'react-native';
import { useAuth } from './AuthContext';
import api from '../api/client';

export type PlanType = 'free' | 'pro' | 'api';

interface SubscriptionStatus {
  plan: PlanType;
  status: string;
  current_period_end?: string;
}

interface PremiumContextType {
  plan: PlanType;
  isPro: boolean;
  isApi: boolean;
  isLoading: boolean;
  showPaywall: () => void;
  hidePaywall: () => void;
  paywallVisible: boolean;
  refreshSubscription: () => Promise<void>;
  openCheckout: (plan: 'pro' | 'api') => Promise<void>;
  openPortal: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType>({
  plan: 'free',
  isPro: false,
  isApi: false,
  isLoading: true,
  showPaywall: () => {},
  hidePaywall: () => {},
  paywallVisible: false,
  refreshSubscription: async () => {},
  openCheckout: async () => {},
  openPortal: async () => {},
});

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [plan, setPlan] = useState<PlanType>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const isPro = plan === 'pro' || plan === 'api';
  const isApi = plan === 'api';

  const fetchSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setPlan('free');
      setIsLoading(false);
      return;
    }

    try {
      const status = await api.getSubscriptionStatus();
      const serverPlan = status.plan as PlanType;
      if (serverPlan === 'pro' || serverPlan === 'api') {
        setPlan(serverPlan);
      } else {
        setPlan('free');
      }
    } catch {
      // If billing endpoint doesn't exist yet or errors, default to free
      setPlan('free');
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  // Fetch on mount + auth changes
  useEffect(() => {
    setIsLoading(true);
    fetchSubscription();
  }, [fetchSubscription]);

  // Listen for focus events on web (user returns from Stripe checkout)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onFocus = () => {
      // Re-check subscription when user returns to tab (e.g., after Stripe checkout)
      if (session?.access_token) {
        fetchSubscription();
      }
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [session?.access_token, fetchSubscription]);

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  const openCheckout = useCallback(async (targetPlan: 'pro' | 'api') => {
    if (!session?.access_token) {
      // User not logged in — show paywall will handle the sign-in prompt
      return;
    }

    try {
      const { checkout_url } = await api.createCheckout(targetPlan);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(checkout_url, '_blank');
      } else {
        await Linking.openURL(checkout_url);
      }
    } catch (e: any) {
      console.error('Checkout error:', e.message);
    }
  }, [session?.access_token]);

  const openPortal = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const { portal_url } = await api.getBillingPortal();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(portal_url, '_blank');
      } else {
        await Linking.openURL(portal_url);
      }
    } catch (e: any) {
      console.error('Portal error:', e.message);
    }
  }, [session?.access_token]);

  const showPaywall = useCallback(() => {
    if (!isPro) setPaywallVisible(true);
  }, [isPro]);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  const value = useMemo(() => ({
    plan,
    isPro,
    isApi,
    isLoading,
    showPaywall,
    hidePaywall,
    paywallVisible,
    refreshSubscription,
    openCheckout,
    openPortal,
  }), [plan, isPro, isApi, isLoading, showPaywall, hidePaywall, paywallVisible, refreshSubscription, openCheckout, openPortal]);

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
