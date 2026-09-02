import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import {
  GraduationCap,
  Briefcase,
  Palette,
  Search,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Mail,
  Check,
  Eye,
  EyeOff,
  ImageIcon,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CITIES } from '../lib/constants/cities';
import { CATEGORIES_LIST, getCategoryMeta } from '../lib/category-config';
import {
  setHasCompletedOnboarding,
  saveGuestPreferences,
  syncPreferencesToSupabase,
  OnboardingData,
} from '../lib/guest-preferences';
import { APP_ASSETS } from '../lib/asset-registry';

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const {
    user,
    profile,
    refreshProfile,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [userType, setUserType] = useState<'student' | 'professional' | 'creator'>('student');
  const [fullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');

  // Cities (Max 3)
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [preferredCities, setPreferredCities] = useState<string[]>(
    profile?.preferred_cities && profile.preferred_cities.length > 0
      ? profile.preferred_cities
      : ['Hyderabad', 'Bengaluru']
  );

  // Categories / Interests (Max 6)
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile?.goals && profile.goals.length > 0
      ? profile.goals
      : ['Hackathon', 'AI Event', 'Tech Event', 'College Fest']
  );

  // Auth States for Step 6
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState<string | null>(null);

  // Responsive Dimensions
  const isSmallDevice = height < 700;
  const placeholderSize = isSmallDevice
    ? Math.min(width * 0.45, 160)
    : step >= 4
    ? Math.min(width * 0.38, 140)
    : Math.min(width * 0.58, 220);

  const toggleCity = (cityName: string) => {
    if (preferredCities.includes(cityName)) {
      if (preferredCities.length > 1) {
        setPreferredCities(preferredCities.filter((item) => item !== cityName));
      }
    } else {
      if (preferredCities.length >= 3) {
        Alert.alert('Limit Reached', 'You can choose up to 3 cities.');
        return;
      }
      setPreferredCities([...preferredCities, cityName]);
    }
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((item) => item !== cat));
      }
    } else {
      if (selectedCategories.length >= 6) {
        Alert.alert('Limit Reached', 'You can choose up to 6 categories.');
        return;
      }
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return CITIES;
    return CITIES.filter((c) =>
      c.toLowerCase().includes(citySearchQuery.trim().toLowerCase())
    );
  }, [citySearchQuery]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return CATEGORIES_LIST;
    return CATEGORIES_LIST.filter((cat) =>
      cat.toLowerCase().includes(categorySearchQuery.trim().toLowerCase())
    );
  }, [categorySearchQuery]);

  const currentOnboardingData: OnboardingData = {
    userType,
    fullName,
    preferredCities,
    goals: selectedCategories,
  };

  const handleNext = () => {
    if (step === 4 && preferredCities.length === 0) {
      Alert.alert('City Required', 'Please select at least 1 city.');
      return;
    }
    if (step === 5 && selectedCategories.length === 0) {
      Alert.alert('Category Required', 'Please select at least 1 category.');
      return;
    }
    if (step < 6) {
      setStep((prev) => (prev + 1) as any);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const handleLaunchApp = async () => {
    setIsSaving(true);
    await saveGuestPreferences(currentOnboardingData);
    await setHasCompletedOnboarding(true);
    setIsSaving(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading('google');
    const { error } = await signInWithGoogle();
    setAuthLoading(null);
    if (error) {
      Alert.alert('Sign-In Error', error.message || 'Could not complete Google Sign-In.');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      await syncPreferencesToSupabase(sessionData.session.user.id, currentOnboardingData);
      await refreshProfile();
      await setHasCompletedOnboarding(true);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required', 'Please enter email and password.');
      return;
    }
    setAuthLoading('email');
    if (isSignUp) {
      const { error, unconfirmed } = await signUpWithEmail(email.trim(), password);
      setAuthLoading(null);
      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else if (unconfirmed) {
        Alert.alert('Email Registered', 'Please sign in with this email.');
        setIsSignUp(false);
      } else {
        await saveGuestPreferences(currentOnboardingData);
        Alert.alert('Account Created', 'Check your email to verify, then sign in.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await signInWithEmail(email.trim(), password);
      setAuthLoading(null);
      if (error) {
        Alert.alert('Sign In Failed', error.message);
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          await syncPreferencesToSupabase(sessionData.session.user.id, currentOnboardingData);
          await refreshProfile();
        }
        await setHasCompletedOnboarding(true);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <Image source={APP_ASSETS.logo} style={styles.brandLogo} contentFit="contain" />
          <Text style={styles.brandTitle}>EvenTime</Text>
        </View>

        {step < 6 && (
          <TouchableOpacity onPress={handleLaunchApp} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Step Bar */}
      <View style={styles.stepProgressBar}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            style={[
              styles.stepBarItem,
              i <= step ? styles.stepBarItemActive : styles.stepBarItemInactive,
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            (step === 1 || step === 2 || step === 6) && styles.centeredScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* =========================================================================
              STEP 1: What is EvenTime? (Centered 1:1 Placeholder + Title + Subtitle)
             ========================================================================= */}
          {step === 1 && (
            <View style={styles.screenWrapper}>
              {/* 1:1 Image Placeholder */}
              <View
                style={[
                  styles.imagePlaceholderBox,
                  { width: placeholderSize, height: placeholderSize },
                ]}
              >
                <ImageIcon size={32} color="#94A3B8" />
                <Text style={styles.placeholderLabel}>1:1 Image</Text>
              </View>

              <Text style={styles.headlineText}>What is EvenTime?</Text>
              <Text style={styles.subheadlineText}>
                All college fests, hackathons, concerts, and tech summits across India in one single live feed.
              </Text>
            </View>
          )}

          {/* =========================================================================
              STEP 2: What can you explore? (Centered 1:1 Placeholder + Title + Subtitle)
             ========================================================================= */}
          {step === 2 && (
            <View style={styles.screenWrapper}>
              {/* 1:1 Image Placeholder */}
              <View
                style={[
                  styles.imagePlaceholderBox,
                  { width: placeholderSize, height: placeholderSize },
                ]}
              >
                <ImageIcon size={32} color="#94A3B8" />
                <Text style={styles.placeholderLabel}>1:1 Image</Text>
              </View>

              <Text style={styles.headlineText}>What can you explore?</Text>
              <Text style={styles.subheadlineText}>
                From inter-college hackathons and esports to creator meetups and cultural nights — never miss out.
              </Text>
            </View>
          )}

          {/* =========================================================================
              STEP 3: Tell us who you are (1:1 Placeholder + Persona Cards)
             ========================================================================= */}
          {step === 3 && (
            <View style={styles.screenWrapper}>
              {/* 1:1 Image Placeholder */}
              <View
                style={[
                  styles.imagePlaceholderBox,
                  { width: placeholderSize, height: placeholderSize },
                ]}
              >
                <ImageIcon size={28} color="#94A3B8" />
                <Text style={styles.placeholderLabel}>1:1 Image</Text>
              </View>

              <Text style={styles.headlineText}>Tell us who you are</Text>
              <Text style={styles.subheadlineText}>
                Select your persona to customize your event recommendations.
              </Text>

              {/* Persona Cards */}
              <View style={styles.personaContainer}>
                <TouchableOpacity
                  style={[styles.personaCard, userType === 'student' && styles.personaCardActive]}
                  onPress={() => setUserType('student')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.personaIconContainer, userType === 'student' && styles.personaIconContainerActive]}>
                    <GraduationCap size={20} color={userType === 'student' ? '#FFFFFF' : '#6C47FF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personaCardTitle, userType === 'student' && styles.personaCardTitleActive]}>
                      College Student
                    </Text>
                    <Text style={styles.personaCardSubtitle}>Campus fests, hackathons & student perks</Text>
                  </View>
                  {userType === 'student' && (
                    <View style={styles.checkBadge}>
                      <Check size={13} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.personaCard, userType === 'professional' && styles.personaCardActive]}
                  onPress={() => setUserType('professional')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.personaIconContainer, userType === 'professional' && styles.personaIconContainerActive]}>
                    <Briefcase size={20} color={userType === 'professional' ? '#FFFFFF' : '#6C47FF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personaCardTitle, userType === 'professional' && styles.personaCardTitleActive]}>
                      Working Professional
                    </Text>
                    <Text style={styles.personaCardSubtitle}>Conferences, founder meetups & summits</Text>
                  </View>
                  {userType === 'professional' && (
                    <View style={styles.checkBadge}>
                      <Check size={13} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.personaCard, userType === 'creator' && styles.personaCardActive]}
                  onPress={() => setUserType('creator')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.personaIconContainer, userType === 'creator' && styles.personaIconContainerActive]}>
                    <Palette size={20} color={userType === 'creator' ? '#FFFFFF' : '#6C47FF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personaCardTitle, userType === 'creator' && styles.personaCardTitleActive]}>
                      Creator & Organizer
                    </Text>
                    <Text style={styles.personaCardSubtitle}>Post events in 30s & top city leaderboards</Text>
                  </View>
                  {userType === 'creator' && (
                    <View style={styles.checkBadge}>
                      <Check size={13} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 4: Pick Your Cities (1:1 Placeholder + All Cities Chips)
             ========================================================================= */}
          {step === 4 && (
            <View style={styles.screenWrapper}>
              {/* 1:1 Image Placeholder */}
              <View
                style={[
                  styles.imagePlaceholderBox,
                  { width: placeholderSize, height: placeholderSize },
                ]}
              >
                <MapPin size={26} color="#94A3B8" />
                <Text style={styles.placeholderLabel}>1:1 Image</Text>
              </View>

              <Text style={styles.headlineText}>Pick Your Cities</Text>
              <Text style={styles.subheadlineText}>
                Choose up to 3 cities ({preferredCities.length}/3 selected)
              </Text>

              {/* Search Bar */}
              <View style={styles.searchInputWrapper}>
                <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Search 32+ Indian cities..."
                  placeholderTextColor="#94A3B8"
                  value={citySearchQuery}
                  onChangeText={setCitySearchQuery}
                />
              </View>

              {/* All Cities Chips */}
              <View style={styles.chipsContainer}>
                {filteredCities.map((cityName) => {
                  const isSelected = preferredCities.includes(cityName);
                  return (
                    <TouchableOpacity
                      key={cityName}
                      style={[styles.chipItem, isSelected && styles.chipItemActive]}
                      onPress={() => toggleCity(cityName)}
                      activeOpacity={0.7}
                    >
                      <MapPin
                        size={11}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {cityName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 5: What do you like? (1:1 Placeholder + All Categories Chips)
             ========================================================================= */}
          {step === 5 && (
            <View style={styles.screenWrapper}>
              {/* 1:1 Image Placeholder */}
              <View
                style={[
                  styles.imagePlaceholderBox,
                  { width: placeholderSize, height: placeholderSize },
                ]}
              >
                <Sparkles size={26} color="#94A3B8" />
                <Text style={styles.placeholderLabel}>1:1 Image</Text>
              </View>

              <Text style={styles.headlineText}>What do you like?</Text>
              <Text style={styles.subheadlineText}>
                Select up to 6 categories ({selectedCategories.length}/6 selected)
              </Text>

              {/* Search Bar */}
              <View style={styles.searchInputWrapper}>
                <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Search 36+ categories (Hackathon, Fest)..."
                  placeholderTextColor="#94A3B8"
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                />
              </View>

              {/* All Categories Chips */}
              <View style={styles.chipsContainer}>
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  const meta = getCategoryMeta(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chipItem,
                        isSelected && {
                          backgroundColor: meta.accentColor || '#6C47FF',
                          borderColor: meta.accentColor || '#6C47FF',
                        },
                      ]}
                      onPress={() => toggleCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 6: Your Feed is Ready (1:1 Placeholder + Launch Actions)
             ========================================================================= */}
          {step === 6 && (
            <View style={styles.screenWrapper}>
              {/* 1:1 Image Placeholder */}
              <View
                style={[
                  styles.imagePlaceholderBox,
                  { width: placeholderSize, height: placeholderSize },
                ]}
              >
                <ImageIcon size={32} color="#94A3B8" />
                <Text style={styles.placeholderLabel}>1:1 Image</Text>
              </View>

              <Text style={styles.headlineText}>Your Feed is Ready</Text>
              <Text style={styles.subheadlineText}>
                Sign in to sync your bookmarks, or dive straight in as a guest.
              </Text>

              {/* Google Button */}
              <TouchableOpacity
                style={styles.googleActionBtn}
                onPress={handleGoogleSignIn}
                disabled={Boolean(authLoading)}
                activeOpacity={0.85}
              >
                {authLoading === 'google' ? (
                  <ActivityIndicator size="small" color="#1E293B" />
                ) : (
                  <>
                    <Image source={APP_ASSETS.logo} style={styles.googleBtnLogo} contentFit="contain" />
                    <Text style={styles.googleActionText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Guest & Email Options */}
              {!showEmailForm ? (
                <View style={styles.secondaryActionsRow}>
                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    onPress={() => setShowEmailForm(true)}
                  >
                    <Mail size={14} color="#6C47FF" />
                    <Text style={styles.secondaryActionText}>Email Sign-in</Text>
                  </TouchableOpacity>

                  <Text style={{ color: '#CBD5E1' }}>•</Text>

                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    onPress={handleLaunchApp}
                    disabled={isSaving}
                  >
                    <Text style={styles.guestActionText}>Explore as Guest</Text>
                    <ArrowRight size={13} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emailContainer}>
                  <TextInput
                    style={styles.emailField}
                    placeholder="Email address"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <View style={styles.passwordFieldRow}>
                    <TextInput
                      style={{ flex: 1, fontSize: 13, color: '#0F172A' }}
                      placeholder="Password"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.emailSubmitButton}
                    onPress={handleEmailAuth}
                    disabled={Boolean(authLoading)}
                  >
                    {authLoading === 'email' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.emailSubmitButtonText}>
                        {isSignUp ? 'Create Account' : 'Sign In'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6C47FF', fontWeight: '700' }}>
                      {isSignUp ? 'Already registered? Sign In' : 'New user? Create Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Bar (Steps 1-5) */}
      {step < 6 && (
        <View style={styles.bottomNavigationBar}>
          {step > 1 ? (
            <TouchableOpacity style={styles.navBackBtn} onPress={handleBack} activeOpacity={0.7}>
              <ArrowLeft size={18} color="#64748B" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}

          <TouchableOpacity style={styles.navNextBtn} onPress={handleNext} activeOpacity={0.88}>
            <Text style={styles.navNextBtnText}>Continue</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepProgressBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 6,
    marginBottom: 8,
  },
  stepBarItem: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  stepBarItemActive: {
    backgroundColor: '#6C47FF',
  },
  stepBarItemInactive: {
    backgroundColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  centeredScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  screenWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  imagePlaceholderBox: {
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 6,
  },
  placeholderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  headlineText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subheadlineText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  personaContainer: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  personaCardActive: {
    borderColor: '#6C47FF',
    backgroundColor: '#FAF8FF',
  },
  personaIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaIconContainerActive: {
    backgroundColor: '#6C47FF',
  },
  personaCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  personaCardTitleActive: {
    color: '#6C47FF',
  },
  personaCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  chipsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipItemActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  googleActionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  googleBtnLogo: {
    width: 20,
    height: 20,
  },
  googleActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C47FF',
  },
  guestActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  emailContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
    marginTop: 6,
  },
  emailField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  passwordFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emailSubmitButton: {
    backgroundColor: '#6C47FF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emailSubmitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomNavigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  navBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navNextBtn: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C47FF',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  navNextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
