import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Shield, Mail } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LIGHT_COLORS, LIGHT_GRADIENTS, SHADOWS } from '@/app/constants/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Use light colors directly — login is always light theme
const C = LIGHT_COLORS;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!email.includes('@')) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.replace('Main', undefined);
    }, 1500);
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', C.background]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../../assets/spacezen.jpeg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSub}>Enter your email address to continue</Text>

            {/* Email Input */}
            <View style={styles.inputRow}>
              <Mail size={18} color={C.mutedForeground} style={{ marginLeft: 14 }} />
              <TextInput
                style={styles.emailInput}
                placeholder="Email address"
                placeholderTextColor={C.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading || !email.includes('@')}
              activeOpacity={0.85}
              style={{ marginTop: 24 }}
            >
              <LinearGradient
                colors={email.includes('@') ? LIGHT_GRADIENTS.primary as any : [C.muted, C.muted]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.loginButton, !email.includes('@') && { opacity: 0.5 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Login</Text>
                    <ChevronRight size={18} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.securityRow}>
              <Shield size={13} color={C.mutedForeground} />
              <Text style={styles.securityText}>Secured with enterprise-grade encryption</Text>
            </View>
          </View>

          <Text style={styles.footerText}>CMMS v2.4.1 • Enterprise Edition</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 320,
    height: 180,
  },
  card: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOWS.card,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: C.foreground,
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 14,
    color: C.mutedForeground,
    marginBottom: 28,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    height: 56,
    gap: 8,
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    color: C.foreground,
  },
  loginButton: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...SHADOWS.glowTeal,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  securityText: {
    fontSize: 12,
    color: C.mutedForeground,
  },
  footerText: {
    marginTop: 32,
    fontSize: 12,
    color: C.mutedForeground,
  },
});
