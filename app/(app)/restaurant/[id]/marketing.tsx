import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Header } from '@/components/app/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { DollarSign, Gift, Percent, ShoppingBag, Clock, Calendar, X, Check, TrendingUp } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';

interface MarketingCampaign {
  id: string;
  name: string;
  description: string;
  type: 'amount_off' | 'percentage_off' | 'free_item' | 'bogo';
  discount_value: number;
  free_item_name?: string;
  period_type: 'limited_number' | 'date_range' | 'unlimited';
  max_redemptions?: number;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'active' | 'paused' | 'expired' | 'cancelled';
  expected_revenue: number;
}

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export default function MarketingScreen() {
  const { id } = useLocalSearchParams();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, [id]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (campaign: MarketingCampaign) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ status: 'active' })
        .eq('id', campaign.id);

      if (error) throw error;
      fetchCampaigns();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDecline = async (campaign: MarketingCampaign) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaign.id);

      if (error) throw error;
      fetchCampaigns();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderCampaignIcon = (type: string) => {
    switch (type) {
      case 'amount_off':
        return <DollarSign size={24} color={Colors.primary[600]} />;
      case 'percentage_off':
        return <Percent size={24} color={Colors.accent[600]} />;
      case 'free_item':
        return <Gift size={24} color={Colors.success[600]} />;
      case 'bogo':
        return <ShoppingBag size={24} color={Colors.secondary[600]} />;
      default:
        return null;
    }
  };

  const renderPeriodIcon = (type: string) => {
    switch (type) {
      case 'limited_number':
        return <ShoppingBag size={20} color={Colors.neutral[600]} />;
      case 'date_range':
        return <Calendar size={20} color={Colors.neutral[600]} />;
      case 'unlimited':
        return <Clock size={20} color={Colors.neutral[600]} />;
      default:
        return null;
    }
  };

  const renderSwipeableActions = (campaign: MarketingCampaign, direction: 'left' | 'right') => {
    const isRight = direction === 'right';
    return (
      <View
        style={[
          styles.swipeAction,
          {
            backgroundColor: isRight ? Colors.success[500] : Colors.error[500],
            right: isRight ? 0 : undefined,
            left: isRight ? undefined : 0,
          },
        ]}
      >
        {isRight ? (
          <Check size={24} color={Colors.white} />
        ) : (
          <X size={24} color={Colors.white} />
        )}
      </View>
    );
  };

  const renderCampaignCard = ({ item }: { item: MarketingCampaign }) => {
    return (
      <GestureHandlerRootView>
        <Swipeable
          renderLeftActions={() => renderSwipeableActions(item, 'left')}
          renderRightActions={() => renderSwipeableActions(item, 'right')}
          onSwipeableOpen={(direction) => {
            if (direction === 'left') {
              handleDecline(item);
            } else {
              handleApprove(item);
            }
          }}
          overshootLeft={false}
          overshootRight={false}
        >
          <TouchableOpacity
            style={styles.campaignCard}
            onPress={() => setSelectedCampaign(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              {renderCampaignIcon(item.type)}
              <View style={styles.headerContent}>
                <Text style={styles.campaignName}>{item.name}</Text>
                <View style={styles.statusContainer}>
                  <Text style={[
                    styles.statusText,
                    { color: item.status === 'active' ? Colors.success[600] : Colors.neutral[600] }
                  ]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.description}>{item.description}</Text>

            <View style={styles.detailsContainer}>
              <View style={styles.detail}>
                {renderPeriodIcon(item.period_type)}
                <Text style={styles.detailText}>
                  {item.period_type === 'limited_number'
                    ? `${item.max_redemptions} redemptions`
                    : item.period_type === 'date_range'
                    ? `Until ${new Date(item.end_date!).toLocaleDateString()}`
                    : 'Unlimited'}
                </Text>
              </View>

              <View style={styles.detail}>
                <TrendingUp size={20} color={Colors.neutral[600]} />
                <Text style={styles.detailText}>
                  ${item.expected_revenue.toFixed(2)} expected
                </Text>
              </View>
            </View>

            <View style={styles.valueContainer}>
              {item.type === 'amount_off' && (
                <Text style={styles.valueText}>
                  ${item.discount_value.toFixed(2)} off
                </Text>
              )}
              {item.type === 'percentage_off' && (
                <Text style={styles.valueText}>
                  {item.discount_value}% off
                </Text>
              )}
              {item.type === 'free_item' && (
                <Text style={styles.valueText}>
                  Free {item.free_item_name}
                </Text>
              )}
              {item.type === 'bogo' && (
                <Text style={styles.valueText}>
                  Buy One Get One Free
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Swipeable>
      </GestureHandlerRootView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.content}>
        <Text style={styles.title}>Marketing Campaigns</Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading campaigns...</Text>
          </View>
        ) : campaigns.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No marketing campaigns yet</Text>
          </View>
        ) : (
          <FlatList
            data={campaigns}
            renderItem={renderCampaignCard}
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
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
  },
  campaignCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  campaignName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
  },
  statusContainer: {
    marginTop: 2,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: Spacing.md,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
    marginLeft: Spacing.xs,
  },
  valueContainer: {
    backgroundColor: Colors.primary[50],
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  valueText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.primary[700],
  },
  swipeAction: {
    width: SWIPE_THRESHOLD,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: Colors.error[50],
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
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
});