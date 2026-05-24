import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaintenanceStackParamList } from '@/app/types/navigation';
import { ArrowLeft, MapPin, Navigation as NavIcon, CheckCircle2, Pause } from 'lucide-react-native';
import { COLORS, SHADOWS, useTheme } from '@/app/constants/theme';
import { Button } from '@/components/ui/Button';

export default function NavigateSiteScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const route = useRoute<RouteProp<MaintenanceStackParamList, 'NavigateSite'>>();
  const { id } = route.params;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading map
    setTimeout(() => setLoading(false), 800);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Location</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('WorkOrderDetails', { id, holdWork: true } as any)} 
          style={styles.holdButton}
        >
          <Pause size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <View style={styles.mockMap}>
            <View style={styles.mapPin}>
              <MapPin size={32} color={colors.destructive} />
            </View>
            <View style={styles.pulse} />
          </View>
        )}
      </View>

      <View style={styles.bottomCard}>
        <View style={styles.infoRow}>
          <View style={styles.iconBox}>
            <NavIcon size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>Main HVAC Plant</Text>
            <Text style={styles.locationSubtitle}>10 mins away • 2.4 km</Text>
          </View>
        </View>

        <Button 
          title="Arrived at Site" 
          onPress={() => {
            navigation.navigate('WorkOrderDetails', { id, stepCompleted: 'navigate' } as any);
          }}
          style={styles.arriveBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  mapContainer: {
    flex: 1,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockMap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPin: { zIndex: 2 },
  pulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.destructive + '33',
    top: 2,
  },
  bottomCard: {
    backgroundColor: colors.card,
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...SHADOWS.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
  locationSubtitle: { fontSize: 14, color: colors.mutedForeground },
  arriveBtn: { height: 56, borderRadius: 16 },
});
