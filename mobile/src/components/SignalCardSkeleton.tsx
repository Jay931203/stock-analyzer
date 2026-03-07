import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { radius, spacing } from '../theme';

export default function SignalCardSkeleton() {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.card, {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      opacity: anim,
    }]}>
      <View style={[styles.line, { backgroundColor: colors.bgElevated, width: 50 }]} />
      <View style={[styles.line, { backgroundColor: colors.bgElevated, width: 80, marginTop: 4 }]} />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={[styles.line, { backgroundColor: colors.bgElevated, width: 60, height: 24, marginTop: 8 }]} />
      <View style={[styles.line, { backgroundColor: colors.bgElevated, width: 70, marginTop: 8 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 156, minHeight: 160, borderRadius: 12, padding: 14,
    borderWidth: 1, marginRight: 10,
  },
  line: { height: 12, borderRadius: 4 },
  divider: { height: 1, marginVertical: 8 },
});
