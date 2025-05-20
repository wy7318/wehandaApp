import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/app/Header';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Fingerprint, Settings } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, hasBiometrics, biometricsEnabled, enableBiometrics, disableBiometrics } = useAuth();
  const [isEnablingBiometrics, setIsEnablingBiometrics] = useState(false);

  const handleBiometricsToggle = async (value: boolean) => {
    setIsEnablingBiometrics(true);
    try {
      if (value) {
        await enableBiometrics();
      } else {
        await disableBiometrics();
      }
    } catch (error) {
      console.error('Error toggling biometrics:', error);
    } finally {
      setIsEnablingBiometrics(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header showProfile={false} />
      
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>{user?.id}</Text>
          </View>
        </View>
        
        {hasBiometrics && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Authentication Settings</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Fingerprint size={20} color={Colors.neutral[700]} />
                <Text style={styles.settingLabel}>Biometric Login</Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleBiometricsToggle}
                disabled={isEnablingBiometrics}
                trackColor={{ false: Colors.neutral[300], true: Colors.primary[500] }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        )}
        
        <Button
          title="Sign Out"
          variant="outline"
          leftIcon={<LogOut size={18} color={Colors.primary[600]} />}
          onPress={handleSignOut}
          style={styles.signOutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[800],
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    paddingBottom: Spacing.sm,
  },
  infoLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
  },
  infoValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[900],
    maxWidth: '60%',
    textAlign: 'right',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[800],
    marginLeft: Spacing.sm,
  },
  signOutButton: {
    marginTop: Spacing.lg,
  },
});