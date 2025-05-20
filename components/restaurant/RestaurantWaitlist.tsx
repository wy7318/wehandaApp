import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Button } from '../ui/Button';

interface RestaurantWaitlistProps {
  restaurantId: string;
  onBack: () => void;
}

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  number_of_guests: number;
  created_at: string;
}

export const RestaurantWaitlist: React.FC<RestaurantWaitlistProps> = ({
  restaurantId,
  onBack,
}) => {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWaitlist();

    // Subscribe to changes
    const channel = supabase
      .channel('waitlist_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Add new entry to the list
            setWaitlist(current => [...current, payload.new as WaitlistEntry]);
          } else if (payload.eventType === 'UPDATE') {
            // Remove updated entry (when seated)
            setWaitlist(current => current.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [restaurantId]);

  const fetchWaitlist = async () => {
    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setWaitlist(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeated = async (id: string) => {
    try {
      const { error } = await supabase
        .from('waitlist')
        .update({ status: 'seated' })
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderItem = ({ item }: { item: WaitlistEntry }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.details}>
          {item.number_of_guests} {item.number_of_guests === 1 ? 'guest' : 'guests'}
        </Text>
        {item.phone && (
          <Text style={styles.contact}>{item.phone}</Text>
        )}
        {item.email && (
          <Text style={styles.contact}>{item.email}</Text>
        )}
        <Text style={styles.time}>
          Added: {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </View>
      <Button
        title="Seated"
        variant="outline"
        size="sm"
        leftIcon={<Check size={16} color={Colors.success[600]} />}
        onPress={() => handleSeated(item.id)}
        style={styles.seatedButton}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={20} color={Colors.neutral[600]} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Current Waitlist</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading waitlist...</Text>
        </View>
      ) : waitlist.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No customers waiting</Text>
        </View>
      ) : (
        <FlatList
          data={waitlist}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: Colors.neutral[600],
  },
  emptyText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.neutral[600],
  },
  listContainer: {
    paddingBottom: Spacing.xl,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  details: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[700],
    marginBottom: 4,
  },
  contact: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
  },
  time: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  seatedButton: {
    marginLeft: Spacing.md,
  },
});