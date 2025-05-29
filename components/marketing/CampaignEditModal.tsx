import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

interface CampaignEditModalProps {
  visible: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    type: 'amount_off' | 'percentage_off' | 'free_item' | 'bogo';
    discount_value: number;
    max_redemptions?: number;
    start_date?: string;
    end_date?: string;
    period_type: 'limited_number' | 'date_range' | 'unlimited';
  };
  onUpdate: () => void;
}

export const CampaignEditModal: React.FC<CampaignEditModalProps> = ({
  visible,
  onClose,
  campaign,
  onUpdate,
}) => {
  const [discountValue, setDiscountValue] = useState(campaign.discount_value?.toString() || '');
  const [maxRedemptions, setMaxRedemptions] = useState(campaign.max_redemptions?.toString() || '');
  const [startDate, setStartDate] = useState(campaign.start_date || '');
  const [endDate, setEndDate] = useState(campaign.end_date || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);

    try {
      const updates: any = {};

      // Add relevant fields based on campaign type
      if (campaign.type === 'amount_off' || campaign.type === 'percentage_off') {
        updates.discount_value = parseFloat(discountValue);
      }

      if (campaign.period_type === 'limited_number') {
        updates.max_redemptions = parseInt(maxRedemptions);
      } else if (campaign.period_type === 'date_range') {
        updates.start_date = startDate;
        updates.end_date = endDate;
      }

      const { error: updateError } = await supabase
        .from('marketing_campaigns')
        .update(updates)
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFields = () => {
    switch (campaign.type) {
      case 'amount_off':
        return (
          <Input
            label="Discount Amount ($)"
            value={discountValue}
            onChangeText={setDiscountValue}
            keyboardType="numeric"
            placeholder="Enter discount amount"
          />
        );

      case 'percentage_off':
        return (
          <Input
            label="Discount Percentage (%)"
            value={discountValue}
            onChangeText={setDiscountValue}
            keyboardType="numeric"
            placeholder="Enter discount percentage"
          />
        );

      case 'free_item':
      case 'bogo':
        return null;
    }
  };

  const renderPeriodFields = () => {
    switch (campaign.period_type) {
      case 'limited_number':
        return (
          <Input
            label="Maximum Redemptions"
            value={maxRedemptions}
            onChangeText={setMaxRedemptions}
            keyboardType="numeric"
            placeholder="Enter max redemptions"
          />
        );

      case 'date_range':
        return (
          <>
            <Input
              label="Start Date"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="End Date"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
            />
          </>
        );

      case 'unlimited':
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Campaign</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {renderFields()}
            {renderPeriodFields()}

            <View style={styles.buttonContainer}>
              <Button
                title="Update Campaign"
                onPress={handleUpdate}
                isLoading={loading}
                style={styles.updateButton}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                style={styles.cancelButton}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  modalBody: {
    padding: Spacing.md,
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
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl,
  },
  updateButton: {
    backgroundColor: Colors.success[600],
  },
  cancelButton: {
    borderColor: Colors.neutral[400],
  },
});