import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, Wrench, Package, Clock, QrCode, LayoutGrid } from 'lucide-react-native';
import { useTheme } from '@/app/constants/theme';
import { TabParamList } from '@/app/types/navigation';
import { LinearGradient } from 'expo-linear-gradient';

import DashboardScreen from '@/app/screens/dashboard/dashboard';
import MaintenanceScreen from '@/app/screens/maintenance/maintenance';
import InventoryScreen from '@/app/screens/more/Inventory';
import HistoryScreen from '@/app/screens/more/History';
import AssetsScreen from '@/app/screens/more/Assets';
import HSEScreen from '@/app/screens/more/HSE';
import InspectionsScreen from '@/app/screens/more/Inspections';
import MeterReadingScreen from '@/app/screens/more/MeterReading';
import PPMScreen from '@/app/screens/more/PPM';
import SnaggingScreen from '@/app/screens/more/Snagging';
import TimesheetScreen from '@/app/screens/more/Timesheet';
import WorkOrderDetailsScreen from '@/app/screens/maintenance/workOrderDetails';
import PartsUsageScreen from '@/app/screens/maintenance/PartsUsage';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="Assets" component={AssetsScreen} />
      <Stack.Screen name="HSE" component={HSEScreen} />
      <Stack.Screen name="Inspections" component={InspectionsScreen} />
      <Stack.Screen name="MeterReading" component={MeterReadingScreen} />
      <Stack.Screen name="PPM" component={PPMScreen} />
      <Stack.Screen name="Snagging" component={SnaggingScreen} />
      <Stack.Screen name="Timesheet" component={TimesheetScreen} />
    </Stack.Navigator>
  );
}

import NavigateSiteScreen from '@/app/screens/maintenance/NavigateSiteScreen';
import PhotoCaptureScreen from '@/app/screens/maintenance/PhotoCaptureScreen';
import ChecklistScreen from '@/app/screens/maintenance/ChecklistScreen';
import SignatureScreen from '@/app/screens/maintenance/SignatureScreen';
import WorkOrderResultScreen from '@/app/screens/maintenance/WorkOrderResultScreen';
import ProcedureScreen from '@/app/screens/maintenance/ProcedureScreen';
import DiagnosisScreen from '../screens/maintenance/Diagnosis';
import AssetDetailsScreen from '@/app/screens/maintenance/AssetDetailsScreen';
import AssetScannerScreen from '@/app/screens/scan/AssetScannerScreen';
import CreateWorkOrderScreen from '@/app/screens/maintenance/CreateWorkOrderScreen';
import RequestListScreen from '@/app/screens/maintenance/RequestListScreen';

function MaintenanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MaintenanceHome" component={MaintenanceScreen} />
      <Stack.Screen name="WorkOrderDetails" component={WorkOrderDetailsScreen} />
      <Stack.Screen name="NavigateSite" component={NavigateSiteScreen} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} />
      <Stack.Screen name="Checklist" component={ChecklistScreen} />
      <Stack.Screen name="Diagnosis" component={DiagnosisScreen} />
      <Stack.Screen name="Signature" component={SignatureScreen} />
      <Stack.Screen name="PartsUsage" component={PartsUsageScreen} />
      <Stack.Screen name="WorkOrderResult" component={WorkOrderResultScreen} />
      <Stack.Screen name="Procedure" component={ProcedureScreen} />
      <Stack.Screen name="AssetDetails" component={AssetDetailsScreen} />
      <Stack.Screen name="WorkOrderQRScan" component={AssetScannerScreen} />
      <Stack.Screen name="CreateWorkOrder" component={CreateWorkOrderScreen} />
      <Stack.Screen name="RequestList" component={RequestListScreen} />
    </Stack.Navigator>
  );
}

function ScanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssetScanHome" component={AssetScannerScreen} />
      <Stack.Screen name="AssetDetails" component={AssetDetailsScreen} />
    </Stack.Navigator>
  );
}

function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InventoryHome" component={InventoryScreen} />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryHome" component={HistoryScreen} />
      <Stack.Screen name="WorkOrderDetails" component={WorkOrderDetailsScreen} />
    </Stack.Navigator>
  );
}

const CustomTabBarButton = ({ children, onPress }: any) => {
  const { gradients, colors } = useTheme();
  return (
    <TouchableOpacity
      style={styles.customButtonContainer}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.customButtonRing, { borderColor: colors.card }]}>
        <LinearGradient
          colors={gradients.primary as any}
          style={styles.customButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {children}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

export default function TabNavigator() {
  const { colors, shadows } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          position: 'absolute',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Maintenance"
        component={MaintenanceStack}
        options={{
          tabBarIcon: ({ color, size }) => <Wrench size={size} color={color} />,
          tabBarLabel: 'Task',
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Maintenance', { screen: 'MaintenanceHome' });
          },
        })}
      />
      <Tab.Screen
        name="Scan"
        component={ScanStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <QrCode size={30} color="#FFF" />
          ),
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarLabel: '',
        }}
      />

      <Tab.Screen
        name="Inventory"
        component={InventoryStack}
        options={{
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
          tabBarLabel: 'Inventory',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        options={{
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
          tabBarLabel: 'History',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  customButtonContainer: {
    top: -12, // Reverted to previous floating height
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButtonRing: {
    width: 56, // Smaller circle as requested
    height: 56,
    borderRadius: 28,
    backgroundColor: 'transparent',
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  customButtonGradient: {
    width: 46, // Proportional inner circle
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10, // Shifted the icon even further down as requested
  },
});
