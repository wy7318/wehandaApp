import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/Colors';
import { CustomerWaitlist } from './CustomerWaitlist';
import { RestaurantWaitlist } from './RestaurantWaitlist';

interface WaitlistModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
}

type WaitlistView = 'select' | 'customer' | 'restaurant';

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  visible,
  onClose,
  restaurantId,
}) => {
  const [view, setView] = useState<WaitlistView>('select');

  const handleBack = () => {
    setView('select');
  };

  const renderContent = () => {
    switch (view) {
      case 'select':
        return (
          <ScrollView style={styles.selectContainer} contentContainerStyle={styles.selectContentContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setView('customer')}
            >
              <Text style={styles.optionButtonText}>Customer</Text>
              <Text style={styles.optionButtonSubtext}>Join the waitlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setView('restaurant')}
            >
              <Text style={styles.optionButtonText}>Restaurant</Text>
              <Text style={styles.optionButtonSubtext}>Manage waitlist</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'customer':
        return <CustomerWaitlist restaurantId={restaurantId} onBack={handleBack} />;

      case 'restaurant':
        return <RestaurantWaitlist restaurantId={restaurantId} onBack={handleBack} />;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Waitlist</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {renderContent()}
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
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
  selectContainer: {
    flex: 1,
  },
  selectContentContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
    minHeight: '100%',
  },
  optionButton: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  optionButtonSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
  },
});