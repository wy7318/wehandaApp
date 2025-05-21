import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/app/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Phone, Mail, User2 } from 'lucide-react-native';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  created_date: string;
  type: string;
}

export default function CustomersScreen() {
  const { id } = useLocalSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, [id]);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('wehanda_customers')
        .select('*')
        .contains('restaurants', [id])
        .order('created_date', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(customer => 
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.city?.toLowerCase().includes(query)
    );
    setFilteredCustomers(filtered);
  };

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
        </View>
        <Text style={styles.date}>
          Joined {new Date(item.created_date).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.detailsContainer}>
        {item.phone && (
          <View style={styles.detailRow}>
            <Phone size={16} color={Colors.neutral[600]} />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>
        )}
        
        {item.email && (
          <View style={styles.detailRow}>
            <Mail size={16} color={Colors.neutral[600]} />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
        )}
        
        {(item.city || item.country) && (
          <View style={styles.detailRow}>
            <MapPin size={16} color={Colors.neutral[600]} />
            <Text style={styles.detailText}>
              {[item.city, item.country].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.neutral[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.neutral[400]}
          />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{customers.length}</Text>
            <Text style={styles.statLabel}>Total Customers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {customers.filter(c => c.type === 'regular').length}
            </Text>
            <Text style={styles.statLabel}>Regular Customers</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading customers...</Text>
          </View>
        ) : filteredCustomers.length === 0 ? (
          <View style={styles.centerContainer}>
            <User2 size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            renderItem={renderCustomerCard}
            keyExtractor={item => item.id}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: Colors.neutral[900],
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.primary[600],
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[600],
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: Spacing.sm,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
  },
  typeBadge: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
  },
  typeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: Colors.primary[600],
    textTransform: 'capitalize',
  },
  date: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: Colors.neutral[500],
  },
  detailsContainer: {
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
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
    marginTop: Spacing.sm,
  },
  listContainer: {
    paddingBottom: Spacing.xl,
  },
});