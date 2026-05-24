import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/app/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
  gradientColors?: readonly [string, string, ...string[]];
  flat?: boolean;
}

export const PageHeader = ({ 
  title, 
  showBack = false, 
  onBack, 
  rightElement,
  backgroundColor,
  textColor,
  gradientColors,
  flat = false
}: PageHeaderProps) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, gradients, isDark } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const currentTextColor = textColor || colors.primary;
  const currentGradient = gradientColors || gradients.hero;

  const HeaderContent = (
    <View style={styles.content}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color={currentTextColor} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: currentTextColor }]}>{title}</Text>
      </View>
      <View style={styles.right}>
        {rightElement}
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={currentGradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.container, 
        { 
          paddingTop: insets.top + 12,
          backgroundColor: backgroundColor || colors.navy,
          borderColor: isDark ? colors.muted + '4D' : colors.border,
        }, 
        flat && styles.flat
      ]}
    >
      {HeaderContent}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flat: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 0,
  },
});
