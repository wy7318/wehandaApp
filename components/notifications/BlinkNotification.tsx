import React, { useEffect } from 'react';
import { TouchableWithoutFeedback, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/Colors';

interface BlinkNotificationProps {
  visible: boolean;
  onDismiss: () => void;
}

export const BlinkNotification: React.FC<BlinkNotificationProps> = ({
  visible,
  onDismiss,
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
      <Animated.View style={[styles.overlay, { opacity }]} />
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary[500],
    zIndex: 1000,
  },
});