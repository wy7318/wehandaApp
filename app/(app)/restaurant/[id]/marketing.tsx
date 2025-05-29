import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/app/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ChevronRight, Bell, User } from 'lucide-react-native';
import { CampaignEditModal } from '@/components/marketing/CampaignEditModal';

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
      fetchActiveCampaigns();

      Alert.alert('Success', 'Campaign created successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderCampaignCard = (campaign: MarketingCampaign, isActive: boolean = false) => (
    <TouchableOpacity
      style={styles.campaignCard}
      onPress={() => isActive ? setEditingCampaign(campaign) : handleAccept(campaign)}
    >
      <View style={styles.campaignHeader}>
        <Text style={styles.campaignName}>{campaign.name}</Text>
        <ChevronRight size={20} color={Colors.neutral[400]} />
      </View>
      <Text style={styles.campaignDescription}>{campaign.description}</Text>
      <Text style={styles.revenueText}>Expected Revenue</Text>
      <Text style={styles.revenueAmount}>${campaign.expected_revenue.toFixed(2)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{restaurant?.name || 'Best Pizza'}</Text>
        <View style={styles.headerIcons}>
          <Bell size={24} color={Colors.neutral[900]} />
          <User size={24} color={Colors.neutral[900]} style={styles.userIcon} />
        </View>
      </View>

      {restaurant && (
        <View style={styles.tokenBanner}>
          <Text style={styles.tokenText}>
            {restaurant.marketing_tokens} Marketing Tokens Available
          </Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Campaigns</Text>
          {activeCampaigns.map(campaign => renderCampaignCard(campaign, true))}
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

      {editingCampaign && (
        <CampaignEditModal
          visible={!!editingCampaign}
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onUpdate={() => {
            fetchActiveCampaigns();
            setEditingCampaign(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  restaurantName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: Colors.neutral[900],
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    marginLeft: Spacing.md,
  },
  tokenBanner: {
    backgroundColor: Colors.error[50],
    padding: Spacing.sm,
  },
  tokenText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.error[700],
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
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
    fontSize: 16,
    color: Colors.neutral[900],
  },
  campaignDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: Spacing.sm,
  },
  revenueText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  revenueAmount: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
  },
  errorContainer: {
    backgroundColor: Colors.error[50],
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.error[700],
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
});