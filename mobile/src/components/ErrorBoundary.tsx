import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const bg = isDark ? '#060612' : '#f4f5f9';
  const cardBg = isDark ? '#0f0f23' : '#ffffff';
  const textColor = isDark ? '#eaeaff' : '#1a1a2e';
  const mutedColor = isDark ? '#9090b0' : '#7a7a96';
  const btnBg = isDark ? '#1a1a36' : '#e8e9f0';
  const accentColor = isDark ? '#5c6bc0' : '#4a5ab8';
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: '#f4433630' }]}>
        <Text style={styles.icon}>!</Text>
        <Text style={[styles.title, { color: textColor }]}>Something went wrong</Text>
        <Text style={[styles.message, { color: mutedColor }]}>
          {error?.message ?? 'An unexpected error occurred'}
        </Text>
        <Pressable style={[styles.button, { backgroundColor: btnBg }]} onPress={onReset}>
          <Text style={[styles.buttonText, { color: accentColor }]}>Try Again</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    width: '85%' as any,
    maxWidth: 360,
  },
  icon: {
    color: '#f44336',
    fontSize: 32,
    fontWeight: '700',
    width: 56,
    height: 56,
    textAlign: 'center',
    lineHeight: 56,
    backgroundColor: '#f4433618',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
