

import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRICS_ENABLED_KEY = 'biometrics_enabled';
const BIOMETRICS_CREDENTIALS_KEY = 'biometrics_credentials';
const BIOMETRICS_REFRESH_TOKEN_KEY = 'biometrics_refresh_token';

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

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const checkBiometrics = async () => {
      if (Platform.OS !== 'web') {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (isMounted.current) {
          setHasBiometrics(compatible && enrolled);
          const enabled = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
          setBiometricsEnabled(enabled === 'true');
        }
      }
    };

    checkBiometrics();
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted.current) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          // Store refresh token when user signs in successfully
          if (event === 'SIGNED_IN' && session?.refresh_token && biometricsEnabled) {
            await SecureStore.setItemAsync(BIOMETRICS_REFRESH_TOKEN_KEY, session.refresh_token);
          }
        }
      }
    );

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
  }, [biometricsEnabled]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(BIOMETRICS_REFRESH_TOKEN_KEY);
    }
    await supabase.auth.signOut();
  };

  const enableBiometrics = async (email: string, password: string) => {
    if (Platform.OS === 'web') {
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to enable biometric login',
      fallbackLabel: 'Use password',
    });

    if (result.success && isMounted.current) {
      await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, 'true');

      // Store credentials securely (they're encrypted by SecureStore)
      const credentials = JSON.stringify({ email, password });
      await SecureStore.setItemAsync(BIOMETRICS_CREDENTIALS_KEY, credentials);

      setBiometricsEnabled(true);
    }
  };

  const disableBiometrics = async () => {
    if (Platform.OS === 'web') {
      return;
    }

    if (isMounted.current) {
      await SecureStore.deleteItemAsync(BIOMETRICS_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRICS_REFRESH_TOKEN_KEY);
      setBiometricsEnabled(false);
    }
  };

  const signInWithBiometrics = async () => {
    if (Platform.OS === 'web') {
      return { error: new Error('Biometric authentication not available on web') };
    }

    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
      if (enabled !== 'true') {
        return { error: new Error('Biometric authentication not enabled') };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to login',
        fallbackLabel: 'Use password',
      });

      if (result.success) {
        const storedCredentials = await SecureStore.getItemAsync(BIOMETRICS_CREDENTIALS_KEY);

        if (storedCredentials) {
          try {
            const { email, password } = JSON.parse(storedCredentials);

            // Use regular sign in with stored credentials
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            return { error };
          } catch (parseError) {
            await disableBiometrics();
            return { error: new Error('Invalid stored credentials. Please re-enable biometrics.') };
          }
        }

        return { error: new Error('No stored credentials found') };
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