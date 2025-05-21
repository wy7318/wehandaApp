import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/app/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Phone, Mail, User as User2, X, Calendar, ShoppingBag } from 'lucide-react-native';

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

interface Order {
  id: string;
  number: string;
  total: number;
  status: string;
  created_date: string;
}

interface Booking {
  id: string;
  date: string;
  time: string;
  number_of_people: number;
  status: string;
}

export default function CustomersScreen() {
  const { id } = useLocalSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [id]);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      const restaurantId = String(id).trim();
      const { data, error } = await supabase
        .rpc('get_customers_by_restaurants', { restaurant_id: restaurantId });
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (customerId: string) => {
    setLoadingDetails(true);
    try {
      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, number, total, status, created_date')
        .eq('customer_id', customerId)
        .eq('restaurant_id', id)
        .order('created_date', { ascending: false });

      if (ordersError) throw ordersError;
      setCustomerOrders(orders || []);

      // Fetch bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, date, time, number_of_people, status')
        .eq('customer_id', customerId)
        .eq('restaurant_id', id)
        .order('date', { ascending: false });

      if (bookingsError) throw bookingsError;
      setCustomerBookings(bookings || []);
    } catch (error) {
      console.error('Error fetching customer details:', error);
    } finally {
      setLoadingDetails(false);
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
    fetchCustomerDetails(customer.id);
  };

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleCustomerPress(item)}
    >
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

      <View style={styles.tagsContainer}>
        {item.total_orders > 0 && (
          <View style={[styles.tag, { backgroundColor: Colors.primary[50] }]}>
            <ShoppingBag size={14} color={Colors.primary[600]} />
            <Text style={[styles.tagText, { color: Colors.primary[600] }]}>
              {item.total_orders} orders
            </Text>
          </View>
        )}
        {item.total_bookings > 0 && (
          <View style={[styles.tag, { backgroundColor: Colors.accent[50] }]}>
            <Calendar size={14} color={Colors.accent[600]} />
            <Text style={[styles.tagText, { color: Colors.accent[600] }]}>
              {item.total_bookings} bookings
            </Text>
          </View>
        )}
        {item.upcoming_bookings > 0 && (
          <View style={[styles.tag, { backgroundColor: Colors.success[50] }]}>
            <Calendar size={14} color={Colors.success[600]} />
            <Text style={[styles.tagText, { color: Colors.success[600] }]}>
              {item.upcoming_bookings} upcoming
            </Text>
          </View>
        )}
        {item.lifetime_value > 0 && (
          <View style={[styles.tag, { backgroundColor: Colors.secondary[50] }]}>
            <Text style={[styles.tagText, { color: Colors.secondary[600] }]}>
              ${item.lifetime_value.toFixed(2)} spent
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={selectedCustomer !== null}
      animationType="slide"
      onRequestClose={() => setSelectedCustomer(null)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Customer Details</Text>
          <TouchableOpacity 
            onPress={() => setSelectedCustomer(null)}
            style={styles.closeButton}
          >
            <X size={24} color={Colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        {selectedCustomer && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{selectedCustomer.name}</Text>
              <View style={styles.customerDetails}>
                {selectedCustomer.email && (
                  <View style={styles.detailRow}>
                    <Mail size={16} color={Colors.neutral[600]} />
                    <Text style={styles.detailText}>{selectedCustomer.email}</Text>
                  </View>
                )}
                {selectedCustomer.phone && (
                  <View style={styles.detailRow}>
                    <Phone size={16} color={Colors.neutral[600]} />
                    <Text style={styles.detailText}>{selectedCustomer.phone}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Orders</Text>
              {loadingDetails ? (
                <Text style={styles.loadingText}>Loading orders...</Text>
              ) : customerOrders.length === 0 ? (
                <Text style={styles.emptyText}>No orders yet</Text>
              ) : (
                customerOrders.map(order => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderNumber}>#{order.number}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: Colors.primary[50] }]}>
                        <Text style={[styles.statusText, { color: Colors.primary[600] }]}>
                          {order.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderDetails}>
                      <Text style={styles.orderDate}>
                        {new Date(order.created_date).toLocaleDateString()}
                      </Text>
                      <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bookings</Text>
              {loadingDetails ? (
                <Text style={styles.loadingText}>Loading bookings...</Text>
              ) : customerBookings.length === 0 ? (
                <Text style={styles.emptyText}>No bookings yet</Text>
              ) : (
                customerBookings.map(booking => (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <Text style={styles.bookingDate}>{booking.date}</Text>
                      <Text style={styles.bookingTime}>{booking.time}</Text>
                    </View>
                    <View style={styles.bookingDetails}>
                      <Text style={styles.guestCount}>
                        {booking.number_of_people} {booking.number_of_people === 1 ? 'guest' : 'guests'}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: Colors.success[50] }]}>
                        <Text style={[styles.statusText, { color: Colors.success[600] }]}>
                          {booking.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
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

      {renderDetailsModal()}
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.round,
  },
  tagText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  customerInfo: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  customerName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.neutral[900],
    marginBottom: Spacing.sm,
  },
  customerDetails: {
    gap: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
    marginBottom: Spacing.sm,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  orderNumber: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
  },
  orderTotal: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: Colors.neutral[900],
  },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  bookingDate: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
  },
  bookingTime: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.neutral[600],
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestCount: {
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