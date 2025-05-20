import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Colors, Spacing } from '@/constants/Colors';
import { User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { NotificationBell } from '../notifications/NotificationBell';

interface HeaderProps {
  showProfile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showProfile = true }) => {
  const router = useRouter();
  const { selectedRestaurant } = useRestaurant();

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          {selectedRestaurant ? (
            <Text style={styles.title}>{selectedRestaurant.name}</Text>
          ) : (
            <Text style={styles.title}>Restaurant Manager</Text>
          )}
        </View>
        
        <View style={styles.actions}>
          {selectedRestaurant && (
            <NotificationBell restaurantId={selectedRestaurant.id} />
          )}
          {showProfile && (
            <TouchableOpacity
              style={styles.profileButton}
              onPress={handleProfilePress}
            >
              <User size={24} color={Colors.neutral[800]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    padding: Spacing.xs,
    borderRadius: 999,
    backgroundColor: Colors.neutral[200],
  },
});