import React, { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, SafeAreaView, Platform, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/app/Header';
import { BlinkNotification } from '@/components/notifications/BlinkNotification';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/contexts/RestaurantContext';

export default function DashboardScreen() {
  const { selectedRestaurant } = useRestaurant();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!selectedRestaurant) return;

    // Subscribe to new orders for the selected restaurant
    const channel = supabase
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
          setShowNotification(true);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedRestaurant]);

  const handleDismissNotification = () => {
    setShowNotification(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.webviewContainer}>
        <BlinkNotification
          visible={showNotification}
          onDismiss={handleDismissNotification}
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