import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/app/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Fingerprint, Lock, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, hasBiometrics, biometricsEnabled, enableBiometrics, disableBiometrics } = useAuth();
  const [isEnablingBiometrics, setIsEnablingBiometrics] = useState(false);
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [displayFullName, setDisplayFullName] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setDisplayFullName(data.full_name || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      setDisplayFullName(fullName.trim());
      setFullName('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email!,
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      Alert.alert('Success', 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsChangingPassword(false);
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

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{displayFullName || 'Not set'}</Text>
          </View>

          <Input
            label="Update Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            leftIcon={<User size={20} color={Colors.neutral[500]} />}
          />

          <Button
            title="Update Profile"
            onPress={handleUpdateProfile}
            isLoading={isUpdatingProfile}
            style={styles.updateButton}
          />
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Change Password</Text>
          
          <Input
            label="Current Password"
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            showPasswordToggle
            leftIcon={<Lock size={20} color={Colors.neutral[500]} />}
          />

          <Input
            label="New Password"
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            showPasswordToggle
            leftIcon={<Lock size={20} color={Colors.neutral[500]} />}
          />

          <Input
            label="Confirm New Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            showPasswordToggle
            leftIcon={<Lock size={20} color={Colors.neutral[500]} />}
          />

          <Button
            title="Change Password"
            onPress={handleChangePassword}
            isLoading={isChangingPassword}
            style={styles.updateButton}
          />
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
  updateButton: {
    marginTop: Spacing.md,
  },
  signOutButton: {
    marginTop: Spacing.lg,
  },
});