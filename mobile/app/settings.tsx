import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import api, { getBaseUrl, setBaseUrl } from '../src/api/client';

export default function SettingsScreen() {
  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  const testConnection = async () => {
    setTesting(true);
    setBaseUrl(serverUrl);
    const ok = await api.health();
    setStatus(ok ? 'ok' : 'fail');
    setTesting(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Server Connection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Connection</Text>
        <Text style={styles.description}>
          Enter the URL of your Stock Analyzer API server.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://localhost:8000"
            placeholderTextColor="#444"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <Pressable
          style={[styles.testBtn, testing && styles.testBtnDisabled]}
          onPress={testConnection}
          disabled={testing}
        >
          <Text style={styles.testBtnText}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Text>
        </Pressable>

        {status === 'ok' && (
          <View style={[styles.statusBanner, styles.statusOk]}>
            <View style={[styles.statusDot, { backgroundColor: '#4caf50' }]} />
            <Text style={styles.statusOkText}>Connected successfully</Text>
          </View>
        )}
        {status === 'fail' && (
          <View style={[styles.statusBanner, styles.statusFail]}>
            <View style={[styles.statusDot, { backgroundColor: '#f44336' }]} />
            <Text style={styles.statusFailText}>
              Connection failed. Check URL and server status.
            </Text>
          </View>
        )}
      </View>

      {/* Common URLs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Common URLs</Text>
        {[
          { label: 'Android Emulator', url: 'http://10.0.2.2:8000' },
          { label: 'iOS Simulator', url: 'http://localhost:8000' },
          { label: 'Same WiFi', url: 'http://YOUR_IP:8000' },
        ].map(({ label, url }) => (
          <Pressable
            key={label}
            style={styles.urlCard}
            onPress={() => setServerUrl(url)}
          >
            <Text style={styles.urlLabel}>{label}</Text>
            <Text style={styles.urlValue}>{url}</Text>
          </Pressable>
        ))}
      </View>

      {/* Server instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Starting the Server</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            cd stock-overlay{'\n'}
            python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: '#666',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputContainer: {
    backgroundColor: '#12122a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e3e',
    marginBottom: 12,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  testBtn: {
    backgroundColor: '#1a3a5c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  testBtnDisabled: {
    opacity: 0.5,
  },
  testBtnText: {
    color: '#6c9bd1',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOk: {
    backgroundColor: '#4caf5012',
    borderWidth: 1,
    borderColor: '#4caf5030',
  },
  statusOkText: {
    color: '#4caf50',
    fontSize: 14,
  },
  statusFail: {
    backgroundColor: '#f4433612',
    borderWidth: 1,
    borderColor: '#f4433630',
  },
  statusFailText: {
    color: '#f44336',
    fontSize: 13,
    flex: 1,
  },
  urlCard: {
    backgroundColor: '#12122a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e1e3e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urlLabel: {
    color: '#999',
    fontSize: 13,
  },
  urlValue: {
    color: '#6c9bd1',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  codeBlock: {
    backgroundColor: '#12122a',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e3e',
  },
  codeText: {
    color: '#6c9bd1',
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 22,
  },
});
