import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/app/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'glass';
}

export const Card = ({ children, style, variant = 'default' }: CardProps) => {
  const { colors, shadows } = useTheme();

  return (
    <View style={[
      {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.muted + '4D',
      },
      variant === 'elevated' && {
        ...shadows.card,
        borderColor: colors.primary + '33',
      },
      variant === 'glass' && {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...shadows.card,
      },
      style
    ]}>
      {children}
    </View>
  );
};
