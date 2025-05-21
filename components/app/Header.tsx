import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Modal } from 'react-native';
import { Colors, Spacing } from '@/constants/Colors';
import { User, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { ReservationCalendar } from '../restaurant/ReservationCalendar';

interface HeaderProps {
  showProfile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showProfile = true }) => {
  const router = useRouter();
  const { selectedRestaurant } = useRestaurant();
  const [showCalendar, setShowCalendar] = useState(false);

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {selectedRestaurant ? selectedRestaurant.name : 'Restaurant Manager'}
            </Text>
          </View>
          
          <View style={styles.actions}>
            {selectedRestaurant && (
              <>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setShowCalendar(true)}
                >
                  <Calendar size={24} color={Colors.neutral[800]} />
                </TouchableOpacity>
                <NotificationBell restaurantId={selectedRestaurant.id} />
              </>
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

      <Modal
        visible={showCalendar}
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reservations</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          {selectedRestaurant && (
            <ReservationCalendar restaurantId={selectedRestaurant.id} />
          )}
        </SafeAreaView>
      </Modal>
    </>
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
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.xs,
    borderRadius: 999,
    backgroundColor: Colors.neutral[200],
  },
  profileButton: {
    padding: Spacing.xs,
    borderRadius: 999,
    backgroundColor: Colors.neutral[200],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
  },
  closeButton: {
    padding: Spacing.sm,
  },
  closeButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.primary[600],
  },
});