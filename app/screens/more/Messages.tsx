import React from 'react';
import { View, Text } from 'react-native';
import { globalStyles } from '@/app/constants/theme';

export default function Messages() {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Messages Placeholder</Text>
    </View>
  );
}

