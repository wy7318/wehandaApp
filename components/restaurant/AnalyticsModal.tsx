import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, SafeAreaView, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/Colors';
import { X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, subDays, subWeeks } from 'date-fns';

interface AnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  type: 'demand' | 'revenue';
}

interface ForecastData {
  forecast_date: string;
  forecasted_value: number;
  lower_bound: number;
  upper_bound: number;
  confidence_level: number;
}

interface Stats {
  date: string;
  value: number;
  growth: number;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  visible,
  onClose,
  restaurantId,
  type,
}) => {
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<Stats[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible, restaurantId, type]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get forecast data
      const { data: forecastData, error: forecastError } = await supabase.rpc(
        type === 'demand' ? 'get_demand_forecast' : 'get_revenue_forecast',
        {
          p_restaurant_id: restaurantId,
          p_periods: 4
        }
      );

      if (forecastError) throw forecastError;

      // Get weekly stats
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_weekly_order_stats',
        {
          p_restaurant_id: restaurantId,
          p_start_date: subWeeks(new Date(), 12).toISOString(),
          p_end_date: new Date().toISOString()
        }
      );

      if (statsError) throw statsError;

      setForecast(forecastData);
      setWeeklyStats(
        statsData.map((stat: any) => ({
          date: stat.week,
          value: type === 'demand' ? stat.order_count : stat.total_revenue,
          growth: type === 'demand' ? stat.week_over_week_growth : stat.revenue_growth
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderForecastCard = (data: ForecastData) => {
    const value = type === 'demand' ? 
      Math.round(data.forecasted_value) :
      data.forecasted_value.toFixed(2);
    
    const range = type === 'demand' ?
      `${Math.round(data.lower_bound)} - ${Math.round(data.upper_bound)}` :
      `$${data.lower_bound.toFixed(2)} - $${data.upper_bound.toFixed(2)}`;

    return (
      <View style={styles.forecastCard} key={data.forecast_date}>
        <Text style={styles.forecastDate}>
          {format(new Date(data.forecast_date), 'MMM d, yyyy')}
        </Text>
        <Text style={styles.forecastValue}>
          {type === 'demand' ? value : `$${value}`}
        </Text>
        <Text style={styles.forecastRange}>
          Range: {range}
        </Text>
        <Text style={styles.confidenceLevel}>
          {data.confidence_level}% Confidence
        </Text>
      </View>
    );
  };

  const renderStatsCard = (stat: Stats) => {
    const isPositive = stat.growth > 0;
    const growthColor = isPositive ? Colors.success[600] : Colors.error[600];

    return (
      <View style={styles.statsCard} key={stat.date}>
        <Text style={styles.statsDate}>
          {format(new Date(stat.date), 'MMM d, yyyy')}
        </Text>
        <Text style={styles.statsValue}>
          {type === 'demand' ? 
            `${Math.round(stat.value)} orders` :
            `$${stat.value.toFixed(2)}`}
        </Text>
        <View style={styles.growthContainer}>
          {isPositive ? (
            <TrendingUp size={16} color={growthColor} />
          ) : (
            <TrendingDown size={16} color={growthColor} />
          )}
          <Text style={[styles.growthText, { color: growthColor }]}>
            {Math.abs(stat.growth).toFixed(1)}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {type === 'demand' ? 'Demand Forecast' : 'Revenue Forecast'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={24} color={Colors.error[600]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading forecasts...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Forecast</Text>
                <View style={styles.forecastGrid}>
                  {forecast.map(renderForecastCard)}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Historical Performance</Text>
                <View style={styles.statsGrid}>
                  {weeklyStats.map(renderStatsCard)}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: Colors.background,
    marginTop: Platform.OS === 'ios' ? 0 : 60,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
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
  scrollContent: {
    flex: 1,
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  forecastGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  forecastCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '48%',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  forecastDate: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 4,
  },
  forecastValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.primary[600],
    marginBottom: 4,
  },
  forecastRange: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  confidenceLevel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: Colors.success[600],
  },
  statsGrid: {
    gap: Spacing.md,
  },
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsDate: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[600],
    flex: 1,
  },
  statsValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
    flex: 1,
    textAlign: 'center',
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },
  growthText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.error[600],
    textAlign: 'center',
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
});