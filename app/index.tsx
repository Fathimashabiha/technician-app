import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { registerRootComponent } from 'expo';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './constants/theme';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

// Ignore specific warnings from dependencies that haven't updated their imports yet
LogBox.ignoreLogs([
  'ProgressBarAndroid has been extracted',
  'Clipboard has been extracted',
  'PushNotificationIOS has been extracted',
]);

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  if (!appReady) {
    return <AppLoadingScreen />;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" translucent backgroundColor="transparent" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

registerRootComponent(App);
