import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRICS_ENABLED_KEY = 'biometrics_enabled';
const BIOMETRICS_SESSION_KEY = 'biometrics_session';

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
  }, []);

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
      await SecureStore.deleteItemAsync(BIOMETRICS_SESSION_KEY);
    }
    await supabase.auth.signOut();
  };

  const enableBiometrics = async () => {
    if (Platform.OS === 'web') {
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to enable biometric login',
      fallbackLabel: 'Use password',
    });
    
    if (result.success && isMounted.current) {
      await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, 'true');
      if (session) {
        await SecureStore.setItemAsync(BIOMETRICS_SESSION_KEY, JSON.stringify(session));
      }
      setBiometricsEnabled(true);
    }
  };

  const disableBiometrics = async () => {
    if (Platform.OS === 'web') {
      return;
    }

    if (isMounted.current) {
      await SecureStore.deleteItemAsync(BIOMETRICS_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRICS_SESSION_KEY);
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
        const storedSession = await SecureStore.getItemAsync(BIOMETRICS_SESSION_KEY);
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          const { data, error } = await supabase.auth.setSession(parsedSession);
          if (error) {
            return { error };
          }
          return { error: null };
        } else {
          return { error: new Error('No stored session found') };
        }
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