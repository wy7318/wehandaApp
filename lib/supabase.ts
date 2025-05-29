import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// In-memory storage fallback for non-browser environments
const memoryStorage = {
  storage: new Map(),
  getItem: (key: string): Promise<string | null> => {
    return Promise.resolve(memoryStorage.storage.get(key) || null);
  },
  setItem: (key: string, value: string): Promise<void> => {
    memoryStorage.storage.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    memoryStorage.storage.delete(key);
    return Promise.resolve();
  },
};

// Web-compatible storage adapter that checks for browser environment
const webStorage = typeof window !== 'undefined' ? {
  getItem: (key: string): Promise<string | null> => {
    return Promise.resolve(localStorage.getItem(key));
  },
  setItem: (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
} : memoryStorage;

// Use SecureStore for native platforms, localStorage for web, or memory storage for SSR
const storage = Platform.OS === 'web' ? webStorage : {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  created_date: string;
  modified_date: string;
}

export interface UserRestaurant {
  id: string;
  user_id: string;
  restaurant_id: string;
  role: string;
  created_at: string;
  updated_at: string;
  restaurant?: Restaurant;
}