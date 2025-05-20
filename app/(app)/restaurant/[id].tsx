import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { Header } from '@/components/app/Header';
import { RestaurantSwitcher } from '@/components/app/RestaurantSwitcher';
import { ActivityCard, ActivityType } from '@/components/restaurant/ActivityCard';
import { Colors, Spacing } from '@/constants/Colors';

export default function RestaurantDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userRestaurants, selectRestaurant, selectedRestaurant } = useRestaurant();

  useEffect(() => {
    // Find and select the restaurant by ID
    const restaurant = userRestaurants.find(r => r.restaurant?.id === id)?.restaurant;
    if (restaurant) {
      selectRestaurant(restaurant);
    }
  }, [id, userRestaurants]);

  const activities: ActivityType[] = ['waitlist', 'dashboard', 'table-order', 'settings'];

  const handleActivityPress = (activityType: ActivityType) => {
    // For this MVP, we're just showing a message for non-dashboard activities
    if (activityType !== 'dashboard') {
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
      <Header />
      
      <View style={styles.content}>
        <RestaurantSwitcher />
        
        <Text style={styles.title}>Activities</Text>
        
        <FlatList
          data={activities}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <ActivityCard
              type={item}
              onPress={() => handleActivityPress(item)}
            />
          )}
          numColumns={2}
          contentContainerStyle={styles.activitiesContainer}
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