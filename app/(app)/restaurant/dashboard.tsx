import React, { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, SafeAreaView, Platform, View, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/app/Header';
import { BlinkNotification } from '@/components/notifications/BlinkNotification';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/contexts/RestaurantContext';
import * as Linking from 'expo-linking';

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
        () => {
          setNotificationMessage('New Order');
          setNotificationType('order');
          setShowNotification(true);
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
        () => {
          setNotificationMessage('New Reservation');
          setNotificationType('booking');
          setShowNotification(true);
        }
      )
      .subscribe();

    return () => {
      orderChannel.unsubscribe();
      bookingChannel.unsubscribe();
    };
  }, [selectedRestaurant]);

  const handleDismissNotification = () => {
    if (!selectedRestaurant) return;

    const baseUrl = 'https://admin.wehanda.com/restaurant';
    const path = notificationType === 'order' ? 'orders' : 'bookings';
    const url = `${baseUrl}/${selectedRestaurant.id}/${path}`;

    if (Platform.OS === 'web') {
      window.location.href = url;
    } else {
      Linking.openURL(url);
    }

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