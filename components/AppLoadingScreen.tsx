import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ZenFixLogo } from '@/components/ZenFixLogo';
import { LIGHT_COLORS } from '@/app/constants/theme';

type Props = {
  showSpinner?: boolean;
};

/** In-app loading view — matches native splash (white + centered logo). */
export function AppLoadingScreen({ showSpinner = true }: Props) {
  return (
    <View style={styles.container}>
      <ZenFixLogo size="splash" />
      {showSpinner ? (
        <ActivityIndicator
          size="large"
          color={LIGHT_COLORS.primary}
          style={styles.spinner}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  spinner: {
    marginTop: 32,
  },
});
