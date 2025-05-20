import React, { useEffect } from 'react';
import { TouchableWithoutFeedback, StyleSheet, Animated, Text, View } from 'react-native';
import { Colors } from '@/constants/Colors';

interface BlinkNotificationProps {
  visible: boolean;
  onDismiss: () => void;
  message?: string;
}

export const BlinkNotification: React.FC<BlinkNotificationProps> = ({
  visible,
  onDismiss,
  message,
}) => {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    if (visible) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );

      animation.start();
    } else {
      opacity.setValue(0);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        {message && (
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{message}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary[500],
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 8,
  },
  message: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: Colors.primary[700],
    textAlign: 'center',
  },
});