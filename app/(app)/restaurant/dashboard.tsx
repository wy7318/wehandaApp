import React, { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, SafeAreaView, Platform, View, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/app/Header';
import { BlinkNotification } from '@/components/notifications/BlinkNotification';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/contexts/RestaurantContext';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

// Configure notifications for Android
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function DashboardScreen() {
  const { selectedRestaurant } = useRestaurant();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'order' | 'booking' | null>(null);

  useEffect(() => {
    if (!selectedRestaurant) return;

    // Subscribe to new orders for the selected restaurant
    const orderChannel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${selectedRestaurant.id}`,
        },
        async () => {
          setNotificationMessage('New Order');
          setNotificationType('order');
          setShowNotification(true);

          // Show native notification on mobile
          if (Platform.OS !== 'web') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'New Order',
                body: 'You have received a new order',
                data: { type: 'order' },
              },
              trigger: null,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to new bookings for the selected restaurant
    const bookingChannel = supabase
      .channel('bookings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `restaurant_id=eq.${selectedRestaurant.id}`,
        },
        async () => {
          setNotificationMessage('New Reservation');
          setNotificationType('booking');
          setShowNotification(true);

          // Show native notification on mobile
          if (Platform.OS !== 'web') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'New Reservation',
                body: 'You have received a new reservation',
                data: { type: 'booking' },
              },
              trigger: null,
            });
          }
        }
      )
      .subscribe();

    // Set up notification response handler
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const type = response.notification.request.content.data.type;
        handleNotificationPress(type as 'order' | 'booking');
      }
    );

    return () => {
      orderChannel.unsubscribe();
      bookingChannel.unsubscribe();
      notificationSubscription.remove();
    };
  }, [selectedRestaurant]);

  const handleNotificationPress = (type: 'order' | 'booking') => {
    if (!selectedRestaurant) return;

    const baseUrl = 'https://admin.wehanda.com/restaurant';
    const path = type === 'order' ? 'orders' : 'bookings';
    const url = `${baseUrl}/${selectedRestaurant.id}/${path}`;

    if (Platform.OS === 'web') {
      window.location.href = url;
    } else {
      Linking.openURL(url);
    }
  };

  const handleDismissNotification = () => {
    if (!selectedRestaurant) return;
    handleNotificationPress(notificationType || 'order');
    setShowNotification(false);
    setNotificationMessage('');
    setNotificationType(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.webviewContainer}>
        <BlinkNotification
          visible={showNotification}
          onDismiss={handleDismissNotification}
          message={notificationMessage}
        />
        <WebView
          source={{ uri: 'https://admin.wehanda.com' }}
          style={styles.webview}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
});