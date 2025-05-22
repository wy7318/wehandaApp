import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Header } from '@/components/app/Header';
import { RestaurantSwitcher } from '@/components/app/RestaurantSwitcher';
import { ActivityCard, ActivityType } from '@/components/restaurant/ActivityCard';
import { Colors, Spacing } from '@/constants/Colors';
import { AnalyticsModal } from '@/components/restaurant/AnalyticsModal';

export default function RestaurantLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userRestaurants, selectRestaurant, selectedRestaurant } = useRestaurant();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsType, setAnalyticsType] = useState<'demand' | 'revenue'>('demand');

  useEffect(() => {
    // Find and select the restaurant by ID
    const restaurant = userRestaurants.find(r => r.restaurant?.id === id)?.restaurant;
    if (restaurant) {
      selectRestaurant(restaurant);
    }
  }, [id, userRestaurants]);

  const activities: ActivityType[] = [
    'waitlist',
    'dashboard',
    'reservations',
    'customers',
    'demand-analytics',
    'revenue-analytics',
    'table-order',
    'settings'
  ];

  const handleActivityPress = (activityType: ActivityType) => {
    if (activityType === 'demand-analytics') {
      setAnalyticsType('demand');
      setShowAnalytics(true);
    } else if (activityType === 'revenue-analytics') {
      setAnalyticsType('revenue');
      setShowAnalytics(true);
    } else if (activityType !== 'dashboard' && activityType !== 'waitlist' && activityType !== 'reservations' && activityType !== 'customers') {
      alert(`${activityType.charAt(0).toUpperCase() + activityType.slice(1).replace('-', ' ')} selected.`);
    }
  };

  if (!selectedRestaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading restaurant details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="customers" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="reservations" />
      </Stack>

      <Header />
      
      <View style={styles.content}>
        <RestaurantSwitcher />
        
        <Text style={styles.title}>Activities</Text>
        
        <FlatList
          data={activities}
          renderItem={({ item }) => (
            <ActivityCard
              type={item}
              onPress={() => handleActivityPress(item)}
              restaurantId={selectedRestaurant.id}
            />
          )}
          numColumns={2}
          contentContainerStyle={styles.activitiesContainer}
        />

        <AnalyticsModal
          visible={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          restaurantId={selectedRestaurant.id}
          type={analyticsType}
        />
      </View>
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
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: Colors.neutral[600],
  },
  activitiesContainer: {
    paddingBottom: Spacing.xl,
  },
});