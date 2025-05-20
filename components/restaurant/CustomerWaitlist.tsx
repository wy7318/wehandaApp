import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/Colors';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '@/lib/supabase';

interface CustomerWaitlistProps {
  restaurantId: string;
  onBack: () => void;
}

export const CustomerWaitlist: React.FC<CustomerWaitlistProps> = ({
  restaurantId,
  onBack,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [guests, setGuests] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name || !guests) {
      setError('Name and number of guests are required');
      return;
    }

    const guestsNumber = parseInt(guests, 10);
    if (isNaN(guestsNumber) || guestsNumber < 1) {
      setError('Please enter a valid number of guests');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({
          restaurant_id: restaurantId,
          name,
          email,
          phone,
          number_of_guests: guestsNumber,
        });

      if (insertError) throw insertError;

      // Clear form
      setName('');
      setEmail('');
      setPhone('');
      setGuests('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={20} color={Colors.neutral[600]} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Join Waitlist</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
      />

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="Enter your phone number"
        keyboardType="phone-pad"
      />

      <Input
        label="Number of Guests"
        value={guests}
        onChangeText={setGuests}
        placeholder="Enter number of guests"
        keyboardType="number-pad"
      />

      <Button
        title="Join Waitlist"
        onPress={handleSubmit}
        isLoading={isLoading}
        style={styles.submitButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.neutral[600],
    marginLeft: Spacing.xs,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
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
  submitButton: {
    marginTop: Spacing.md,
  },
});