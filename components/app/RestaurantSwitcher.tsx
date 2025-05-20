import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/Colors';
import { ChevronDown, X } from 'lucide-react-native';
import { Restaurant } from '@/lib/supabase';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { RestaurantCard } from '../restaurant/RestaurantCard';

export const RestaurantSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedRestaurant, userRestaurants, selectRestaurant } = useRestaurant();

  const handleOpenModal = () => {
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
  };

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    selectRestaurant(restaurant);
    handleCloseModal();
  };

  if (!selectedRestaurant) return null;

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={handleOpenModal} activeOpacity={0.7}>
        <Text style={styles.label}>Restaurant</Text>
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedText} numberOfLines={1}>
            {selectedRestaurant.name}
          </Text>
          <ChevronDown size={16} color={Colors.neutral[500]} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Restaurant</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={userRestaurants}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RestaurantCard
                  restaurant={item.restaurant!}
                  onPress={handleSelectRestaurant}
                  isSelected={selectedRestaurant.id === item.restaurant!.id}
                />
              )}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[500],
    marginBottom: Spacing.xs,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
  },
  selectedText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.neutral[900],
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.md,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[900],
  },
  listContainer: {
    paddingBottom: Spacing.xxl,
  },
});