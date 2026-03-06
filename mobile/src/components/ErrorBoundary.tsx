import React, { Component, type ReactNode } from 'react';
import { View, Text, Pressable, useColorScheme } from 'react-native';

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

function ErrorFallback({ error, onRetry }: { error?: Error; onRetry: () => void }) {
  const scheme = useColorScheme();
  const dark = scheme !== 'light';
  const bg = dark ? '#0a0a0f' : '#f5f5f5';
  const text = dark ? '#e5e5e5' : '#1a1a1a';
  const muted = dark ? '#666' : '#999';

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg, padding: 32 }}>
      <Text style={{ color: text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Something went wrong</Text>
      <Text style={{ color: muted, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>{error?.message || 'Unknown error'}</Text>
      <Pressable onPress={onRetry} style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, backgroundColor: dark ? '#1f1f2e' : '#e5e5e5' }}>
        <Text style={{ color: text, fontSize: 14, fontWeight: '600' }}>Retry</Text>
      </Pressable>
    </View>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
