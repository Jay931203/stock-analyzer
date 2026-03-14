import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { usePremium } from '../contexts/PremiumContext';
import { spacing, radius, typography } from '../theme';

type AdSize = 'banner' | 'medium-rect' | 'inline';

interface AdSlotProps {
  size: AdSize;
  style?: ViewStyle;
}

const AD_HEIGHTS: Record<AdSize, number> = {
  banner: 90,
  'medium-rect': 250,
  inline: 100,
};

const AD_FORMATS: Record<AdSize, string> = {
  banner: 'horizontal',
  'medium-rect': 'rectangle',
  inline: 'fluid',
};

const ADSENSE_CLIENT_ID = 'ca-pub-5053429721285857';
const WEB_AD_SLOT_IDS: Record<AdSize, string | undefined> = {
  banner: process.env.EXPO_PUBLIC_ADSENSE_BANNER_SLOT,
  'medium-rect': process.env.EXPO_PUBLIC_ADSENSE_MEDIUM_RECT_SLOT,
  inline: process.env.EXPO_PUBLIC_ADSENSE_INLINE_SLOT,
};
const ADSENSE_SCRIPT_ID = 'stock-analyzer-adsense-script';
let adsenseScriptPromise: Promise<void> | null = null;

function loadAdSenseScript() {
  if (typeof document === 'undefined') return Promise.resolve();
  if ((window as any).adsbygoogle) return Promise.resolve();
  if (adsenseScriptPromise) return adsenseScriptPromise;

  adsenseScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(ADSENSE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('AdSense failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5053429721285857';
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('AdSense failed to load')), { once: true });
    document.head.appendChild(script);
  });

  return adsenseScriptPromise;
}

function WebAdSlot({ size }: { size: AdSize }) {
  const slotId = WEB_AD_SLOT_IDS[size];
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const adRequested = useRef(false);
  const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const canServeAds = Boolean(slotId) && !isLocalhost;

  useEffect(() => {
    if (!canServeAds) return undefined;
    const node = containerRef.current;
    if (!node) return;

    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setIsNearViewport(true);
            observer.disconnect();
          }
        }, { rootMargin: '320px 0px' })
      : null;

    if (observer) {
      observer.observe(node);
      return () => observer.disconnect();
    }

    setIsNearViewport(true);
    return undefined;
  }, [canServeAds]);

  useEffect(() => {
    if (!canServeAds) return undefined;
    if (!isNearViewport) return undefined;

    let cancelled = false;
    const requestIdle = (globalThis as any).requestIdleCallback;
    const scheduled = typeof requestIdle === 'function'
      ? requestIdle(() => {
          loadAdSenseScript().then(() => {
            if (!cancelled) setScriptReady(true);
          }).catch(() => {});
        }, { timeout: 2500 })
      : globalThis.setTimeout(() => {
          loadAdSenseScript().then(() => {
            if (!cancelled) setScriptReady(true);
          }).catch(() => {});
        }, 800);

    return () => {
      cancelled = true;
      if (typeof requestIdle === 'function') {
        const cancelIdle = (globalThis as any).cancelIdleCallback;
        if (typeof cancelIdle === 'function') cancelIdle(scheduled);
      } else {
        clearTimeout(scheduled);
      }
    };
  }, [canServeAds, isNearViewport]);

  useEffect(() => {
    if (!canServeAds) return;
    if (!scriptReady || !containerRef.current || adRequested.current) return;

    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
      adRequested.current = true;
    } catch {}
  }, [canServeAds, scriptReady]);

  if (!canServeAds) {
    return null;
  }

  return (
    <div ref={containerRef} style={{ textAlign: 'center', margin: '8px 16px' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: AD_HEIGHTS[size] }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format={AD_FORMATS[size]}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default function AdSlot({ size, style }: AdSlotProps) {
  const { colors } = useTheme();
  const { isPremium } = usePremium();

  if (isPremium) return null;

  // On web: render actual AdSense
  if (Platform.OS === 'web') {
    return <WebAdSlot size={size} />;
  }

  // On native: placeholder (AdMob integration later)
  const height = AD_HEIGHTS[size];
  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors.textMuted }]}>Ad</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  label: {
    ...typography.labelSm,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
});
