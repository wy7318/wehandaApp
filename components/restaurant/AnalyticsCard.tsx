import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/Colors';
import { LineChart, BarChart } from 'lucide-react-native';

interface AnalyticsCardProps {
  type: 'demand' | 'revenue';
  onPress: () => void;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  type,
  onPress,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'demand':
        return <BarChart size={24} color={Colors.white} />;
      case 'revenue':
        return <LineChart size={24} color={Colors.white} />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'demand':
        return 'Demand Forecast';
      case 'revenue':
        return 'Revenue Forecast';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'demand':
        return 'Predict order volumes using historical data';
      case 'revenue':
        return 'Weekly/monthly revenue predictions';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'demand':
        return Colors.primary[600];
      case 'revenue':
        return Colors.success[600];
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: getColor() }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>{getIcon()}</View>
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.description}>{getDescription()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minHeight: 130,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    margin: Spacing.xs,
    flex: 1,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
});