import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';
import { ZENFIX_LOGO } from '@/app/constants/branding';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'splash';

const SIZES: Record<LogoSize, { width: number; height: number }> = {
  xs: { width: 28, height: 28 },
  sm: { width: 48, height: 48 },
  md: { width: 120, height: 72 },
  lg: { width: 240, height: 140 },
  splash: { width: 280, height: 160 },
};

type Props = {
  size?: LogoSize;
  style?: StyleProp<ImageStyle>;
};

export function ZenFixLogo({ size = 'md', style }: Props) {
  const dim = SIZES[size];
  return (
    <Image
      source={ZENFIX_LOGO}
      style={[styles.logo, dim, style]}
      resizeMode="contain"
      accessibilityLabel="ZenFix logo"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    maxWidth: '100%',
  },
});
