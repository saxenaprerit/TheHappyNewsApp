import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get Supabase URL and anon key from environment variables
// These should be set in .env file with EXPO_PUBLIC_ prefix
// Expo automatically makes EXPO_PUBLIC_* variables available at runtime
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or anon key is missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables or app.json'
  );
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});
