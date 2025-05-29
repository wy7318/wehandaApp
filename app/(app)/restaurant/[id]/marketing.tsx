import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Modal, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/app/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Coins, X, ChevronRight, TrendingUp, TrendingDown, CreditCard as Edit2 } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CampaignEditModal } from '@/components/marketing/CampaignEditModal';

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
  const [activeCampaigns, setActiveCampaigns] = useState<MarketingCampaign[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);

  useEffect(() => {
    fetchRestaurantData();
    fetchSuggestedCampaigns();
    fetchActiveCampaigns();
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

  const fetchActiveCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('restaurant_id', id)
        .eq('status', 'active');

      if (error) throw error;
      setActiveCampaigns(data || []);
    } catch (err: any) {
      setError(err.message);
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

      const updatedSuggestions = suggestedCampaigns.filter(c => c.name !== campaign.name);
      if (data.new_suggestion) {
        updatedSuggestions.push(data.new_suggestion);
      }
      setSuggestedCampaigns(updatedSuggestions);

      setRestaurant(prev => prev ? {
        ...prev,
        marketing_tokens: prev.marketing_tokens - 1
      } : null);

      setSelectedCampaign(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditCampaign = (campaign: MarketingCampaign) => {
    setEditingCampaign(campaign);
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

  const renderActiveCampaignCard = (campaign: MarketingCampaign) => {
    return (
      <View style={styles.campaignCard}>
        <View style={styles.campaignHeader}>
          <Text style={styles.campaignName}>{campaign.name}</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditCampaign(campaign)}
          >
            <Edit2 size={20} color={Colors.primary[600]} />
          </TouchableOpacity>
        </View>
        <Text style={styles.campaignDescription}>{campaign.description}</Text>
        <View style={styles.campaignStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {campaign.type === 'amount_off' ? 'Discount Amount' : 
               campaign.type === 'percentage_off' ? 'Discount Percentage' : 
               'Expected Revenue'}
            </Text>
            <Text style={styles.statValue}>
              {campaign.type === 'amount_off' ? `$${campaign.discount_value}` :
               campaign.type === 'percentage_off' ? `${campaign.discount_value}%` :
               `$${campaign.expected_revenue}`}
            </Text>
          </View>
          {campaign.period_type === 'limited_number' && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Remaining Redemptions</Text>
              <Text style={styles.statValue}>{campaign.max_redemptions}</Text>
            </View>
          )}
          {campaign.period_type === 'date_range' && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>End Date</Text>
              <Text style={styles.statValue}>
                {new Date(campaign.end_date!).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
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
      <Header title="Marketing" />
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {restaurant && (
          <View style={styles.tokenContainer}>
            <Coins size={24} color={Colors.primary[600]} />
            <Text style={styles.tokenText}>
              {restaurant.marketing_tokens} Marketing Tokens Available
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Campaigns</Text>
          {activeCampaigns.map(campaign => renderActiveCampaignCard(campaign))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Campaigns</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading campaigns...</Text>
          ) : (
            suggestedCampaigns.map(campaign => renderCampaignCard(campaign))
          )}
        </View>
      </ScrollView>

      {renderCampaignDetails()}

      {editingCampaign && (
        <CampaignEditModal
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSave={async (updatedCampaign) => {
            try {
              const { error } = await supabase
                .from('marketing_campaigns')
                .update(updatedCampaign)
                .eq('id', editingCampaign.id);

              if (error) throw error;

              fetchActiveCampaigns();
              setEditingCampaign(null);
              Alert.alert('Success', 'Campaign updated successfully!');
            } catch (err: any) {
              setError(err.message);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  content: {
    flex: 1,
    padding: Spacing.medium,
  },
  errorContainer: {
    backgroundColor: Colors.error[100],
    padding: Spacing.medium,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.medium,
  },
  errorText: {
    color: Colors.error[700],
    fontSize: 14,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[100],
    padding: Spacing.medium,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.medium,
  },
  tokenText: {
    marginLeft: Spacing.small,
    color: Colors.primary[700],
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.large,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: Spacing.medium,
  },
  loadingText: {
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: Spacing.medium,
  },
  campaignCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  campaignDescription: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: Spacing.medium,
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  editButton: {
    padding: Spacing.small,
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
    color: Colors.white,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  modalBody: {
    padding: Spacing.medium,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: Spacing.small,
  },
  detailDescription: {
    fontSize: 16,
    color: Colors.neutral[600],
    marginBottom: Spacing.large,
  },
  detailSection: {
    marginBottom: Spacing.large,
  },
  typeTag: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderRadius: BorderRadius.medium,
    alignSelf: 'flex-start',
  },
  typeText: {
    color: Colors.primary[700],
    fontWeight: '600',
  },
  performanceCard: {
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.medium,
    padding: Spacing.medium,
  },
  performanceItem: {
    marginBottom: Spacing.medium,
  },
  performanceLabel: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginVertical: Spacing.small,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  periodText: {
    fontSize: 16,
    color: Colors.neutral[700],
  },
  buttonContainer: {
    marginTop: Spacing.large,
    gap: Spacing.medium,
  },
  acceptButton: {
    backgroundColor: Colors.success[500],
  },
  declineButton: {
    borderColor: Colors.error[500],
  },
});