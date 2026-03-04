import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

function InnerLayout() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgCard },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Stock Analyzer', headerShown: false }}
        />
        <Stack.Screen
          name="analyze/[ticker]"
          options={{ title: 'Analysis' }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: 'Settings' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <InnerLayout />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
