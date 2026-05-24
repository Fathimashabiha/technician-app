import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, StyleProp } from 'react-native';
import { useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  onPress: () => void;
  title?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'accent';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button = ({
  onPress,
  title,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  children,
  style,
  textStyle,
}: ButtonProps) => {
  const { colors, gradients } = useTheme();
  const isAccent = variant === 'accent';
  const isDefault = variant === 'default';

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFF'} />
      ) : children ? (
        children
      ) : (
        <Text style={[
          styles.text, 
          { color: getTextColor(variant, colors) },
          size === 'sm' && styles.smText, 
          textStyle
        ]}>
          {title}
        </Text>
      )}
    </>
  );

  const sizeStyle = size === 'default' ? styles.defaultSize : styles[size as keyof typeof styles];

  if (isAccent || isDefault) {
    const gradientColors = isAccent ? gradients.secondary : gradients.primary;
    const { height, borderRadius, width } = (sizeStyle as any) || {};

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.base, 
          { height, borderRadius: borderRadius ?? 12, width }, 
          disabled && styles.disabled, 
          style
        ]}
      >
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyle as ViewStyle]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { 
          backgroundColor: getBackgroundColor(variant, colors),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
        },
        sizeStyle as ViewStyle,
        disabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
};

const getTextColor = (variant: string, colors: any) => {
  switch (variant) {
    case 'destructive': return colors.destructiveForeground;
    case 'outline':
    case 'ghost': return colors.foreground;
    case 'secondary': return colors.secondaryForeground;
    case 'link': return colors.primary;
    default: return '#FFF';
  }
};

const getBackgroundColor = (variant: string, colors: any) => {
  switch (variant) {
    case 'destructive': return colors.destructive;
    case 'secondary': return colors.secondary;
    case 'outline':
    case 'ghost':
    case 'link':
    case 'accent': return 'transparent';
    default: return colors.primary;
  }
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
  },
  // Sizes
  defaultSize: { height: 48, paddingHorizontal: 16 },
  sm: { height: 36, paddingHorizontal: 12, borderRadius: 8 },
  lg: { height: 56, paddingHorizontal: 32 },
  icon: { height: 40, width: 40 },

  // Text Styles
  text: { fontSize: 16, fontWeight: '600' },
  smText: { fontSize: 14 },
  disabled: { opacity: 0.5 },
});
