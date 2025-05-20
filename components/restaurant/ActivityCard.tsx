import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/Colors';
import { ClipboardList, LayoutDashboard, Utensils, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { WaitlistModal } from './WaitlistModal';

export type ActivityType = 'waitlist' | 'dashboard' | 'table-order' | 'settings';

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
  const [showWaitlist, setShowWaitlist] = useState(false);

  const handlePress = () => {
    if (type === 'dashboard') {
      router.push('/restaurant/dashboard');
    } else if (type === 'waitlist') {
      setShowWaitlist(true);
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
});