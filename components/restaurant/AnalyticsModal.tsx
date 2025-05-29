import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, SafeAreaView, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/Colors';
import { X, TrendingUp, TrendingDown, CircleAlert as AlertCircle, Calendar, DollarSign, Users, ShoppingBag } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { LineChart, BarChart } from 'react-native-chart-kit';

interface AnalyticsModalProps {
    visible: boolean;
    onClose: () => void;
    restaurantId: string;
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

interface HighlightData {
    orders: number;
    revenue: number;
    bookings: number;
    orderGrowth: number;
    revenueGrowth: number;
    bookingGrowth: number;
}

type AnalyticsType = 'demand' | 'revenue';
type PeriodType = 'daily' | 'monthly' | 'yearly';

const screenWidth = Dimensions.get('window').width;
const DEFAULT_CHART_HEIGHT = 220;

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
    visible,
    onClose,
    restaurantId,
}) => {
    const [loading, setLoading] = useState(true);
    const [forecast, setForecast] = useState<ForecastData[]>([]);
    const [weeklyStats, setWeeklyStats] = useState<Stats[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<AnalyticsType>('demand');
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('daily');
    const [highlightData, setHighlightData] = useState<HighlightData>({
        orders: 0,
        revenue: 0,
        bookings: 0,
        orderGrowth: 0,
        revenueGrowth: 0,
        bookingGrowth: 0
    });

    useEffect(() => {
        if (visible) {
            fetchData();
            fetchHighlightData();
        }
    }, [visible, restaurantId, selectedType, selectedPeriod]);

    const fetchHighlightData = async () => {
        try {
            let currentPeriodStart: Date;
            let previousPeriodStart: Date;
            const now = new Date();

            switch (selectedPeriod) {
                case 'daily':
                    currentPeriodStart = subDays(now, 1);
                    previousPeriodStart = subDays(now, 2);
                    break;
                case 'monthly':
                    currentPeriodStart = subMonths(now, 1);
                    previousPeriodStart = subMonths(now, 2);
                    break;
                case 'yearly':
                    currentPeriodStart = subYears(now, 1);
                    previousPeriodStart = subYears(now, 2);
                    break;
            }

            // Fetch current period data
            const { data: currentData, error: currentError } = await supabase.rpc(
                'get_restaurant_highlights',
                {
                    p_restaurant_id: restaurantId,
                    p_start_date: currentPeriodStart.toISOString(),
                    p_end_date: now.toISOString()
                }
            );

            if (currentError) throw currentError;

            // Fetch previous period data for comparison
            const { data: previousData, error: previousError } = await supabase.rpc(
                'get_restaurant_highlights',
                {
                    p_restaurant_id: restaurantId,
                    p_start_date: previousPeriodStart.toISOString(),
                    p_end_date: currentPeriodStart.toISOString()
                }
            );

            if (previousError) throw previousError;

            const current = currentData[0] || { total_orders: 0, total_revenue: 0, total_bookings: 0 };
            const previous = previousData[0] || { total_orders: 0, total_revenue: 0, total_bookings: 0 };

            // Calculate growth percentages
            const calculateGrowth = (current: number, previous: number) => {
                if (previous === 0) return 0;
                return ((current - previous) / previous) * 100;
            };

            setHighlightData({
                orders: current.total_orders,
                revenue: current.total_revenue,
                bookings: current.total_bookings,
                orderGrowth: calculateGrowth(current.total_orders, previous.total_orders),
                revenueGrowth: calculateGrowth(current.total_revenue, previous.total_revenue),
                bookingGrowth: calculateGrowth(current.total_bookings, previous.total_bookings)
            });

        } catch (err: any) {
            console.error('Error fetching highlight data:', err);
            setError(err.message);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Get forecast data
            const { data: forecastData, error: forecastError } = await supabase.rpc(
                selectedType === 'demand' ? 'get_demand_forecast' : 'get_revenue_forecast',
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

            setForecast(forecastData || []);
            setWeeklyStats(
                (statsData || []).map((stat: any) => ({
                    date: stat.week,
                    value: selectedType === 'demand' ? stat.order_count : stat.total_revenue,
                    growth: selectedType === 'demand' ? stat.week_over_week_growth : stat.revenue_growth
                }))
            );
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderHighlightCard = (
        title: string,
        value: number,
        growth: number,
        icon: React.ReactNode
    ) => (
        <View style={styles.highlightCard}>
            <View style={styles.highlightHeader}>
                {icon}
                <Text style={styles.highlightTitle}>{title}</Text>
            </View>
            <Text style={styles.highlightValue}>
                {title === 'Revenue' ? `$${value.toFixed(2)}` : value}
            </Text>
            <View style={styles.growthContainer}>
                {growth > 0 ? (
                    <TrendingUp size={16} color={Colors.success[600]} />
                ) : (
                    <TrendingDown size={16} color={Colors.error[600]} />
                )}
                <Text style={[
                    styles.growthText,
                    { color: growth > 0 ? Colors.success[600] : Colors.error[600] }
                ]}>
                    {Math.abs(growth).toFixed(1)}%
                </Text>
            </View>
        </View>
    );

    const renderCharts = () => {
        if (!weeklyStats.length || !forecast.length) return null;

        const chartConfig = {
            backgroundColor: Colors.white,
            backgroundGradientFrom: Colors.white,
            backgroundGradientTo: Colors.white,
            decimalPlaces: selectedType === 'demand' ? 0 : 2,
            color: (opacity = 1) => `rgba(106, 76, 147, ${opacity})`,
            labelColor: (opacity = 1) => Colors.neutral[700],
            style: {
                borderRadius: 16,
            },
            propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: Colors.primary[600]
            }
        };

        const lineData = {
            labels: weeklyStats.slice(-6).map(stat => format(new Date(stat.date), 'MMM d')),
            datasets: [{
                data: weeklyStats.slice(-6).map(stat => stat.value || 0),
                color: (opacity = 1) => Colors.primary[600],
                strokeWidth: 2
            }]
        };

        const barData = {
            labels: forecast.map(f => format(new Date(f.forecast_date), 'MMM d')),
            datasets: [{
                data: forecast.map(f => f.forecasted_value || 0)
            }]
        };

        return (
            <View style={styles.chartsContainer}>
                <Text style={styles.chartTitle}>Historical {selectedType === 'demand' ? 'Orders' : 'Revenue'}</Text>
                <LineChart
                    data={lineData}
                    width={screenWidth - 40}
                    height={DEFAULT_CHART_HEIGHT}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                />

                <Text style={styles.chartTitle}>Forecasted {selectedType === 'demand' ? 'Orders' : 'Revenue'}</Text>
                <BarChart
                    data={barData}
                    width={screenWidth - 40}
                    height={DEFAULT_CHART_HEIGHT}
                    chartConfig={chartConfig}
                    style={styles.chart}
                    showValuesOnTopOfBars
                />
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
                        <Text style={styles.modalTitle}>Analytics Dashboard</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.neutral[500]} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.periodSelector}>
                        <TouchableOpacity
                            style={[styles.periodButton, selectedPeriod === 'daily' && styles.selectedPeriod]}
                            onPress={() => setSelectedPeriod('daily')}
                        >
                            <Text style={[styles.periodText, selectedPeriod === 'daily' && styles.selectedPeriodText]}>
                                Daily
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.periodButton, selectedPeriod === 'monthly' && styles.selectedPeriod]}
                            onPress={() => setSelectedPeriod('monthly')}
                        >
                            <Text style={[styles.periodText, selectedPeriod === 'monthly' && styles.selectedPeriodText]}>
                                Monthly
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.periodButton, selectedPeriod === 'yearly' && styles.selectedPeriod]}
                            onPress={() => setSelectedPeriod('yearly')}
                        >
                            <Text style={[styles.periodText, selectedPeriod === 'yearly' && styles.selectedPeriodText]}>
                                Yearly
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.highlights}>
                        {renderHighlightCard(
                            'Orders',
                            highlightData.orders,
                            highlightData.orderGrowth,
                            <ShoppingBag size={20} color={Colors.primary[600]} />
                        )}
                        {renderHighlightCard(
                            'Revenue',
                            highlightData.revenue,
                            highlightData.revenueGrowth,
                            <DollarSign size={20} color={Colors.success[600]} />
                        )}
                        {renderHighlightCard(
                            'Bookings',
                            highlightData.bookings,
                            highlightData.bookingGrowth,
                            <Calendar size={20} color={Colors.accent[600]} />
                        )}
                    </View>

                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, selectedType === 'demand' && styles.selectedTab]}
                            onPress={() => setSelectedType('demand')}
                        >
                            <Text style={[styles.tabText, selectedType === 'demand' && styles.selectedTabText]}>
                                Demand
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, selectedType === 'revenue' && styles.selectedTab]}
                            onPress={() => setSelectedType('revenue')}
                        >
                            <Text style={[styles.tabText, selectedType === 'revenue' && styles.selectedTabText]}>
                                Revenue
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {error ? (
                        <View style={styles.errorContainer}>
                            <AlertCircle size={24} color={Colors.error[600]} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : loading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading analytics...</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.scrollContent}>
                            {renderCharts()}

                            <View style={styles.statsGrid}>
                                {weeklyStats.slice(-4).map((stat, index) => (
                                    <View style={styles.statsCard} key={index}>
                                        <Text style={styles.statsDate}>
                                            {format(new Date(stat.date), 'MMM d, yyyy')}
                                        </Text>
                                        <Text style={styles.statsValue}>
                                            {selectedType === 'demand' ?
                                                `${Math.round(stat.value)} orders` :
                                                `$${stat.value.toFixed(2)}`}
                                        </Text>
                                        <View style={styles.growthContainer}>
                                            {stat.growth > 0 ? (
                                                <TrendingUp size={16} color={Colors.success[600]} />
                                            ) : (
                                                <TrendingDown size={16} color={Colors.error[600]} />
                                            )}
                                            <Text style={[
                                                styles.growthText,
                                                { color: stat.growth > 0 ? Colors.success[600] : Colors.error[600] }
                                            ]}>
                                                {Math.abs(stat.growth).toFixed(1)}%
                                            </Text>
                                        </View>
                                    </View>
                                ))}
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
    periodSelector: {
        flexDirection: 'row',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    periodButton: {
        flex: 1,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.neutral[100],
        alignItems: 'center',
    },
    selectedPeriod: {
        backgroundColor: Colors.primary[600],
    },
    periodText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
        color: Colors.neutral[700],
    },
    selectedPeriodText: {
        color: Colors.white,
    },
    highlights: {
        flexDirection: 'row',
        padding: Spacing.md,
        gap: Spacing.md,
    },
    highlightCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    highlightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    highlightTitle: {
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
        color: Colors.neutral[600],
    },
    highlightValue: {
        fontFamily: 'Poppins-Bold',
        fontSize: 20,
        color: Colors.neutral[900],
        marginBottom: Spacing.xs,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.neutral[100],
        alignItems: 'center',
    },
    selectedTab: {
        backgroundColor: Colors.primary[600],
    },
    tabText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
        color: Colors.neutral[700],
    },
    selectedTabText: {
        color: Colors.white,
    },
    scrollContent: {
        flex: 1,
        padding: Spacing.md,
    },
    chartsContainer: {
        marginBottom: Spacing.xl,
    },
    chart: {
        marginVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    chartTitle: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        color: Colors.neutral[900],
        marginBottom: Spacing.sm,
    },
    statsGrid: {
        gap: Spacing.md,
    },
    statsCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
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
    },
    statsValue: {
        fontFamily: 'Poppins-Bold',
        fontSize: 20,
        color: Colors.neutral[900],
        marginVertical: Spacing.xs,
    },
    growthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
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