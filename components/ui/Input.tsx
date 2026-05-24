import React from 'react';
import { View, TextInput, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/app/constants/theme';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  label?: string;
  error?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  leftElement?: React.ReactNode;
}

export const Input = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  label,
  error,
  style,
  inputStyle,
  leftElement,
}: InputProps) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>}
      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: colors.card,
          borderColor: error ? colors.destructive : colors.input 
        }
      ]}>
        {leftElement && <View style={styles.leftElement}>{leftElement}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          style={[styles.input, { color: colors.foreground }, inputStyle]}
        />
      </View>
      {error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  leftElement: {
    marginRight: 10,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
