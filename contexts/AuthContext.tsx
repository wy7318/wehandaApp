import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRICS_ENABLED_KEY = 'biometrics_enabled';

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
      try {
        // Only check biometrics on native platforms
        if (Platform.OS !== 'web') {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          
          if (isMounted.current) {
            setHasBiometrics(compatible && enrolled);
            const enabled = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
            setBiometricsEnabled(enabled === 'true');
          }
        }
      } catch (error) {
        console.error('Error checking biometrics:', error);
      }
    };
    
    checkBiometrics();
  }, []);

  // Listen for authentication changes
  useEffect(() => {
    let authListener: { subscription: { unsubscribe: () => void; }; } | null = null;

    const setupAuthListener = async () => {
      try {
        // Initial session check
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (isMounted.current) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
        }

        // Set up the auth state change listener
        const { data: listener } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (isMounted.current) {
              setSession(newSession);
              setUser(newSession?.user ?? null);
              setLoading(false);
            }
          }
        );
        authListener = listener;
      } catch (error) {
        console.error('Error setting up auth listener:', error);
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    setupAuthListener();

    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Sign in with email and password
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

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Enable biometrics (native only)
  const enableBiometrics = async () => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric login',
        fallbackLabel: 'Use password',
      });
      
      if (result.success && isMounted.current) {
        await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, 'true');
        setBiometricsEnabled(true);
      }
    } catch (error) {
      console.error('Error enabling biometrics:', error);
    }
  };

  // Disable biometrics (native only)
  const disableBiometrics = async () => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      if (isMounted.current) {
        await SecureStore.deleteItemAsync(BIOMETRICS_ENABLED_KEY);
        setBiometricsEnabled(false);
      }
    } catch (error) {
      console.error('Error disabling biometrics:', error);
    }
  };

  // Sign in with biometrics (native only)
  const signInWithBiometrics = async () => {
    if (Platform.OS === 'web') {
      return { error: new Error('Biometric authentication not available on web') };
    }

    try {
      // Check if credentials are stored and biometrics is enabled
      const enabled = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
      if (enabled !== 'true') {
        return { error: new Error('Biometric authentication not enabled') };
      }

      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to login',
        fallbackLabel: 'Use password',
      });

      if (result.success) {
        // Automatically sign in using the stored session
        const { data, error } = await supabase.auth.getSession();
        
        if (data?.session) {
          return { error: null };
        } else {
          return { error: new Error('No active session found') };
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