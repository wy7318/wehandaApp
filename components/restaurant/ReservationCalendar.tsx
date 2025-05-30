import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface Booking {
  id: string;
  date: string;
  time: string;
  number_of_people: number;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
}

interface ReservationCalendarProps {
  restaurantId: string;
}

export const ReservationCalendar: React.FC<ReservationCalendarProps> = ({ restaurantId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [restaurantId, currentMonth]);

  const fetchBookings = async () => {
    try {
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          date,
          time,
          number_of_people,
          wehanda_customers (
            name,
            phone,
            email
          )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('status', 'confirmed');

      if (error) throw error;

      const formattedBookings = data.map(booking => ({
        ...booking,
        customer: booking.wehanda_customers
      }));

      setBookings(formattedBookings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking =>
      isSameDay(parseISO(booking.date), date)
    );
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const renderDayCell = (date: Date) => {
    const dayBookings = getBookingsForDate(date);
    const isSelected = isSameDay(date, selectedDate);

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.dayCell,
          isSelected && styles.selectedDay,
          dayBookings.length > 0 && styles.hasBookings
        ]}
        onPress={() => setSelectedDate(date)}
      >
        <Text style={[
          styles.dayNumber,
          isSelected && styles.selectedDayText
        ]}>
          {format(date, 'd')}
        </Text>
        {dayBookings.length > 0 && (
          <View style={styles.bookingCount}>
            <Text style={styles.bookingCountText}>
              {dayBookings.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderBookingDetails = () => {
    const dayBookings = getBookingsForDate(selectedDate);

    return (
      <View style={styles.bookingDetails}>
        <Text style={styles.dateHeader}>
          {format(selectedDate, 'MMMM d, yyyy')}
        </Text>
        {dayBookings.length === 0 ? (
          <Text style={styles.noBookings}>No reservations for this date</Text>
        ) : (
          dayBookings.map(booking => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingTime}>{booking.time}</Text>
                <Text style={styles.guestCount}>
                  {booking.number_of_people} {booking.number_of_people === 1 ? 'guest' : 'guests'}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{booking.customer.name}</Text>
                <Text style={styles.customerContact}>{booking.customer.phone}</Text>
                <Text style={styles.customerContact}>{booking.customer.email}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Reservations Calendar</Text>

        <View style={styles.calendar}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={handlePreviousMonth}
            >
              <ChevronLeft size={24} color={Colors.neutral[600]} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={handleNextMonth}
            >
              <ChevronRight size={24} color={Colors.neutral[600]} />
            </TouchableOpacity>
          </View>
          <View style={styles.daysGrid}>
            {getDaysInMonth().map(date => renderDayCell(date))}
          </View>
        </View>

        <ScrollView style={styles.bookingList}>
          {renderBookingDetails()}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    minHeight: '100%',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  calendar: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  monthButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.neutral[100],
  },
  monthTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '13.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[100],
  },
  selectedDay: {
    backgroundColor: Colors.primary[600],
  },
  hasBookings: {
    backgroundColor: Colors.accent[100],
  },
  dayNumber: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.neutral[900],
  },
  selectedDayText: {
    color: Colors.white,
  },
  bookingCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.primary[600],
    borderRadius: 999,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingCountText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    color: Colors.white,
  },
  bookingList: {
    flex: 1,
  },
  bookingDetails: {
    padding: Spacing.sm,
  },
  dateHeader: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  noBookings: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bookingTime: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.primary[600],
  },
  guestCount: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[600],
  },
  customerInfo: {
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingTop: Spacing.sm,
  },
  customerName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  customerContact: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: Colors.error[600],
    textAlign: 'center',
  },
});