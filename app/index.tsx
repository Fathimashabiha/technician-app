import React from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { registerRootComponent } from 'expo';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './constants/theme';

// Ignore specific warnings from dependencies that haven't updated their imports yet
LogBox.ignoreLogs([
  'ProgressBarAndroid has been extracted',
  'Clipboard has been extracted',
  'PushNotificationIOS has been extracted',
]);

export default function App() {
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
