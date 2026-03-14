import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radius, typography, shadows, type ThemeColors } from '../../theme';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INDIGO = '#4F46E5';
const INDIGO_LIGHT = '#6366F1';
const INDIGO_DARK = '#3730A3';
const INDIGO_DIM = 'rgba(79, 70, 229, 0.12)';

const STATS = [
  { value: '150+', label: 'Stocks Tracked' },
  { value: '12', label: 'Indicators Analyzed' },
  { value: '10yr', label: 'Historical Data' },
];

const STEPS = [
  {
    num: '01',
    title: 'Pick a Stock',
    desc: 'We analyze 12 technical indicators simultaneously — RSI, MACD, Bollinger Bands, volume patterns, and more.',
  },
  {
    num: '02',
    title: 'See the Probabilities',
    desc: 'Our engine finds every historical moment with matching technical conditions and calculates forward return probabilities.',
  },
  {
    num: '03',
    title: 'Decide with Confidence',
    desc: '3 strictness levels show you the trade-off between precision and sample size. More matches = more confidence.',
  },
];

const FEATURES = [
  {
    icon: '\u2699\uFE0F',
    title: 'Combined Probability Engine',
    desc: 'When RSI is oversold AND MACD just crossed AND price is near support — what happened historically?',
    tier: 'Pro',
  },
  {
    icon: '\uD83D\uDCE1',
    title: 'Signal Scanner',
    desc: '150+ stocks scanned every 15 minutes, ranked by signal strength and win rate.',
    tier: 'Free: Top 5',
  },
  {
    icon: '\u23F3',
    title: 'Signal Time Machine',
    desc: 'Go back to any date. See what the signal said. See what actually happened.',
    tier: 'Free',
  },
  {
    icon: '\uD83D\uDD14',
    title: 'Real-time Alerts',
    desc: 'Get notified when your conditions are met. Email and push notifications.',
    tier: 'Pro',
  },
  {
    icon: '\uD83D\uDCC8',
    title: 'Interactive Charts',
    desc: 'Candlestick charts with SMA overlays, signal markers, and historical comparison.',
    tier: 'Free',
  },
  {
    icon: '\uD83D\uDD27',
    title: 'Developer API',
    desc: 'REST API with 10,000 calls/day. Build your own trading tools on our data.',
    tier: 'API',
  },
];

interface PricingTier {
  name: string;
  price: string;
  period: string;
  popular: boolean;
  features: string[];
  cta: string;
}

const PRICING: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    popular: false,
    features: [
      '5 analyses per day',
      'Top 5 signals',
      'Signal Time Machine (unlimited)',
      'Basic interactive charts',
      'Community access',
    ],
    cta: 'Start Free',
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/mo',
    popular: true,
    features: [
      'Unlimited analyses',
      'Full signal scanner (150+ stocks)',
      'Combined probability engine',
      '5 custom alerts',
      'Priority support',
      'No ads',
    ],
    cta: 'Start Pro',
  },
  {
    name: 'API',
    price: '$49',
    period: '/mo',
    popular: false,
    features: [
      'Everything in Pro',
      'REST API access (10K calls/day)',
      'API key management',
      'Unlimited alerts',
      'Webhook notifications',
      'Dedicated support',
    ],
    cta: 'Start API',
  },
];

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function SectionLabel({ text, colors }: { text: string; colors: ThemeColors }) {
  return (
    <View style={{
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: radius.full,
      backgroundColor: INDIGO_DIM,
      marginBottom: spacing.md,
    }}>
      <Text style={{
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: INDIGO_LIGHT,
      }}>
        {text}
      </Text>
    </View>
  );
}

function SectionTitle({ text, colors }: { text: string; colors: ThemeColors }) {
  return (
    <Text style={{
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
    }}>
      {text}
    </Text>
  );
}

function TimeMachineCard({
  colors,
  date,
  ticker,
  signal,
  probability,
  result,
  resultColor,
  timeframe,
}: {
  colors: ThemeColors;
  date: string;
  ticker: string;
  signal: string;
  probability: string;
  result: string;
  resultColor: string;
  timeframe: string;
}) {
  return (
    <View style={{
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      ...shadows.card,
    }}>
      {/* Date header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
      }}>
        <View style={{
          backgroundColor: INDIGO_DIM,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.sm,
          marginRight: spacing.sm,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: INDIGO_LIGHT }}>{date}</Text>
        </View>
        <Text style={{
          fontSize: 20,
          fontWeight: '800',
          color: colors.textPrimary,
          letterSpacing: -0.5,
        }}>
          {ticker}
        </Text>
      </View>

      {/* Signal */}
      <Text style={{
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
      }}>
        {signal}
      </Text>
      <Text style={{
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
      }}>
        {probability}
      </Text>

      {/* Divider */}
      <View style={{
        height: 1,
        backgroundColor: colors.border,
        marginBottom: spacing.md,
      }} />

      {/* Result */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
            Actual Result ({timeframe})
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: resultColor, letterSpacing: -0.5 }}>
            {result}
          </Text>
        </View>
        <View style={{
          backgroundColor: 'rgba(34,197,94,0.12)',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radius.sm,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#22C55E' }}>
            Signal Correct
          </Text>
        </View>
      </View>
    </View>
  );
}

function FeatureCard({ colors, icon, title, desc, tier, isWide }: {
  colors: ThemeColors;
  icon: string;
  title: string;
  desc: string;
  tier: string;
  isWide: boolean;
}) {
  const tierColor = tier === 'Pro' ? INDIGO_LIGHT
    : tier === 'API' ? '#F59E0B'
    : '#22C55E';

  return (
    <View style={{
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      width: isWide ? '48%' as any : '100%',
      marginBottom: spacing.md,
      ...shadows.card,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={{ fontSize: 28 }}>{icon}</Text>
        <View style={{
          backgroundColor: `${tierColor}18`,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.sm,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: tierColor, letterSpacing: 0.3 }}>
            {tier.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={{
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 6,
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 20,
      }}>
        {desc}
      </Text>
    </View>
  );
}

function PricingCard({ colors, tier, isWide, onPress }: {
  colors: ThemeColors;
  tier: PricingTier;
  isWide: boolean;
  onPress: () => void;
}) {
  const isPopular = tier.popular;
  return (
    <View style={{
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      borderWidth: isPopular ? 2 : 1,
      borderColor: isPopular ? INDIGO : colors.border,
      padding: spacing.xl,
      paddingTop: isPopular ? spacing.xxl : spacing.xl,
      width: isWide ? '32%' as any : '100%',
      marginBottom: isWide ? 0 : spacing.md,
      position: 'relative',
      ...shadows.card,
    }}>
      {isPopular && (
        <View style={{
          position: 'absolute',
          top: -13,
          alignSelf: 'center',
          backgroundColor: INDIGO,
          paddingHorizontal: 14,
          paddingVertical: 4,
          borderRadius: radius.full,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 }}>
            MOST POPULAR
          </Text>
        </View>
      )}

      <Text style={{
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
      }}>
        {tier.name}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.lg }}>
        <Text style={{
          fontSize: 36,
          fontWeight: '800',
          color: colors.textPrimary,
          letterSpacing: -1,
        }}>
          {tier.price}
        </Text>
        {tier.period ? (
          <Text style={{ fontSize: 15, color: colors.textSecondary, marginLeft: 2 }}>
            {tier.period}
          </Text>
        ) : null}
      </View>

      {tier.features.map((f, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
          <Text style={{ fontSize: 14, color: '#22C55E', marginRight: 8, marginTop: 1 }}>
            {'\u2713'}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1, lineHeight: 20 }}>
            {f}
          </Text>
        </View>
      ))}

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={tier.cta}
        style={({ pressed }) => ({
          backgroundColor: isPopular ? INDIGO : 'transparent',
          borderWidth: isPopular ? 0 : 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingVertical: 14,
          alignItems: 'center',
          marginTop: spacing.lg,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{
          fontSize: 15,
          fontWeight: '700',
          color: isPopular ? '#fff' : colors.textPrimary,
        }}>
          {tier.cta}
        </Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function LandingPage({ onSignUp, onSignIn }: LandingPageProps) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;
  const contentMaxWidth = 1100;
  const horizontalPad = isDesktop ? 40 : isTablet ? 28 : 18;
  const sectionSpacing = isDesktop ? 80 : 56;

  const scrollToDemo = useCallback(() => {
    // Scroll to the time machine section
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const el = document.getElementById('time-machine-demo');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    // Fallback: scroll a fixed amount
    scrollRef.current?.scrollTo({ y: 700, animated: true });
  }, []);

  const containerStyle = useMemo(() => ({
    maxWidth: contentMaxWidth,
    width: '100%' as any,
    alignSelf: 'center' as const,
    paddingHorizontal: horizontalPad,
  }), [horizontalPad]);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ============================================================ */}
      {/*  NAV BAR                                                      */}
      {/* ============================================================ */}
      <View style={{
        paddingTop: Platform.OS === 'web' ? 0 : 48,
        backgroundColor: colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View style={{
          ...containerStyle,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
            letterSpacing: -0.3,
          }}>
            Stock Scanner
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={onSignIn}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={onSignUp}
              accessibilityRole="button"
              accessibilityLabel="Try free"
              style={({ pressed }) => ({
                backgroundColor: INDIGO,
                paddingHorizontal: 18,
                paddingVertical: 9,
                borderRadius: radius.md,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                Try Free
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/*  HERO SECTION                                                 */}
      {/* ============================================================ */}
      <View style={{
        paddingTop: isDesktop ? 80 : 48,
        paddingBottom: isDesktop ? 64 : 40,
        backgroundColor: colors.bg,
      }}>
        <View style={containerStyle}>
          <Text style={{
            fontSize: isDesktop ? 48 : isTablet ? 38 : 30,
            fontWeight: '800',
            color: colors.textPrimary,
            textAlign: 'center',
            letterSpacing: -1.2,
            lineHeight: isDesktop ? 56 : isTablet ? 46 : 38,
            marginBottom: spacing.lg,
            maxWidth: 720,
            alignSelf: 'center',
          }}>
            Know What the Market Did Before — See What It Might Do Next
          </Text>

          <Text style={{
            fontSize: isDesktop ? 18 : 15,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: isDesktop ? 28 : 24,
            maxWidth: 560,
            alignSelf: 'center',
            marginBottom: spacing.xxl,
          }}>
            AI-powered signal analysis backed by 10 years of historical data.{'\n'}
            Not predictions — probabilities.
          </Text>

          {/* CTAs */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginBottom: isDesktop ? 56 : 40,
            flexWrap: 'wrap',
          }}>
            <Pressable
              onPress={onSignUp}
              accessibilityRole="button"
              accessibilityLabel="Try free"
              style={({ pressed }) => ({
                backgroundColor: INDIGO,
                paddingHorizontal: 28,
                paddingVertical: 14,
                borderRadius: radius.md,
                opacity: pressed ? 0.85 : 1,
                ...shadows.card,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                Try Free
              </Text>
            </Pressable>
            <Pressable
              onPress={scrollToDemo}
              accessibilityRole="button"
              accessibilityLabel="See how it works"
              style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 28,
                paddingVertical: 14,
                borderRadius: radius.md,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
                See How It Works
              </Text>
            </Pressable>
          </View>

          {/* Stats bar */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: isDesktop ? 48 : 24,
            flexWrap: 'wrap',
          }}>
            {STATS.map((s, i) => (
              <View key={i} style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: isDesktop ? 28 : 22,
                  fontWeight: '800',
                  color: INDIGO_LIGHT,
                  letterSpacing: -0.5,
                }}>
                  {s.value}
                </Text>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: colors.textTertiary,
                  marginTop: 2,
                }}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/*  SIGNAL TIME MACHINE DEMO                                     */}
      {/* ============================================================ */}
      <View
        {...(Platform.OS === 'web' ? { nativeID: 'time-machine-demo' } : {})}
        style={{
          paddingVertical: sectionSpacing,
          backgroundColor: isDark ? '#0a0a1e' : '#eef0f6',
        }}
      >
        <View style={containerStyle}>
          <SectionLabel text="The Killer Feature" colors={colors} />
          <SectionTitle text="Signal Time Machine" colors={colors} />
          <Text style={{
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
            maxWidth: 520,
            alignSelf: 'center',
            marginBottom: spacing.xxl + 8,
          }}>
            Verify before you trust. Go back to any date, see what the signal said, then check what actually happened.
          </Text>

          <View style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: spacing.lg,
          }}>
            <View style={{ flex: 1 }}>
              <TimeMachineCard
                colors={colors}
                date="March 23, 2020"
                ticker="AAPL"
                signal="Oversold Bounce"
                probability="92% win rate (5 of 6 historical matches)"
                result="+108%"
                resultColor="#22C55E"
                timeframe="6 months"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TimeMachineCard
                colors={colors}
                date="January 3, 2022"
                ticker="NVDA"
                signal="Overbought Warning"
                probability="78% bearish probability (7 of 9 matches)"
                result="-52%"
                resultColor="#EF4444"
                timeframe="10 months"
              />
            </View>
          </View>

          <Pressable
            onPress={onSignUp}
            accessibilityRole="button"
            accessibilityLabel="Explore the Time Machine"
            style={({ pressed }) => ({
              alignSelf: 'center',
              marginTop: spacing.xl,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: INDIGO,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: INDIGO_LIGHT }}>
              Explore the Time Machine yourself — it's free
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                 */}
      {/* ============================================================ */}
      <View style={{ paddingVertical: sectionSpacing, backgroundColor: colors.bg }}>
        <View style={containerStyle}>
          <SectionLabel text="How It Works" colors={colors} />
          <SectionTitle text="Three Steps to Smarter Decisions" colors={colors} />

          <View style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: spacing.lg,
            marginTop: spacing.xl,
          }}>
            {STEPS.map((step) => (
              <View key={step.num} style={{
                flex: 1,
                backgroundColor: colors.bgCard,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.xl,
                ...shadows.card,
              }}>
                <Text style={{
                  fontSize: 36,
                  fontWeight: '800',
                  color: `${INDIGO_LIGHT}30`,
                  marginBottom: spacing.sm,
                }}>
                  {step.num}
                </Text>
                <Text style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: colors.textPrimary,
                  marginBottom: 8,
                }}>
                  {step.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  lineHeight: 22,
                }}>
                  {step.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/*  FEATURE GRID                                                 */}
      {/* ============================================================ */}
      <View style={{
        paddingVertical: sectionSpacing,
        backgroundColor: isDark ? '#0a0a1e' : '#eef0f6',
      }}>
        <View style={containerStyle}>
          <SectionLabel text="Features" colors={colors} />
          <SectionTitle text="Everything You Need to Trade Smarter" colors={colors} />

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: isDesktop ? 'space-between' : 'center',
            gap: spacing.md,
            marginTop: spacing.xl,
          }}>
            {FEATURES.map((f, i) => (
              <FeatureCard
                key={i}
                colors={colors}
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                tier={f.tier}
                isWide={isDesktop}
              />
            ))}
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/*  PRICING                                                      */}
      {/* ============================================================ */}
      <View style={{ paddingVertical: sectionSpacing, backgroundColor: colors.bg }}>
        <View style={containerStyle}>
          <SectionLabel text="Pricing" colors={colors} />
          <SectionTitle text="Start Free, Upgrade When Ready" colors={colors} />
          <Text style={{
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: spacing.xxl + 8,
            lineHeight: 24,
          }}>
            No credit card required. The free tier includes Signal Time Machine with no limits.
          </Text>

          <View style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: spacing.lg,
            alignItems: isDesktop ? 'flex-start' : 'stretch',
            justifyContent: 'center',
          }}>
            {PRICING.map((tier) => (
              <PricingCard
                key={tier.name}
                colors={colors}
                tier={tier}
                isWide={isDesktop}
                onPress={onSignUp}
              />
            ))}
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/*  TRUST / DISCLAIMER                                           */}
      {/* ============================================================ */}
      <View style={{
        paddingVertical: sectionSpacing,
        backgroundColor: isDark ? '#0a0a1e' : '#eef0f6',
      }}>
        <View style={containerStyle}>
          <View style={{
            backgroundColor: colors.bgCard,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: isDesktop ? 40 : spacing.xl,
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 17,
              fontWeight: '700',
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: spacing.md,
            }}>
              Built by traders, for traders
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
              maxWidth: 540,
              marginBottom: spacing.lg,
            }}>
              This is a screening and analysis tool, not investment advice. Past performance does not guarantee future results. Always do your own research before making trading decisions.
            </Text>
            <View style={{
              flexDirection: 'row',
              gap: spacing.lg,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.location.href = '/terms';
                  }
                }}
                accessibilityRole="link"
                accessibilityLabel="Terms of Service"
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: INDIGO_LIGHT }}>
                  Terms of Service
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.location.href = '/privacy';
                  }
                }}
                accessibilityRole="link"
                accessibilityLabel="Privacy Policy"
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: INDIGO_LIGHT }}>
                  Privacy Policy
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <View style={{
        paddingVertical: spacing.xxl,
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}>
        <View style={{
          ...containerStyle,
          flexDirection: isDesktop ? 'row' : 'column',
          justifyContent: 'space-between',
          alignItems: isDesktop ? 'flex-start' : 'center',
          gap: spacing.xl,
        }}>
          {/* Brand */}
          <View style={{ alignItems: isDesktop ? 'flex-start' : 'center' }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '800',
              color: colors.textPrimary,
              marginBottom: 6,
            }}>
              Stock Scanner
            </Text>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {'\u00A9'} 2026 Stock Scanner. All rights reserved.
            </Text>
          </View>

          {/* Links row */}
          <View style={{
            flexDirection: 'row',
            gap: isDesktop ? 48 : 28,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {/* Product */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                Product
              </Text>
              {['Features', 'Pricing', 'API Docs'].map((label) => (
                <Pressable key={label} accessibilityRole="link" accessibilityLabel={label}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Legal */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                Legal
              </Text>
              {[
                { label: 'Terms', href: '/terms' },
                { label: 'Privacy', href: '/privacy' },
                { label: 'Disclaimer', href: undefined },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="link"
                  accessibilityLabel={item.label}
                  onPress={() => {
                    if (item.href && Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.location.href = item.href;
                    }
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
