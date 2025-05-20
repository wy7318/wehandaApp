import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { Header } from '@/components/app/Header';
import { Button } from '@/components/ui/Button';
import { RefreshCw } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/Colors';

export default function RestaurantList() {
  const router = useRouter();
  const { userRestaurants, loading, error, fetchUserRestaurants, selectRestaurant } = useRestaurant();

  useEffect(() => {
    fetchUserRestaurants();
  }, []);

  const handleSelectRestaurant = (restaurant: any) => {
    selectRestaurant(restaurant);
    router.push(`/restaurant/${restaurant.id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header showProfile={true} />
      
      <View style={styles.content}>
        <Text style={styles.title}>Your Restaurants</Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading restaurants...</Text>
          </View>
        ) : userRestaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No restaurants found</Text>
            <Button
              title="Refresh"
              variant="outline"
              onPress={fetchUserRestaurants}
              leftIcon={<RefreshCw size={16} color={Colors.primary[600]} />}
              style={styles.refreshButton}
            />
          </View>
        ) : (
          <FlatList
            data={userRestaurants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RestaurantCard
                restaurant={item.restaurant!}
                onPress={handleSelectRestaurant}
              />
            )}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
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
    marginBottom: Spacing.lg,
  },
  listContainer: {
    paddingBottom: Spacing.xl,
  },
  errorContainer: {
    backgroundColor: Colors.error[50],
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error[300],
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.error[700],
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.neutral[600],
    marginBottom: Spacing.md,
  },
  refreshButton: {
    marginTop: Spacing.md,
  },
});