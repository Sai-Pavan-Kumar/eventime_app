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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import {
  Sparkles,
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
  Flame,
  Globe2,
  Calendar,
  Layers,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CITIES } from '../lib/constants/cities';
import { CATEGORIES_LIST, getCategoryMeta } from '../lib/category-config';
import {
  setHasCompletedOnboarding,
  saveGuestPreferences,
  syncPreferencesToSupabase,
  OnboardingData,
} from '../lib/guest-preferences';
import { APP_ASSETS } from '../lib/asset-registry';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(width * 0.65, 240);

export default function OnboardingScreen() {
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
      {/* Top Bar with Step Indicators */}
      <View style={styles.topBar}>
        <View style={styles.topBrandGroup}>
          <Image source={APP_ASSETS.logo} style={styles.topLogo} contentFit="contain" />
          <Text style={styles.topBrandText}>EvenTime</Text>
        </View>

        {step < 6 ? (
          <TouchableOpacity onPress={handleLaunchApp} style={styles.skipPill} activeOpacity={0.7}>
            <Text style={styles.skipPillText}>Skip</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Segmented Step Indicator */}
      <View style={styles.stepIndicatorRow}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            style={[
              styles.stepBarSegment,
              i <= step ? styles.stepBarActive : styles.stepBarInactive,
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
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
        >
          {/* =========================================================================
              STEP 1: What is EvenTime? (1:1 Centered Image + Minimal Punchy Text)
             ========================================================================= */}
          {step === 1 && (
            <View style={styles.stepCard}>
              {/* 1:1 Centered Image Placeholder */}
              <View style={styles.centerImageWrapper}>
                <View style={styles.imageCardSquare}>
                  <Image
                    source={require('../../assets/landing-assets/what1.webp')}
                    style={styles.imageSquare}
                    contentFit="cover"
                  />
                </View>
              </View>

              <View style={styles.badgeRow}>
                <Globe2 size={13} color="#6C47FF" />
                <Text style={styles.badgeText}>ALL INDIA EVENT HUB</Text>
              </View>

              <Text style={styles.headline}>What is EvenTime?</Text>
              <Text style={styles.subheadline}>
                All college fests, hackathons, concerts, and tech summits across India in one single live feed.
              </Text>
            </View>
          )}

          {/* =========================================================================
              STEP 2: What can you explore? (1:1 Centered Image + Minimal Punchy Text)
             ========================================================================= */}
          {step === 2 && (
            <View style={styles.stepCard}>
              {/* 1:1 Centered Image Placeholder */}
              <View style={styles.centerImageWrapper}>
                <View style={styles.imageCardSquare}>
                  <Image
                    source={require('../../assets/landing-assets/why1.webp')}
                    style={styles.imageSquare}
                    contentFit="cover"
                  />
                </View>
              </View>

              <View style={styles.badgeRow}>
                <Layers size={13} color="#6C47FF" />
                <Text style={styles.badgeText}>36+ CATEGORIES</Text>
              </View>

              <Text style={styles.headline}>What can you explore?</Text>
              <Text style={styles.subheadline}>
                From inter-college hackathons and esports to creator meetups and cultural nights — never miss out.
              </Text>
            </View>
          )}

          {/* =========================================================================
              STEP 3: Who are you? (1:1 Centered Image + Persona Cards)
             ========================================================================= */}
          {step === 3 && (
            <View style={styles.stepCard}>
              {/* 1:1 Centered Image Placeholder */}
              <View style={styles.centerImageWrapper}>
                <View style={styles.imageCardSquare}>
                  <Image
                    source={require('../../assets/landing-assets/benefits1.webp')}
                    style={styles.imageSquare}
                    contentFit="cover"
                  />
                </View>
              </View>

              <View style={styles.badgeRow}>
                <Sparkles size={13} color="#6C47FF" />
                <Text style={styles.badgeText}>PERSONALIZATION</Text>
              </View>

              <Text style={styles.headline}>Tell us who you are</Text>
              <Text style={styles.subheadline}>
                Select your persona to customize your event recommendations.
              </Text>

              {/* Persona Options */}
              <View style={{ gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.personaPill, userType === 'student' && styles.personaPillActive]}
                  onPress={() => setUserType('student')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.personaIconBox, userType === 'student' && styles.personaIconBoxActive]}>
                    <GraduationCap size={20} color={userType === 'student' ? '#FFF' : '#6C47FF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personaTitle, userType === 'student' && styles.personaTitleActive]}>
                      College Student
                    </Text>
                    <Text style={styles.personaSubtitle}>Campus fests, hackathons & student perks</Text>
                  </View>
                  {userType === 'student' && (
                    <View style={styles.checkCircle}>
                      <Check size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.personaPill, userType === 'professional' && styles.personaPillActive]}
                  onPress={() => setUserType('professional')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.personaIconBox, userType === 'professional' && styles.personaIconBoxActive]}>
                    <Briefcase size={20} color={userType === 'professional' ? '#FFF' : '#6C47FF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personaTitle, userType === 'professional' && styles.personaTitleActive]}>
                      Working Professional
                    </Text>
                    <Text style={styles.personaSubtitle}>Conferences, founder meetups & summits</Text>
                  </View>
                  {userType === 'professional' && (
                    <View style={styles.checkCircle}>
                      <Check size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.personaPill, userType === 'creator' && styles.personaPillActive]}
                  onPress={() => setUserType('creator')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.personaIconBox, userType === 'creator' && styles.personaIconBoxActive]}>
                    <Palette size={20} color={userType === 'creator' ? '#FFF' : '#6C47FF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personaTitle, userType === 'creator' && styles.personaTitleActive]}>
                      Creator & Organizer
                    </Text>
                    <Text style={styles.personaSubtitle}>Post events in 30s & top city leaderboards</Text>
                  </View>
                  {userType === 'creator' && (
                    <View style={styles.checkCircle}>
                      <Check size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 4: Pick Your Cities (1:1 Centered Visual + All Cities)
             ========================================================================= */}
          {step === 4 && (
            <View style={styles.stepCard}>
              {/* 1:1 Centered Visual Placeholder */}
              <View style={styles.centerImageWrapper}>
                <View style={styles.imageCardSquare}>
                  <Image
                    source={require('../../assets/cities/hyderabad1.webp')}
                    style={styles.imageSquare}
                    contentFit="cover"
                  />
                </View>
              </View>

              <View style={styles.badgeRow}>
                <MapPin size={13} color="#6C47FF" />
                <Text style={styles.badgeText}>LOCATION RADAR</Text>
              </View>

              <View style={styles.titleWithCounter}>
                <Text style={styles.headline}>Pick Your Cities</Text>
                <Text style={styles.counterText}>{preferredCities.length}/3 selected</Text>
              </View>
              <Text style={styles.subheadline}>
                Choose up to 3 cities for your Around You feed.
              </Text>

              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter 32+ Indian cities..."
                  placeholderTextColor="#94A3B8"
                  value={citySearchQuery}
                  onChangeText={setCitySearchQuery}
                />
              </View>

              {/* All Cities Chips */}
              <View style={styles.chipsWrap}>
                {filteredCities.map((cityName) => {
                  const isSelected = preferredCities.includes(cityName);
                  return (
                    <TouchableOpacity
                      key={cityName}
                      style={[styles.cityChip, isSelected && styles.cityChipActive]}
                      onPress={() => toggleCity(cityName)}
                      activeOpacity={0.7}
                    >
                      <MapPin
                        size={12}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>
                        {cityName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 5: Choose Categories (1:1 Centered Visual + All Categories)
             ========================================================================= */}
          {step === 5 && (
            <View style={styles.stepCard}>
              {/* 1:1 Centered Visual Placeholder */}
              <View style={styles.centerImageWrapper}>
                <View style={styles.imageCardSquare}>
                  <Image
                    source={require('../../assets/hero-section-v2.webp')}
                    style={styles.imageSquare}
                    contentFit="cover"
                  />
                </View>
              </View>

              <View style={styles.badgeRow}>
                <Calendar size={13} color="#6C47FF" />
                <Text style={styles.badgeText}>EVENT FORMATS</Text>
              </View>

              <View style={styles.titleWithCounter}>
                <Text style={styles.headline}>What do you like?</Text>
                <Text style={styles.counterText}>{selectedCategories.length}/6 selected</Text>
              </View>
              <Text style={styles.subheadline}>
                Select your favorite categories to calibrate your algorithm.
              </Text>

              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter 36+ categories (Hackathon, Fest)..."
                  placeholderTextColor="#94A3B8"
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                />
              </View>

              {/* All Categories Chips */}
              <View style={styles.chipsWrap}>
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  const meta = getCategoryMeta(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        isSelected && {
                          backgroundColor: meta.accentColor || '#6C47FF',
                          borderColor: meta.accentColor || '#6C47FF',
                        },
                      ]}
                      onPress={() => toggleCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 6: Login & Launch (1:1 Centered Emblem + Launch CTAs)
             ========================================================================= */}
          {step === 6 && (
            <View style={styles.stepCard}>
              {/* 1:1 Centered Passport / Card */}
              <View style={styles.centerImageWrapper}>
                <View style={styles.passportCardSquare}>
                  <Image
                    source={APP_ASSETS.logo}
                    style={styles.passportLogo}
                    contentFit="contain"
                  />
                  <Text style={styles.passportTitle}>EvenTime Pass</Text>
                  <View style={styles.scoreBadge}>
                    <Flame size={12} color="#F59E0B" />
                    <Text style={styles.scoreBadgeText}>+100 ET SCORE</Text>
                  </View>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <Sparkles size={13} color="#6C47FF" />
                <Text style={styles.badgeText}>READY FOR LAUNCH</Text>
              </View>

              <Text style={styles.headline}>Your Feed is Ready.</Text>
              <Text style={styles.subheadline}>
                Sign in to sync your bookmarks across devices, or dive straight in as a guest.
              </Text>

              {/* Google Sign In */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignIn}
                disabled={Boolean(authLoading)}
                activeOpacity={0.85}
              >
                {authLoading === 'google' ? (
                  <ActivityIndicator size="small" color="#1E293B" />
                ) : (
                  <>
                    <Image source={APP_ASSETS.logo} style={styles.googleIcon} contentFit="contain" />
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Alternate Actions */}
              {!showEmailForm ? (
                <View style={styles.altRow}>
                  <TouchableOpacity
                    style={styles.altBtn}
                    onPress={() => setShowEmailForm(true)}
                  >
                    <Mail size={14} color="#6C47FF" />
                    <Text style={styles.altBtnText}>Email Sign-in</Text>
                  </TouchableOpacity>

                  <Text style={{ color: '#CBD5E1' }}>•</Text>

                  <TouchableOpacity
                    style={styles.altBtn}
                    onPress={handleLaunchApp}
                    disabled={isSaving}
                  >
                    <Text style={styles.guestText}>Explore as Guest</Text>
                    <ArrowRight size={13} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emailBox}>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Email address"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <View style={styles.passRow}>
                    <TextInput
                      style={{ flex: 1, fontSize: 14, color: '#0F172A' }}
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
                    style={styles.emailSubmitBtn}
                    onPress={handleEmailAuth}
                    disabled={Boolean(authLoading)}
                  >
                    {authLoading === 'email' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.emailSubmitText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
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

      {/* Bottom Bar with Back & Continue Buttons (Steps 1-5) */}
      {step < 6 && (
        <View style={styles.bottomBar}>
          {step > 1 ? (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
              <ArrowLeft size={18} color="#64748B" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.88}>
            <Text style={styles.nextBtnText}>Continue</Text>
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
    backgroundColor: '#FAFAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  topBrandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topLogo: {
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  topBrandText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  skipPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  skipPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 8,
  },
  stepBarSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  stepBarActive: {
    backgroundColor: '#6C47FF',
  },
  stepBarInactive: {
    backgroundColor: '#E2E8F0',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  stepCard: {
    flex: 1,
  },
  centerImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  imageCardSquare: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageSquare: {
    width: '100%',
    height: '100%',
  },
  passportCardSquare: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 24,
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(108, 71, 255, 0.3)',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  passportLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  passportTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108, 71, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6C47FF',
    letterSpacing: 0.8,
  },
  headline: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 6,
  },
  titleWithCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C47FF',
  },
  subheadline: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  personaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  personaPillActive: {
    borderColor: '#6C47FF',
    backgroundColor: '#FAF8FF',
  },
  personaIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaIconBoxActive: {
    backgroundColor: '#6C47FF',
  },
  personaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  personaTitleActive: {
    color: '#6C47FF',
  },
  personaSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityChipActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  cityChipTextActive: {
    color: '#FFFFFF',
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  googleBtn: {
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
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  altBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  altBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C47FF',
  },
  guestText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  emailBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
    marginTop: 6,
  },
  emailInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emailSubmitBtn: {
    backgroundColor: '#6C47FF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emailSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
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
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
