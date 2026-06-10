import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList, MoreStackParamList } from '@/app/types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar, Search, Shield, Gauge,
  BarChart3, LogOut, ChevronRight,
  AlertTriangle, User, CheckCircle, Box,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/app/constants/theme';
import { clearTechnicianSession } from '@/lib/technicianSession';
import Animated, { FadeInUp } from 'react-native-reanimated';

type NavigationProp = CompositeNavigationProp<BottomTabNavigationProp<TabParamList>, NativeStackNavigationProp<RootStackParamList>>;

type MoreScreen = keyof MoreStackParamList;

export default function MoreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, gradients, shadows, isDark } = useTheme();

  const sections: { title: string; items: { icon: any; label: string; screen: MoreScreen | null; color: string; iconColor: string }[] }[] = [
    {
      title: 'Modules',
      items: [
        { icon: Box, label: 'Assets', screen: 'Assets', color: '#0d94881A', iconColor: '#0d9488' },
        { icon: Calendar, label: 'PPM Schedule', screen: 'PPM', color: colors.primary + '1A', iconColor: colors.primary },
        { icon: Search, label: 'Inspections', screen: 'Inspections', color: colors.secondary + '1A', iconColor: colors.secondary },
        { icon: AlertTriangle, label: 'Snagging', screen: 'Snagging', color: colors.warning + '1A', iconColor: colors.warning },
        { icon: Shield, label: 'HSE', screen: 'HSE', color: colors.destructive + '1A', iconColor: colors.destructive },
        { icon: Gauge, label: 'Meter Reading', screen: 'MeterReading', color: colors.primary + '1A', iconColor: colors.primary },
        { icon: BarChart3, label: 'Timesheet', screen: 'Timesheet', color: colors.primary + '1A', iconColor: colors.primary },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: LogOut, label: 'Sign Out', screen: null, color: colors.destructive + '1A', iconColor: colors.destructive },
      ],
    },
  ];

  const styles = getStyles(colors, shadows);

  const handlePress = (screen: MoreScreen | null, label?: string) => {
    if (!screen) return;
    if (label === 'Timesheet') {
      navigation.navigate('History', { screen: 'HistoryHome', params: { tab: 'timesheet' } });
    } else if (screen === 'Assets') {
      navigation.navigate('Dashboard', { screen: 'Assets' } as never);
    } else {
      navigation.navigate('More', { screen });
    }
  };

  const handleSignOut = () => {
    clearTechnicianSession();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' as any }],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.profileHeader}>
          <LinearGradient
            colors={gradients.hero as any}
            style={[styles.profileGradient, { paddingTop: insets.top + 16 }]}
          >
            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <User size={32} color={colors.primary} />
                </View>
                <View style={styles.statusBadge}>
                  <CheckCircle size={10} color="#FFF" fill={colors.success} />
                </View>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName} numberOfLines={1}>Fathima Shabiha</Text>
                <View style={styles.profileMetaRow}>
                  <Text style={styles.profileId}>ID: SZ-2024-089</Text>
                  <View style={styles.shiftBadge}>
                    <Text style={styles.shiftText}>Day Shift</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.mainContent}>
          {sections.map((section, sIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            
            {section.title === 'Modules' ? (
              <View style={styles.gridContainer}>
                {section.items.map((item, iIndex) => (
                  <Animated.View 
                    key={item.label}
                    entering={FadeInUp.delay(200 + iIndex * 50)} 
                    style={styles.gridItemWrapper}
                  >
                    <TouchableOpacity
                      onPress={() => handlePress(item.screen, item.label)}
                      style={styles.gridBtn}
                    >
                      <View style={[styles.iconBoxGrid, { backgroundColor: item.color }]}>
                        <item.icon size={22} color={item.iconColor} />
                      </View>
                      <Text style={styles.gridLabel}>{item.label}</Text>
                      <View style={styles.gridArrow}>
                        <ChevronRight size={14} color={colors.mutedForeground} />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Card style={styles.listCard}>
                {section.items.map((item, iIndex) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => item.label === 'Sign Out' ? handleSignOut() : handlePress(item.screen, item.label)}
                    style={[
                      styles.itemBtn,
                      iIndex === section.items.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                      <item.icon size={16} color={item.iconColor} />
                    </View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <LogOut size={16} color={colors.destructive} />
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>
        ))}
        
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>App Version 2.4.1 (Build 89)</Text>
            <Text style={styles.copyrightText}>© 2024 Space Zen Facilities</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mainContent: { paddingHorizontal: 20 },
  profileHeader: {
    marginBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    ...shadows.elevated,
  },
  profileGradient: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.success,
  },
  profileText: {
    gap: 4,
  },
  profileName: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  profileId: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  shiftBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  shiftText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItemWrapper: {
    width: '48%',
  },
  gridBtn: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    ...shadows.card,
    elevation: 2,
    height: 110,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  iconBoxGrid: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.foreground,
    lineHeight: 18,
  },
  gridArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.5,
  },
  listCard: { padding: 0, overflow: 'hidden', backgroundColor: colors.card },
  itemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '26',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.foreground },
  versionInfo: {
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  copyrightText: {
    fontSize: 9,
    color: colors.mutedForeground + '80',
  },
});
