import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react-native';
import { GoogleIcon, GithubIcon } from '../components/SocialIcons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import { APP_ASSETS } from '../lib/asset-registry';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const {
    signInWithGoogle,
    signInWithGithub,
  } = useAuth();

  const [hasConsented, setHasConsented] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    if (!hasConsented) {
      Alert.alert('Consent Required', 'Please agree to the Data Collection Policy to continue.');
      return;
    }
    setIsLoading('google');
    const { error } = await signInWithGoogle();
    setIsLoading(null);
    if (error) {
      Alert.alert('Sign-In Error', error.message || 'Could not complete Google Sign-In.');
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs');
      }
    }
  };

  const handleGithubLogin = async () => {
    if (!hasConsented) {
      Alert.alert('Consent Required', 'Please agree to the Data Collection Policy to continue.');
      return;
    }
    setIsLoading('github');
    const { error } = await signInWithGithub();
    setIsLoading(null);
    if (error) {
      Alert.alert('Sign-In Error', error.message || 'Could not complete GitHub Sign-In.');
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <Image
            source={APP_ASSETS.logo}
            style={styles.brandLogoImage}
            contentFit="contain"
          />
          <Text style={styles.tagline}>Stop Searching. Start Attending.</Text>
          <Text style={styles.subtagline}>
            India's cleanest directory for tech, college, and professional events.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.badgeContainer}>
            <Sparkles size={14} color={theme.colors.brand} />
            <Text style={styles.badgeText}>Fast 1-Click Access</Text>
          </View>
          <Text style={styles.cardTitle}>Sign In to EvenTime</Text>
          <Text style={styles.cardSubtitle}>
            Continue with your preferred developer or social profile.
          </Text>

          {/* Consent Policy Toggle */}
          <View style={styles.consentRow}>
            <TouchableOpacity
              style={[styles.checkbox, hasConsented && styles.checkboxChecked]}
              onPress={() => setHasConsented(!hasConsented)}
              activeOpacity={0.8}
            >
              {hasConsented && <CheckCircle2 size={16} color="#FFF" />}
            </TouchableOpacity>
            <Text style={styles.consentText}>
              I agree to the{' '}
              <Text
                style={styles.consentLink}
                onPress={() => navigation.navigate('PrivacyPolicy')}
              >
                Data Collection Policy
              </Text>{' '}
              and{' '}
              <Text
                style={styles.consentLink}
                onPress={() => navigation.navigate('Terms')}
              >
                Terms of Service
              </Text>.
            </Text>
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.85}
            onPress={handleGoogleLogin}
            disabled={isLoading !== null}
          >
            {isLoading === 'google' ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <View style={styles.googleContent}>
                <View style={styles.googleIconContainer}>
                  <GoogleIcon size={20} />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* GitHub Sign In Button */}
          <TouchableOpacity
            style={styles.githubButton}
            activeOpacity={0.85}
            onPress={handleGithubLogin}
            disabled={isLoading !== null}
          >
            {isLoading === 'github' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.googleContent}>
                <View style={styles.githubIconContainer}>
                  <GithubIcon size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.githubButtonText}>Continue with GitHub</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Trust Footer */}
        <View style={styles.trustFooter}>
          <ShieldCheck size={16} color={theme.colors.textSecondary} />
          <Text style={styles.trustText}>Zero password risk • Instant encrypted session</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  brandLogoImage: {
    width: 64,
    height: 64,
    marginBottom: theme.spacing.md,
  },
  tagline: {
    fontFamily: 'Switzer-Bold',
    fontSize: 22,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtagline: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 6,
    marginBottom: 10,
  },
  badgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: theme.colors.brand,
  },
  cardTitle: {
    fontFamily: 'Switzer-Bold',
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  consentText: {
    fontFamily: 'Switzer-Regular',
    flex: 1,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  consentLink: {
    fontFamily: 'Switzer-Bold',
    color: theme.colors.textPrimary,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleButtonText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  githubButton: {
    backgroundColor: '#1E293B',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  githubIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  githubButtonText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  trustText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
