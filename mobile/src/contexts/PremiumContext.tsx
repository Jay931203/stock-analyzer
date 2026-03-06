import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = 'premium_status';

interface PremiumContextType {
  isPremium: boolean;
  setPremium: (value: boolean) => void;
  showPaywall: () => void;
  hidePaywall: () => void;
  paywallVisible: boolean;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  setPremium: () => {},
  showPaywall: () => {},
  hidePaywall: () => {},
  paywallVisible: false,
});

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREMIUM_KEY).then(val => {
      if (val === 'true') setIsPremium(true);
    }).catch(() => {});
  }, []);

  const setPremium = useCallback((value: boolean) => {
    setIsPremium(value);
    AsyncStorage.setItem(PREMIUM_KEY, value ? 'true' : 'false').catch(() => {});
  }, []);

  const showPaywall = useCallback(() => {
    if (!isPremium) setPaywallVisible(true);
  }, [isPremium]);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  const value = useMemo(() => ({
    isPremium,
    setPremium,
    showPaywall,
    hidePaywall,
    paywallVisible,
  }), [isPremium, setPremium, showPaywall, hidePaywall, paywallVisible]);

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
