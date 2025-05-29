import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Dimensions, Modal, Alert, Platform } from 'react-native';
import { Header } from '@/components/app/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { DollarSign, Gift, Percent, ShoppingBag, Clock, Calendar, X, Check, TrendingUp, Coins, Camera } from 'lucide-react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { Button } from '@/components/ui/Button';
import { CameraView } from 'expo-camera';

interface MarketingCampaign {
  id?: string;
  name: string;
  description: string;
  type: 'amount_off' | 'percentage_off' | 'free_item' | 'bogo';
  discount_value: number;
  free_item_name?: string;
  period_type: 'limited_number' | 'date_range' | 'unlimited';
  max_redemptions?: number;
  start_date?: string;
  end_date?: string;
  status?: 'draft' | 'active' | 'paused' | 'expired' | 'cancelled';
  expected_revenue: number;
}

interface Restaurant {
  id: string;
  marketing_tokens: number;
  marketing_enabled: boolean;
}

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export default function MarketingScreen() {
  const { id } = useLocalSearchParams();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [suggestedCampaigns, setSuggestedCampaigns] = useState<MarketingCampaign[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      checkPermissions();
    }
    fetchRestaurantData();
  }, [id]);

  const checkPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const fetchRestaurantData = async () => {
    try {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      if (!restaurantData.marketing_enabled) {
        setError('Marketing features are not enabled for this restaurant');
        return;
      }

      const { data: campaignData, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false });

      if (campaignError) throw campaignError;
      setCampaigns(campaignData || []);

      if (restaurantData.marketing_tokens > 0) {
        const { data: suggestedData, error: suggestedError } = await supabase
          .rpc('generate_suggested_campaigns', { 
            p_restaurant_id: id,
            p_count: 3
          });

        if (suggestedError) throw suggestedError;
        setSuggestedCampaigns(suggestedData || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (campaign: MarketingCampaign) => {
    if (!restaurant || restaurant.marketing_tokens <= 0) {
      Alert.alert('Error', 'No marketing tokens available');
      return;
    }

    try {
      const { error: tokenError } = await supabase
        .from('restaurants')
        .update({ marketing_tokens: restaurant.marketing_tokens - 1 })
        .eq('id', id);

      if (tokenError) throw tokenError;

      const { error: campaignError } = await supabase
        .from('marketing_campaigns')
        .insert({
          ...campaign,
          restaurant_id: id,
          status: 'active'
        });

      if (campaignError) throw campaignError;

      fetchRestaurantData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDecline = async (campaign: MarketingCampaign) => {
    if (!campaign.id) {
      const updatedSuggestions = suggestedCampaigns.filter(c => c.name !== campaign.name);
      setSuggestedCampaigns(updatedSuggestions);
      return;
    }

    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaign.id);

      if (error) throw error;
      fetchRestaurantData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleScanCode = async ({ data }: { data: string }) => {
    try {
      const { data: redemption, error } = await supabase
        .rpc('redeem_marketing_coupon', {
          p_code: data,
          p_order_id: null,
          p_total_bill: 0
        });

      if (error) throw error;

      Alert.alert('Success', `Coupon redeemed: ${redemption.campaign_name}`);
      setShowScanner(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
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

  const renderSwipeableActions = (direction: 'left' | 'right') => {
    const isLeft = direction === 'left';
    return (
      <View
        style={[
          styles.swipeAction,
          {
            backgroundColor: isLeft ? Colors.error[500] : Colors.success[500],
            left: isLeft ? 0 : undefined,
            right: isLeft ? undefined : 0,
          },
        ]}
      >
        {isLeft ? (
          <X size={24} color={Colors.white} />
        ) : (
          <Check size={24} color={Colors.white} />
        )}
      </View>
    );
  };

  const renderCampaignCard = ({ item }: { item: MarketingCampaign }) => {
    const status = item.status || 'suggested';
    const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);

    const cardContent = (
      <View style={styles.campaignCard}>
        <TouchableOpacity
          onPress={() => setSelectedCampaign(item)}
          activeOpacity={0.7}
          style={styles.cardTouchable}
        >
          <View style={styles.cardHeader}>
            {renderCampaignIcon(item.type)}
            <View style={styles.headerContent}>
              <Text style={styles.campaignName}>{item.name}</Text>
              <View style={styles.statusContainer}>
                <Text style={[
                  styles.statusText,
                  { color: status === 'active' ? Colors.success[600] : Colors.neutral[600] }
                ]}>
                  {displayStatus}
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
      </View>
    );

    if (Platform.OS === 'web' || item.status !== 'suggested') {
      return cardContent;
    }

    return (
      <GestureHandlerRootView style={styles.swipeableContainer}>
        <Swipeable
          renderLeftActions={() => renderSwipeableActions('left')}
          renderRightActions={() => renderSwipeableActions('right')}
          onSwipeableOpen={(direction) => {
            if (direction === 'left') {
              handleDecline(item);
            } else {
              handleApprove(item);
            }
          }}
          overshootLeft={false}
          overshootRight={false}
          friction={2}
          leftThreshold={SWIPE_THRESHOLD}
          rightThreshold={SWIPE_THRESHOLD}
        >
          {cardContent}
        </Swipeable>
      </GestureHandlerRootView>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Header />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Marketing Campaigns</Text>
            {restaurant && (
              <View style={styles.tokenContainer}>
                <Coins size={20} color={Colors.primary[600]} />
                <Text style={styles.tokenText}>{restaurant.marketing_tokens} tokens</Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <Button
              title="Scan Coupon"
              onPress={() => {
                if (Platform.OS === 'web') {
                  Alert.alert('Not Supported', 'Coupon scanning is not available on web. Please use a mobile device.');
                  return;
                }
                setShowScanner(true);
              }}
              leftIcon={<Camera size={20} color={Colors.white} />}
              style={styles.scanButton}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Loading campaigns...</Text>
            </View>
          ) : (
            <FlatList
              data={[...suggestedCampaigns, ...campaigns]}
              renderItem={renderCampaignCard}
              keyExtractor={(item, index) => item.id || `suggested-${index}`}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {Platform.OS !== 'web' && (
          <Modal
            visible={showScanner}
            animationType="slide"
            onRequestClose={() => setShowScanner(false)}
          >
            <SafeAreaView style={styles.scannerContainer}>
              <View style={styles.scannerHeader}>
                <Text style={styles.scannerTitle}>Scan Coupon</Text>
                <TouchableOpacity onPress={() => setShowScanner(false)}>
                  <X size={24} color={Colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              {hasPermission === false ? (
                <View style={styles.centerContainer}>
                  <Text style={styles.errorText}>No access to camera</Text>
                </View>
              ) : (
                <CameraView
                  style={styles.camera}
                  barCodeScannerSettings={{
                    barCodeTypes: ['qr', 'code128'],
                  }}
                  onBarcodeScanned={handleScanCode}
                />
              )}
            </SafeAreaView>
          </Modal>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  tokenText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.primary[600],
    marginLeft: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  scanButton: {
    flex: 1,
  },
  swipeableContainer: {
    marginBottom: Spacing.md,
  },
  cardTouchable: {
    flex: 1,
  },
  campaignCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
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
  scannerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  scannerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
  },
  camera: {
    flex: 1,
  },
});