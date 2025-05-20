import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/Colors';
import { Restaurant } from '@/lib/supabase';
import { MapPin } from 'lucide-react-native';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: (restaurant: Restaurant) => void;
  isSelected?: boolean;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onPress,
  isSelected = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
      ]}
      onPress={() => onPress(restaurant)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{restaurant.name}</Text>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedText}>Selected</Text>
            </View>
          )}
        </View>
        <View style={styles.addressContainer}>
          <MapPin size={16} color={Colors.neutral[500]} />
          <Text style={styles.address}>{restaurant.address}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  selectedContainer: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
  },
  content: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
  },
  selectedBadge: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  selectedText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: Colors.primary[700],
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  address: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
    marginLeft: Spacing.xs,
  },
});