import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Modal, FlatList, SafeAreaView, Platform } from 'react-native';
import { Bell, X, Package, Calendar } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';

interface NotificationBellProps {
  restaurantId: string;
}

interface Notification {
  id: string;
  type: 'order' | 'booking';
  title: string;
  subtitle: string;
  timestamp: Date;
}

// Configure notifications for Android
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ restaurantId }) => {
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!restaurantId) return;

    // Subscribe to new orders
    const orderChannel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          setHasNewNotification(true);
          const newOrder = payload.new as any;
          const notification = {
            id: newOrder.id,
            type: 'order',
            title: 'New Order',
            subtitle: `Order #${newOrder.number}`,
            timestamp: new Date(newOrder.created_date),
          };

          addNotification(notification);

          // Show native notification on mobile
          if (Platform.OS !== 'web') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: notification.title,
                body: notification.subtitle,
                data: { type: 'order', id: notification.id },
              },
              trigger: null,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to new bookings
    const bookingChannel = supabase
      .channel('bookings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          setHasNewNotification(true);
          const newBooking = payload.new as any;
          const notification = {
            id: newBooking.id,
            type: 'booking',
            title: 'New Reservation',
            subtitle: `${newBooking.number_of_people} people at ${newBooking.time}`,
            timestamp: new Date(newBooking.created_date),
          };

          addNotification(notification);

          // Show native notification on mobile
          if (Platform.OS !== 'web') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: notification.title,
                body: notification.subtitle,
                data: { type: 'booking', id: notification.id },
              },
              trigger: null,
            });
          }
        }
      )
      .subscribe();

    // Set up notification response handler
    let notificationSubscription: any;
    if (Platform.OS !== 'web') {
      notificationSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const { type, id } = response.notification.request.content.data;
          // Handle notification tap
          console.log('Notification tapped:', type, id);
        }
      );
    }

    return () => {
      orderChannel.unsubscribe();
      bookingChannel.unsubscribe();
      if (notificationSubscription) {
        notificationSubscription.remove();
      }
    };
  }, [restaurantId]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
  };

  const handlePress = () => {
    setIsModalVisible(true);
    setHasNewNotification(false);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationIcon}>
        {item.type === 'order' ? (
          <Package size={24} color={Colors.primary[600]} />
        ) : (
          <Calendar size={24} color={Colors.secondary[600]} />
        )}
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationSubtitle}>{item.subtitle}</Text>
        <Text style={styles.notificationTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={handlePress}>
        <Bell size={24} color={Colors.neutral[800]} />
        {hasNewNotification && <View style={styles.indicator} />}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.notificationsList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xs,
    borderRadius: 999,
    backgroundColor: Colors.neutral[200],
    marginRight: Spacing.sm,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary[500],
    borderWidth: 2,
    borderColor: Colors.white,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: Colors.background,
    marginTop: 60,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
  },
  notificationsList: {
    padding: Spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIcon: {
    marginRight: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 4,
  },
  notificationTime: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: Colors.neutral[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
});