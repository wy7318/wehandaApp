import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Restaurant } from '@/lib/supabase';
import { MapPin } from 'lucide-react-native';

interface RestaurantSettingsProps {
  restaurant: Restaurant;
  onUpdate: () => void;
}

export const RestaurantSettings: React.FC<RestaurantSettingsProps> = ({
  restaurant,
  onUpdate,
}) => {
  const [address, setAddress] = useState(restaurant.address || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateRestaurant = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          address: address,
          modified_date: new Date().toISOString(),
        })
        .eq('id', restaurant.id);

      if (updateError) throw updateError;

      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restaurant Settings</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Input
        label="Restaurant Name"
        value={restaurant.name}
        editable={false}
        style={styles.input}
      />

      <Input
        label="Address"
        value={address}
        onChangeText={setAddress}
        placeholder="Enter restaurant address"
        leftIcon={<MapPin size={20} color={Colors.neutral[500]} />}
        style={styles.input}
      />

      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Created:</Text>
        <Text style={styles.infoValue}>
          {new Date(restaurant.created_date).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Last Modified:</Text>
        <Text style={styles.infoValue}>
          {new Date(restaurant.modified_date).toLocaleDateString()}
        </Text>
      </View>

      <Button
        title="Update Restaurant"
        onPress={handleUpdateRestaurant}
        isLoading={isLoading}
        style={styles.updateButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
  },
  input: {
    marginBottom: Spacing.md,
  },
  errorContainer: {
    backgroundColor: Colors.error[50],
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error[300],
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.error[700],
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  infoLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[600],
  },
  infoValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[900],
  },
  updateButton: {
    marginTop: Spacing.lg,
  },
});