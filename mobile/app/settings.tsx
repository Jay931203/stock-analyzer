import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
} from 'react-native';
import { useMemo } from 'react';
import api, { getBaseUrl, setBaseUrl } from '../src/api/client';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius, typography, type ThemeColors } from '../src/theme';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [showServer, setShowServer] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setBaseUrl(serverUrl);
    const ok = await api.health();
    setStatus(ok ? 'ok' : 'fail');
    setTesting(false);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Theme */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Theme</Text>
        <View style={s.row}>
          <Text style={s.rowLabel}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={isDark ? colors.textPrimary : '#ccc'}
          />
        </View>
      </View>

      {/* Server (collapsible) */}
      <View style={s.section}>
        <Pressable style={s.collapseHeader} onPress={() => setShowServer(!showServer)}>
          <Text style={s.sectionTitle}>Server</Text>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: status === 'ok' ? colors.success : status === 'fail' ? colors.bearish : colors.textMuted }]} />
            <Text style={s.chevron}>{showServer ? 'Hide' : 'Show'}</Text>
          </View>
        </Pressable>

        {showServer && (
          <>
            <View style={s.inputBox}>
              <TextInput
                style={s.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://localhost:8000"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <Pressable
              style={[s.testBtn, testing && { opacity: 0.5 }]}
              onPress={testConnection}
              disabled={testing}
            >
              <Text style={s.testBtnText}>{testing ? 'Testing...' : 'Test Connection'}</Text>
            </Pressable>

            {status === 'ok' && <Text style={s.okText}>Connected</Text>}
            {status === 'fail' && <Text style={s.failText}>Connection failed</Text>}

            <Text style={s.hint}>Common URLs:</Text>
            {[
              { label: 'Android Emulator', url: 'http://10.0.2.2:8000' },
              { label: 'iOS Simulator', url: 'http://localhost:8000' },
            ].map(({ label, url }) => (
              <Pressable key={label} style={s.urlRow} onPress={() => setServerUrl(url)}>
                <Text style={s.urlLabel}>{label}</Text>
                <Text style={s.urlValue}>{url}</Text>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { color: c.textPrimary, ...typography.bodyBold, marginBottom: spacing.md },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: c.bgCard, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: c.border,
  },
  rowLabel: { color: c.textSecondary, ...typography.body },
  hint: { color: c.textMuted, ...typography.labelSm, marginTop: spacing.sm },
  collapseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  chevron: { color: c.accent, fontSize: 12, fontWeight: '600' },
  inputBox: {
    backgroundColor: c.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: c.border, marginTop: spacing.md,
  },
  input: { paddingHorizontal: spacing.md, paddingVertical: 12, color: c.textPrimary, ...typography.body },
  testBtn: {
    backgroundColor: c.accentDim, borderRadius: radius.md, paddingVertical: 12,
    alignItems: 'center', marginTop: spacing.sm, borderWidth: 1, borderColor: c.accent,
  },
  testBtnText: { color: c.accent, ...typography.bodyBold },
  okText: { color: c.bullish, ...typography.bodySm, marginTop: spacing.sm },
  failText: { color: c.bearish, ...typography.bodySm, marginTop: spacing.sm },
  urlRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: c.bgCard, borderRadius: radius.sm, padding: spacing.sm,
    marginTop: spacing.xs, borderWidth: 1, borderColor: c.border,
  },
  urlLabel: { color: c.textTertiary, ...typography.labelSm },
  urlValue: { color: c.accent, ...typography.labelSm, fontFamily: 'monospace' },
});
