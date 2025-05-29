import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Modal, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/app/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Coins, X, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

interface MarketingCampaign {
  name: string;
  description: string;
  type: 'amount_off' | 'percentage_off' | 'free_item' | 'bogo';
  discount_value: number;
  free_item_name?: string;
  period_type: 'limited_number' | 'date_range' | 'unlimited';
  max_redemptions?: number;
  start_date?: string;
  end_date?: string;
  expected_revenue: number;
}

interface Restaurant {
  id: string;
  name: string;
  marketing_tokens: number;
  marketing_enabled: boolean;
}

export default function MarketingScreen() {
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [suggestedCampaigns, setSuggestedCampaigns] = useState<MarketingCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRestaurantData();
    fetchSuggestedCampaigns();
  }, [id]);

  const fetchRestaurantData = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, marketing_tokens, marketing_enabled')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRestaurant(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchSuggestedCampaigns = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_suggested_campaigns', {
        p_restaurant_id: id,
        p_count: 3
      });

      if (error) throw error;
      setSuggestedCampaigns(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (campaign: MarketingCampaign) => {
    if (!restaurant) return;

    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          restaurant_id: id,
          name: campaign.name,
          description: campaign.description,
          type: campaign.type,
          discount_value: campaign.discount_value,
          free_item_name: campaign.free_item_name,
          period_type: campaign.period_type,
          max_redemptions: campaign.max_redemptions,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          status: 'active',
          expected_revenue: campaign.expected_revenue
        });

      if (error) throw error;

      // Remove accepted campaign from suggestions
      setSuggestedCampaigns(prev => prev.filter(c => c.name !== campaign.name));
      setSelectedCampaign(null);

      Alert.alert('Success', 'Campaign created successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDecline = async (campaign: MarketingCampaign) => {
    if (!restaurant) return;

    try {
      // Deduct token and get new suggestion
      const { data, error } = await supabase.rpc(
        'deduct_marketing_tokens',
        {
          p_restaurant_id: id,
          p_amount: 1,
          p_reason: `Declined campaign: ${campaign.name}`,
          p_generate_suggestion: true
        }
      );

      if (error) throw error;

      if (!data.success) {
        Alert.alert('Error', 'Insufficient marketing tokens');
        return;
      }

      // Remove declined campaign and add new suggestion
      const updatedSuggestions = suggestedCampaigns.filter(c => c.name !== campaign.name);
      if (data.new_suggestion) {
        updatedSuggestions.push(data.new_suggestion);
      }
      setSuggestedCampaigns(updatedSuggestions);

      // Update restaurant tokens
      setRestaurant(prev => prev ? {
        ...prev,
        marketing_tokens: prev.marketing_tokens - 1
      } : null);

      // Close modal if open
      setSelectedCampaign(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderCampaignCard = (campaign: MarketingCampaign) => {
    const renderSwipeableActions = (progress: any, dragX: any) => {
      return (
        <>
          <TouchableOpacity
            style={[styles.swipeAction, styles.acceptAction]}
            onPress={() => handleAccept(campaign)}
          >
            <Text style={styles.swipeActionText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeAction, styles.declineAction]}
            onPress={() => handleDecline(campaign)}
          >
            <Text style={styles.swipeActionText}>Decline</Text>
          </TouchableOpacity>
        </>
      );
    };

    return (
      <Swipeable renderRightActions={renderSwipeableActions}>
        <TouchableOpacity
          style={styles.campaignCard}
          onPress={() => setSelectedCampaign(campaign)}
        >
          <View style={styles.campaignHeader}>
            <Text style={styles.campaignName}>{campaign.name}</Text>
            <ChevronRight size={20} color={Colors.neutral[400]} />
          </View>
          <Text style={styles.campaignDescription}>{campaign.description}</Text>
          <View style={styles.campaignStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Expected Revenue</Text>
              <Text style={styles.statValue}>${campaign.expected_revenue.toFixed(2)}</Text>
            </View>
            {campaign.max_redemptions && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Max Redemptions</Text>
                <Text style={styles.statValue}>{campaign.max_redemptions}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderCampaignDetails = () => {
    if (!selectedCampaign) return null;

    return (
      <Modal
        visible={!!selectedCampaign}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCampaign(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Campaign Details</Text>
              <TouchableOpacity onPress={() => setSelectedCampaign(null)}>
                <X size={24} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.detailTitle}>{selectedCampaign.name}</Text>
              <Text style={styles.detailDescription}>{selectedCampaign.description}</Text>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Campaign Type</Text>
                <View style={styles.typeTag}>
                  <Text style={styles.typeText}>
                    {selectedCampaign.type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Expected Performance</Text>
                <View style={styles.performanceCard}>
                  <View style={styles.performanceItem}>
                    <TrendingUp size={24} color={Colors.success[600]} />
                    <Text style={styles.performanceLabel}>Expected Revenue</Text>
                    <Text style={styles.performanceValue}>
                      ${selectedCampaign.expected_revenue.toFixed(2)}
                    </Text>
                  </View>
                  {selectedCampaign.max_redemptions && (
                    <View style={styles.performanceItem}>
                      <TrendingDown size={24} color={Colors.primary[600]} />
                      <Text style={styles.performanceLabel}>Max Redemptions</Text>
                      <Text style={styles.performanceValue}>
                        {selectedCampaign.max_redemptions}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Campaign Period</Text>
                <Text style={styles.periodText}>
                  {selectedCampaign.period_type === 'date_range'
                    ? `${new Date(selectedCampaign.start_date!).toLocaleDateString()} - ${new Date(selectedCampaign.end_date!).toLocaleDateString()}`
                    : selectedCampaign.period_type === 'limited_number'
                    ? `Limited to ${selectedCampaign.max_redemptions} redemptions`
                    : 'Unlimited period'}
                </Text>
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  title="Accept Campaign"
                  onPress={() => handleAccept(selectedCampaign)}
                  style={styles.acceptButton}
                />
                <Button
                  title="Decline Campaign"
                  variant="outline"
                  onPress={() => handleDecline(selectedCampaign)}
                  style={styles.declineButton}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.content}>
        {restaurant && (
          <View style={styles.tokenContainer}>
            <Coins size={24} color={Colors.primary[600]} />
            <Text style={styles.tokenCount}>
              {restaurant.marketing_tokens} Marketing Tokens
            </Text>
          </View>
        )}

        <Text style={styles.title}>Suggested Campaigns</Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading campaigns...</Text>
          </View>
        ) : suggestedCampaigns.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No suggested campaigns</Text>
          </View>
        ) : (
          <GestureHandlerRootView style={styles.campaignsContainer}>
            {suggestedCampaigns.map((campaign, index) => (
              <View key={index}>
                {renderCampaignCard(campaign)}
              </View>
            ))}
          </GestureHandlerRootView>
        )}
      </View>

      {renderCampaignDetails()}
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
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tokenCount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
    marginLeft: Spacing.sm,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
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
  campaignsContainer: {
    flex: 1,
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
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  campaignName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
  },
  campaignDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: Spacing.sm,
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingTop: Spacing.sm,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  statValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  acceptAction: {
    backgroundColor: Colors.success[500],
  },
  declineAction: {
    backgroundColor: Colors.error[500],
  },
  swipeActionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.white,
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
    height: '80%',
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
  modalBody: {
    padding: Spacing.md,
  },
  detailTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  detailDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: Colors.neutral[600],
    marginBottom: Spacing.lg,
  },
  detailSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
    marginBottom: Spacing.sm,
  },
  typeTag: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.primary[700],
  },
  performanceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
    marginVertical: Spacing.xs,
    textAlign: 'center',
  },
  performanceValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: Colors.neutral[900],
  },
  periodText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: Colors.neutral[700],
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl,
  },
  acceptButton: {
    backgroundColor: Colors.success[600],
  },
  declineButton: {
    borderColor: Colors.error[600],
  },
});