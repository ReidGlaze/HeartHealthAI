import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Theme colors
const COLORS = {
  primary: '#D32F2F',
  primaryLight: '#FFEBEE',
  primaryDark: '#B71C1C',
  warning: '#FFC107',
  success: '#4CAF50',
  white: '#FFFFFF',
  black: '#202124',
  gray: '#5f6368',
};

interface StreakBadgeProps {
  streak: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({ 
  streak, 
  size = 'medium',
  showLabel = true
}) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create a pulse animation for the flame
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Create a subtle rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Determine sizes based on the size prop
  const getSizes = () => {
    switch (size) {
      case 'small':
        return {
          container: 36,
          icon: 16,
          fontSize: 12,
          labelSize: 10,
        };
      case 'large':
        return {
          container: 72,
          icon: 32,
          fontSize: 24,
          labelSize: 14,
        };
      case 'medium':
      default:
        return {
          container: 56,
          icon: 24,
          fontSize: 18,
          labelSize: 12,
        };
    }
  };

  const sizes = getSizes();

  // Get color based on streak length
  const getStreakColor = () => {
    if (streak >= 30) return COLORS.success;
    if (streak >= 7) return COLORS.warning;
    return COLORS.primary;
  };

  // Rotation interpolation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: getStreakColor(),
            width: sizes.container,
            height: sizes.container,
            borderRadius: sizes.container / 2,
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              { scale: pulseAnim },
              { rotate },
            ],
          }}
        >
          <Ionicons
            name="flame"
            size={sizes.icon}
            color={COLORS.white}
          />
        </Animated.View>
        <Text style={[styles.streakCount, { fontSize: sizes.fontSize }]}>
          {streak}
        </Text>
      </View>
      
      {showLabel && (
        <Text style={[styles.label, { fontSize: sizes.labelSize }]}>
          Day Streak
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 4,
  },
  streakCount: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginTop: -4,
  },
  label: {
    color: COLORS.gray,
    marginTop: 4,
  },
});

export default StreakBadge; 