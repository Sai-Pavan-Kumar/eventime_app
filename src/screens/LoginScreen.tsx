import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { GoogleIcon, GithubIcon } from '../components/SocialIcons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import { APP_ASSETS } from '../lib/asset-registry';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const {
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Rate limiting attempts
  const [attempts, setAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

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

  const handleEmailAuth = async () => {
    if (!hasConsented) {
      Alert.alert('Consent Required', 'Please agree to the Data Collection Policy to continue.');
      return;
    }
    if (isLockedOut) {
      Alert.alert('Temporary Lockout', `Too many failed attempts. Please wait ${lockoutSeconds}s before trying again.`);
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Validation Error', 'Please fill in both email and password.');
      return;
    }
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (cleanEmail.length > 100 || password.length > 100) {
      Alert.alert('Input Too Long', 'Email and password must be 100 characters or less.');
      return;
    }

    setIsLoading('email');

    if (isSignUp) {
      const { error, unconfirmed } = await signUpWithEmail(email.trim(), password);
      setIsLoading(null);
      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else if (unconfirmed) {
        Alert.alert(
          'Email Already Registered',
          "You've already signed up with this email. Check your inbox for the latest confirmation link."
        );
      } else {
        Alert.alert('Account Created', 'Please check your email inbox to verify your account, then sign in.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await signInWithEmail(email.trim(), password);
      setIsLoading(null);
      if (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 3) {
          const penaltyMultiplier = Math.pow(2, newAttempts - 3);
          const cooldownSeconds = Math.min(30 * penaltyMultiplier, 300);
          setIsLockedOut(true);
          setLockoutSeconds(cooldownSeconds);

          const interval = setInterval(() => {
            setLockoutSeconds((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                setIsLockedOut(false);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          Alert.alert(
            'Too Many Attempts',
            `Too many failed attempts. Please wait ${cooldownSeconds} seconds before trying again.`
          );
        } else {
          Alert.alert(
            'Login Failed',
            error.message === 'Email not confirmed'
              ? 'Please confirm your email first — check your inbox for the verification link.'
              : 'Invalid email or password.'
          );
        }
      } else {
        setAttempts(0);
        setIsLockedOut(false);
      }
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Enter your email address in the input above first.');
      return;
    }
    Alert.alert(
      'Reset Password',
      `Send password reset link to ${email.trim()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            setIsLoading('reset');
            const { error } = await sendPasswordReset(email.trim());
            setIsLoading(null);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Email Sent', 'Check your inbox for the password reset instructions.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Form Toggle / Form */}
            {!showEmailForm ? (
              <TouchableOpacity
                style={styles.emailToggleBtn}
                onPress={() => setShowEmailForm(true)}
              >
                <Mail size={18} color={theme.colors.brand} />
                <Text style={styles.emailToggleText}>Sign in with Email & Password</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.formContainer}>
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={setEmail}
                      maxLength={100}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Password</Text>
                    {!isSignUp && (
                      <TouchableOpacity onPress={handleForgotPassword}>
                        <Text style={styles.forgotText}>Forgot?</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={password}
                      onChangeText={setPassword}
                      maxLength={100}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={theme.colors.textSecondary} />
                      ) : (
                        <Eye size={18} color={theme.colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Email Submit Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, isLockedOut && styles.disabledButton]}
                  onPress={handleEmailAuth}
                  disabled={isLoading !== null || isLockedOut}
                  activeOpacity={0.85}
                >
                  {isLoading === 'email' ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isSignUp ? 'Create Free Account' : 'Sign In'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Switch between Sign In / Sign Up */}
                <TouchableOpacity
                  style={styles.switchAuthBtn}
                  onPress={() => setIsSignUp(!isSignUp)}
                >
                  <Text style={styles.switchAuthText}>
                    {isSignUp
                      ? 'Already have an account? Sign In'
                      : "Don't have an account? Create one"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
          </View>

          {/* Trust Footer */}
          <View style={styles.trustFooter}>
            <ShieldCheck size={16} color={theme.colors.textSecondary} />
            <Text style={styles.trustText}>Official Supabase Encrypted & RLS Protected</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: theme.spacing.xl,
  },
  brandLogoImage: {
    width: 200,
    height: 50,
    marginBottom: 8,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: theme.colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.brand,
  },
  appName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 28,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: theme.colors.brand,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  subtagline: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconContainer: {
    width: 22,
    height: 22,
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
    marginTop: 10,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
    paddingHorizontal: 10,
  },
  emailToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.brandLight,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
  },
  emailToggleText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: theme.colors.brand,
  },
  formContainer: {
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  forgotText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: theme.colors.brand,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    fontFamily: 'Switzer-Regular',
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: theme.colors.brand,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 8,
    ...theme.shadows.brand,
  },
  disabledButton: {
    backgroundColor: theme.colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 15,
  },
  switchAuthBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  switchAuthText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: theme.colors.brand,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
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
