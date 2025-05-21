import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/app/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Phone, Mail, User as User2, X, Calendar, ShoppingBag, TrendingUp } from 'lucide-react-native';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  created_date: string;
  type: string;
  total_orders: number;
  total_bookings: number;
  upcoming_bookings: number;
  lifetime_value: number;
}

export default function CustomersScreen() {
  const { id } = useLocalSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [id]);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      const restaurantId = String(id).trim();
      // Get the current date
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString(); // First day of current month
      const endDate = today.toISOString(); // Current date
      
      const { data, error } = await supabase
        .rpc('fetch_restaurant_customer_analytics', { 
          restaurant_id: restaurantId,
          start_date: startDate,
          end_date: endDate
        });
      
      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
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

  const handleCustomerPress = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleCustomerPress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[
            styles.typeBadge,
            { backgroundColor: item.type === 'regular' ? Colors.success[50] : Colors.primary[50] }
          ]}>
            <Text style={[
              styles.typeText,
              { color: item.type === 'regular' ? Colors.success[600] : Colors.primary[600] }
            ]}>
              {item.type}
            </Text>
          </View>
        </View>
        <Text style={styles.date}>
          Joined {new Date(item.created_date).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ShoppingBag size={16} color={Colors.primary[600]} />
          <Text style={styles.statText}>{item.total_orders} orders</Text>
        </View>
        <View style={styles.statItem}>
          <Calendar size={16} color={Colors.secondary[600]} />
          <Text style={styles.statText}>{item.total_bookings} bookings</Text>
        </View>
        <View style={styles.statItem}>
          <TrendingUp size={16} color={Colors.success[600]} />
          <Text style={styles.statText}>${item.lifetime_value}</Text>
        </View>
      </View>
    </TouchableOpacity>
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

      <Modal
        visible={selectedCustomer !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCustomer(null)}
      >
        {selectedCustomer && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Customer Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedCustomer(null)}
                  style={styles.closeButton}
                >
                  <X size={24} color={Colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  <View style={styles.detailsContainer}>
                    {selectedCustomer.phone && (
                      <View style={styles.detailRow}>
                        <Phone size={16} color={Colors.neutral[600]} />
                        <Text style={styles.detailText}>{selectedCustomer.phone}</Text>
                      </View>
                    )}
                    
                    {selectedCustomer.email && (
                      <View style={styles.detailRow}>
                        <Mail size={16} color={Colors.neutral[600]} />
                        <Text style={styles.detailText}>{selectedCustomer.email}</Text>
                      </View>
                    )}
                    
                    {(selectedCustomer.city || selectedCustomer.country) && (
                      <View style={styles.detailRow}>
                        <MapPin size={16} color={Colors.neutral[600]} />
                        <Text style={styles.detailText}>
                          {[selectedCustomer.city, selectedCustomer.country].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Activity Overview</Text>
                  <View style={styles.activityGrid}>
                    <View style={styles.activityCard}>
                      <ShoppingBag size={24} color={Colors.primary[600]} />
                      <Text style={styles.activityNumber}>{selectedCustomer.total_orders}</Text>
                      <Text style={styles.activityLabel}>Total Orders</Text>
                    </View>
                    <View style={styles.activityCard}>
                      <Calendar size={24} color={Colors.secondary[600]} />
                      <Text style={styles.activityNumber}>{selectedCustomer.total_bookings}</Text>
                      <Text style={styles.activityLabel}>Total Bookings</Text>
                    </View>
                    <View style={styles.activityCard}>
                      <Calendar size={24} color={Colors.accent[600]} />
                      <Text style={styles.activityNumber}>{selectedCustomer.upcoming_bookings}</Text>
                      <Text style={styles.activityLabel}>Upcoming</Text>
                    </View>
                    <View style={styles.activityCard}>
                      <TrendingUp size={24} color={Colors.success[600]} />
                      <Text style={styles.activityNumber}>${selectedCustomer.lifetime_value}</Text>
                      <Text style={styles.activityLabel}>Lifetime Value</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
  },
  typeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  date: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: Colors.neutral[500],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[600],
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalBody: {
    padding: Spacing.md,
  },
  detailSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[800],
    marginBottom: Spacing.sm,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  activityCard: {
    flex: 1,
    minWidth: '45%',
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
  activityNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
    marginTop: Spacing.xs,
  },
  activityLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: Colors.neutral[600],
    marginTop: 2,
  },
});