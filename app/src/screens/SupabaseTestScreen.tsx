import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

export default function SupabaseTestScreen() {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [message, setMessage] = useState<string>('Testing Supabase connection...');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setStatus('testing');
      setMessage('Connecting to Supabase...');

      // Query the articles table to test the connection
      const { data: result, error } = await supabase
        .from('articles')
        .select('*')
        .limit(1);

      if (error) {
        // Check if it's a "relation does not exist" error
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          setStatus('error');
          setMessage(
            'Connection successful! However, the articles table does not exist yet.\n\n' +
            'Please run the SQL schema from sql/schema.sql in your Supabase SQL Editor.'
          );
        } else {
          setStatus('error');
          setMessage(`Connection error: ${error.message}`);
        }
        return;
      }

      // Success! Table exists and query worked
      if (result && result.length > 0) {
        setStatus('success');
        setMessage('✅ Supabase connection successful! Found articles in database.');
        setData(result);
      } else {
        setStatus('success');
        setMessage('✅ Supabase connection successful! Articles table exists but is empty.');
        setData(null);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(`Unexpected error: ${err?.message || 'Unknown error'}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Supabase Connection Test</Text>
        
        {status === 'testing' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.message}>{message}</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.statusContainer}>
            <Text style={styles.successMessage}>{message}</Text>
            {data && (
              <View style={styles.dataContainer}>
                <Text style={styles.dataLabel}>Query Result:</Text>
                <Text style={styles.dataText}>{JSON.stringify(data, null, 2)}</Text>
              </View>
            )}
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusContainer}>
            <Text style={styles.errorMessage}>{message}</Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Connection Info:</Text>
          <Text style={styles.infoText}>
            • Supabase URL: {Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'Not configured'}
          </Text>
          <Text style={styles.infoText}>
            • Anon Key: {(Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ? 'Configured ✓' : 'Not configured'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  message: {
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  successMessage: {
    fontSize: 18,
    textAlign: 'center',
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 15,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ef4444',
    lineHeight: 24,
  },
  dataContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    width: '100%',
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  dataText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#1f2937',
  },
  infoContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1e40af',
  },
  infoText: {
    fontSize: 14,
    color: '#1e3a8a',
    marginBottom: 5,
  },
});
