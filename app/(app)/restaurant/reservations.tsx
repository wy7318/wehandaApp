import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Header } from '@/components/app/Header';
import { ReservationCalendar } from '@/components/restaurant/ReservationCalendar';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Colors } from '@/constants/Colors';

export default function ReservationsScreen() {
  const { selectedRestaurant } = useRestaurant();

  if (!selectedRestaurant) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ReservationCalendar restaurantId={selectedRestaurant.id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});