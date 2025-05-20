import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRICS_ENABLED_KEY = 'biometrics_enabled';
const AUTH_SESSION_KEY = 'auth_session';

// Web storage adapter
const webStorage = {
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
};

// Storage helper functions
const getStorageItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return webStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

const setStorageItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    return webStorage.setItem(key, value);
  }
  return SecureStore.setItemAsync(key, value);
};

const removeStorageItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    return webStorage.removeItem(key);
  }
  return SecureStore.deleteItemAsync(key);
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  hasBiometrics: boolean;
  biometricsEnabled: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  signInWithBiometrics: () => Promise<{ error: any | null }>;
  enableBiometrics: () => Promise<void>;
  disableBiometrics: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Check for biometrics availability
  useEffect(() => {
    const checkBiometrics = async () => {
      // Only check biometrics on native platforms
      if (Platform.OS !== 'web') {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (isMounted.current) {
          setHasBiometrics(compatible && enrolled);
          const enabled = await getStorageItem(BIOMETRICS_ENABLED_KEY);
          setBiometricsEnabled(enabled === 'true');
        }
      }
    };
    
    checkBiometrics();
  }, []);

  // Listen for authentication changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted.current) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          // Store session if user is logged in and biometrics is enabled
          if (session && (await getStorageItem(BIOMETRICS_ENABLED_KEY)) === 'true') {
            await setStorageItem(AUTH_SESSION_KEY, JSON.stringify(session));
          }
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error) {
        // Get the current session after successful login
        const { data: { session } } = await supabase.auth.getSession();
        if (session && biometricsEnabled) {
          // Store the session securely
          await setStorageItem(AUTH_SESSION_KEY, JSON.stringify(session));
        }
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    if (Platform.OS !== 'web') {
      // Only remove the stored session if biometrics is disabled
      const enabled = await getStorageItem(BIOMETRICS_ENABLED_KEY);
      if (enabled !== 'true') {
        await removeStorageItem(AUTH_SESSION_KEY);
      }
    }
    await supabase.auth.signOut();
  };

  // Enable biometrics
  const enableBiometrics = async () => {
    if (Platform.OS === 'web') {
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to enable biometric login',
      fallbackLabel: 'Use password',
    });
    
    if (result.success && isMounted.current) {
      await setStorageItem(BIOMETRICS_ENABLED_KEY, 'true');
      // Store current session when enabling biometrics
      if (session) {
        await setStorageItem(AUTH_SESSION_KEY, JSON.stringify(session));
      }
      setBiometricsEnabled(true);
    }
  };

  // Disable biometrics
  const disableBiometrics = async () => {
    if (Platform.OS === 'web') {
      return;
    }

    if (isMounted.current) {
      await removeStorageItem(BIOMETRICS_ENABLED_KEY);
      await removeStorageItem(AUTH_SESSION_KEY);
      setBiometricsEnabled(false);
    }
  };

  // Sign in with biometrics
  const signInWithBiometrics = async () => {
    if (Platform.OS === 'web') {
      return { error: new Error('Biometric authentication not available on web') };
    }

    try {
      // Check if credentials are stored and biometrics is enabled
      const enabled = await getStorageItem(BIOMETRICS_ENABLED_KEY);
      if (enabled !== 'true') {
        return { error: new Error('Biometric authentication not enabled') };
      }

      // Get stored session
      const storedSession = await getStorageItem(AUTH_SESSION_KEY);
      if (!storedSession) {
        return { error: new Error('No stored session found') };
      }

      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to login',
        fallbackLabel: 'Use password',
      });

      if (result.success) {
        // Parse and use the stored session
        const sessionData = JSON.parse(storedSession);
        const { error } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
        
        if (error) {
          throw error;
        }
        
        return { error: null };
      } else {
        return { error: new Error('Biometric authentication failed') };
      }
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    hasBiometrics,
    biometricsEnabled,
    signIn,
    signOut,
    signInWithBiometrics,
    enableBiometrics,
    disableBiometrics,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};