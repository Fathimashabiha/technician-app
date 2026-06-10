import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '@/app/types/navigation';
import { useTheme } from '@/app/constants/theme';

/** Legacy route — forwards to PpmExecutionDetails (work-order style step screens). */
export default function PPMExecution() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const route = useRoute<RouteProp<MoreStackParamList, 'PPMExecution'>>();
  const { colors } = useTheme();

  useEffect(() => {
    navigation.replace('PpmExecutionDetails', {
      scheduleId: route.params.scheduleId,
      title: route.params.title,
      assetId: route.params.assetId,
    });
  }, [navigation, route.params]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
