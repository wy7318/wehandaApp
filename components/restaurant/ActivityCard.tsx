import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/Colors';
import { ClipboardList, LayoutDashboard, Utensils, Settings, Calendar, Users, ChartLine, Megaphone, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { WaitlistModal } from './WaitlistModal';
import { RestaurantSettings } from './RestaurantSettings';
import { useRestaurant } from '@/contexts/RestaurantContext';

export type ActivityType = 'waitlist' | 'dashboard' | 'table-order' | 'settings' | 'reservations' | 'customers' | 'analytics' | 'marketing';

interface ActivityCardProps {
  type: ActivityType;
  onPress: () => void;
  restaurantId: string;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  type,
  onPress,
  restaurantId,
}) => {
  const router = useRouter();
  const { selectedRestaurant, fetchUserRestaurants } = useRestaurant();
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handlePress = () => {
    if (type === 'dashboard') {
      router.push('/restaurant/dashboard');
    } else if (type === 'waitlist') {
      setShowWaitlist(true);
    } else if (type === 'settings') {
      setShowSettings(true);
    } else if (type === 'reservations') {
      router.push('/restaurant/reservations');
    } else if (type === 'customers') {
      router.push(`/restaurant/${restaurantId}/customers`);
    } else if (type === 'marketing') {
      router.push(`/restaurant/${restaurantId}/marketing`);
    } else {
      onPress();
    }
  };

  const getActivityIcon = () => {
    switch (type) {
      case 'waitlist':
        return <ClipboardList size={24} color={Colors.white} />;
      case 'dashboard':
        return <LayoutDashboard size={24} color={Colors.white} />;
      case 'table-order':
        return <Utensils size={24} color={Colors.white} />;
      case 'settings':
        return <Settings size={24} color={Colors.white} />;
      case 'reservations':
        return <Calendar size={24} color={Colors.white} />;
      case 'customers':
        return <Users size={24} color={Colors.white} />;
      case 'analytics':
        return <ChartLine size={24} color={Colors.white} />;
      case 'marketing':
        return <Megaphone size={24} color={Colors.white} />;
    }
  };

  const getActivityTitle = () => {
    switch (type) {
      case 'waitlist':
        return 'Waitlist';
      case 'dashboard':
        return 'Dashboard';
      case 'table-order':
        return 'Table Order';
      case 'settings':
        return 'Settings';
      case 'reservations':
        return 'Reservations';
      case 'customers':
        return 'Customers';
      case 'analytics':
        return 'Analytics';
      case 'marketing':
        return 'Marketing';
    }
  };

  const getActivityColor = () => {
    switch (type) {
      case 'waitlist':
        return Colors.accent[600];
      case 'dashboard':
        return Colors.primary[600];
      case 'table-order':
        return Colors.secondary[600];
      case 'settings':
        return Colors.neutral[700];
      case 'reservations':
        return Colors.primary[700];
      case 'customers':
        return Colors.success[600];
      case 'analytics':
        return Colors.primary[800];
      case 'marketing':
        return Colors.accent[700];
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: getActivityColor() }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>{getActivityIcon()}</View>
        <Text style={styles.title}>{getActivityTitle()}</Text>
      </TouchableOpacity>

      <WaitlistModal
        visible={showWaitlist}
        onClose={() => setShowWaitlist(false)}
        restaurantId={restaurantId}
      />

      <Modal
        visible={showSettings}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Restaurant Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <X size={24} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          {selectedRestaurant && (
            <RestaurantSettings
              restaurant={selectedRestaurant}
              onUpdate={() => {
                fetchUserRestaurants();
                setShowSettings(false);
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minHeight: 130,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    margin: Spacing.xs,
    flex: 1,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    backgroundColor: Colors.white,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
  },
});