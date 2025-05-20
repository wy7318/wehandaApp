import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Mail, Lock, Fingerprint } from 'lucide-react-native';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithBiometrics, hasBiometrics, biometricsEnabled } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBiometrics, setShowBiometrics] = useState(false);

  useEffect(() => {
    // Check if biometrics can be shown
    const checkBiometrics = async () => {
      if (Platform.OS !== 'web' && hasBiometrics && biometricsEnabled) {
        setShowBiometrics(true);
      }
    };
    
    checkBiometrics();
  }, [hasBiometrics, biometricsEnabled]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        console.error('Sign in error:', signInError);
        if (signInError.message.includes('Failed to fetch')) {
          setError('Unable to connect to the server. Please check your internet connection.');
        } else {
          setError(signInError.message);
        }
      } else {
        router.replace('/(app)');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (Platform.OS === 'web') {
      setError('Biometric authentication is not available on web');
      return;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      const { error: biometricError } = await signInWithBiometrics();
      
      if (biometricError) {
        console.error('Biometric sign in error:', biometricError);
        setError(biometricError.message);
      } else {
        router.replace('/(app)');
      }
    } catch (err: any) {
      console.error('Biometric auth error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
    >
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <Input
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        leftIcon={<Mail size={20} color={Colors.neutral[500]} />}
      />
      
      <Input
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        showPasswordToggle
        leftIcon={<Lock size={20} color={Colors.neutral[500]} />}
      />
      
      <Button
        title="Sign In"
        onPress={handleLogin}
        isLoading={isLoading}
        fullWidth
        style={styles.loginButton}
      />
      
      {showBiometrics && (
        <TouchableOpacity
          style={styles.biometricsButton}
          onPress={handleBiometricAuth}
          disabled={isLoading}
        >
          <Fingerprint size={24} color={Colors.primary[600]} />
          <Text style={styles.biometricsText}>
            Sign in with {Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint'}
          </Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href="/register" asChild>
          <TouchableOpacity>
            <Text style={styles.linkText}>Register</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: Colors.error[50],
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error[300],
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.error[700],
  },
  loginButton: {
    marginTop: Spacing.md,
  },
  biometricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  biometricsText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.primary[600],
    marginLeft: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
  },
  linkText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.primary[600],
  },
});