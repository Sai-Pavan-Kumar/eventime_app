import React, { useState, useMemo, useEffect } from 'react';
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
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import {
  GraduationCap,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Mail,
  Check,
  Eye,
  EyeOff,
  ImageIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CITIES } from '../lib/constants/cities';
import { CATEGORIES_LIST, getCategoryMeta } from '../lib/category-config';
import { INDIAN_COLLEGE_BRANCHES } from '../lib/constants/branches';
import {
  setHasCompletedOnboarding,
  saveGuestPreferences,
  syncPreferencesToSupabase,
  OnboardingData,
} from '../lib/guest-preferences';
import { APP_ASSETS } from '../lib/asset-registry';

const POPULAR_CATEGORIES = [
  'Hackathon',
  'AI Event',
  'College Fest',
  'Concert',
  'Developer Event',
  'Startup Event',
  'Tech Event',
  'Gaming & Esports',
  'Music Festival',
  'Workshop',
] as const;

const COMMON_BRANCHES = [
  'CSE',
  'AI & ML',
  'Data Science',
  'ECE',
  'IT',
  'EEE',
  'Mechanical',
  'Civil',
  'Other',
];

const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029+'];

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

  // Navigation step (1: Intro, 2: Explore, 3: Persona, 4: Campus (if student), 5: Cities, 6: Categories, 7: Launch)
  const [step, setStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [userType, setUserType] = useState<'student' | 'professional'>('student');
  const [fullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');

  // Campus Form (Only for students)
  const [collegeName, setCollegeName] = useState(profile?.college || '');
  const [collegeSuggestions, setCollegeSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(profile?.college_id || null);
  const [branch, setBranch] = useState(profile?.branch || 'CSE');
  const [graduationYear, setGraduationYear] = useState(profile?.graduation_year?.toString() || '2026');

  // Cities (No default pre-selection)
  const [preferredCities, setPreferredCities] = useState<string[]>(
    profile?.preferred_cities && profile.preferred_cities.length > 0
      ? profile.preferred_cities
      : []
  );

  // Categories (No default pre-selection, popular 10 first)
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile?.goals && profile.goals.length > 0
      ? profile.goals
      : []
  );

  // Auth States for Launch Step
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState<string | null>(null);

  // Responsive Dimensions
  const isSmallDevice = height < 700;
  const placeholderSize = isSmallDevice
    ? Math.min(width * 0.42, 150)
    : step >= 4
    ? Math.min(width * 0.35, 130)
    : Math.min(width * 0.55, 210);

  // Total steps: 7 if student, 6 if professional
  const totalSteps = userType === 'student' ? 7 : 6;

  // Search colleges from supabase
  useEffect(() => {
    if (collegeName.trim().length >= 2 && !selectedCollegeId) {
      const searchColleges = async () => {
        try {
          const { data } = await supabase
            .from('colleges')
            .select('id, name')
            .ilike('name', `%${collegeName.trim()}%`)
            .limit(5);
          if (data) setCollegeSuggestions(data);
        } catch {
          // ignore error
        }
      };
      const timer = setTimeout(searchColleges, 300);
      return () => clearTimeout(timer);
    } else {
      setCollegeSuggestions([]);
    }
  }, [collegeName, selectedCollegeId]);

  // Branch suggestions filtered from 170+ branches
  const branchSuggestions = useMemo(() => {
    if (!branch.trim() || branch.trim().length < 1) return [];
    return INDIAN_COLLEGE_BRANCHES.filter(
      (b) =>
        b.toLowerCase().includes(branch.trim().toLowerCase()) &&
        b.toLowerCase() !== branch.trim().toLowerCase()
    ).slice(0, 5);
  }, [branch]);

  // Hardware Back Button Handler (Android)
  useEffect(() => {
    const onBackPress = () => {
      if (step > 1) {
        handleBack();
        return true; // prevent app from closing
      }
      return false; // let system handle (exit app on first screen)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [step, userType]);

  const toggleCity = (cityName: string) => {
    if (preferredCities.includes(cityName)) {
      setPreferredCities(preferredCities.filter((item) => item !== cityName));
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
      setSelectedCategories(selectedCategories.filter((item) => item !== cat));
    } else {
      if (selectedCategories.length >= 6) {
        Alert.alert('Limit Reached', 'You can choose up to 6 categories.');
        return;
      }
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const currentOnboardingData: OnboardingData = {
    userType,
    fullName,
    college: userType === 'student' ? collegeName : undefined,
    collegeId: userType === 'student' ? selectedCollegeId : undefined,
    branch: userType === 'student' ? branch : undefined,
    graduationYear: userType === 'student' ? graduationYear : undefined,
    preferredCities,
    goals: selectedCategories,
  };

  const handleNext = () => {
    // Step 1 -> 2
    if (step === 1) {
      setStep(2);
      return;
    }
    // Step 2 -> 3
    if (step === 2) {
      setStep(3);
      return;
    }
    // Step 3 (Persona) -> 4 (Campus if student, or Cities if pro)
    if (step === 3) {
      if (userType === 'student') {
        setStep(4); // Campus details
      } else {
        setStep(5); // Skip campus, go to cities
      }
      return;
    }
    // Step 4 (Campus) -> 5 (Cities)
    if (step === 4) {
      if (!collegeName.trim()) {
        Alert.alert('College Required', 'Please enter your college name.');
        return;
      }
      setStep(5);
      return;
    }
    // Step 5 (Cities) -> 6 (Categories)
    if (step === 5) {
      if (preferredCities.length === 0) {
        Alert.alert('City Required', 'Please select at least 1 city.');
        return;
      }
      setStep(6);
      return;
    }
    // Step 6 (Categories) -> 7 (Launch)
    if (step === 6) {
      if (selectedCategories.length === 0) {
        Alert.alert('Category Required', 'Please select at least 1 category.');
        return;
      }
      setStep(7);
      return;
    }
  };

  const handleBack = () => {
    if (step === 5 && userType === 'professional') {
      setStep(3); // Go back directly to persona if pro
    } else if (step > 1) {
      setStep((prev) => prev - 1);
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

  // Visible Categories list based on expanded toggle
  const visibleCategories = useMemo(() => {
    if (showAllCategories) return CATEGORIES_LIST;
    return POPULAR_CATEGORIES;
  }, [showAllCategories]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <Image source={APP_ASSETS.logo} style={styles.brandLogo} contentFit="contain" />
          <Text style={styles.brandTitle}>EvenTime</Text>
        </View>

        {step < 7 && (
          <TouchableOpacity onPress={handleLaunchApp} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented Step Bar */}
      <View style={styles.stepProgressBar}>
        {Array.from({ length: totalSteps }, (_, idx) => idx + 1).map((i) => {
          const currentVisualStep =
            userType === 'professional' && step >= 5 ? step - 1 : step;
          return (
            <View
              key={i}
              style={[
                styles.stepBarItem,
                i <= currentVisualStep ? styles.stepBarItemActive : styles.stepBarItemInactive,
              ]}
            />
          );
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            (step === 1 || step === 2 || step === 7) && styles.centeredScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* =========================================================================
              STEP 1: What is EvenTime?
             ========================================================================= */}
          {step === 1 && (
            <View style={styles.screenWrapper}>
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
              STEP 2: Never Miss Out
             ========================================================================= */}
          {step === 2 && (
            <View style={styles.screenWrapper}>
              <View
                style={[
                  styles.imagePlaceholderBox,
                  { width: placeholderSize, height: placeholderSize },
                ]}
              >
                <ImageIcon size={32} color="#94A3B8" />
                <Text style={styles.placeholderLabel}>1:1 Image</Text>
              </View>

              <Text style={styles.headlineText}>Never Miss Out</Text>
              <Text style={styles.subheadlineText}>
                Save events, track deadlines, and get instant updates so you're always in the loop.
              </Text>
            </View>
          )}

          {/* =========================================================================
              STEP 3: Tell us who you are (Simple Chips: Student / Explorer)
             ========================================================================= */}
          {step === 3 && (
            <View style={styles.screenWrapper}>
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
                Choose your profile to calibrate your feed.
              </Text>

              {/* 2 Simple Persona Chips */}
              <View style={styles.personaChipRow}>
                <TouchableOpacity
                  style={[styles.personaChip, userType === 'student' && styles.personaChipActive]}
                  onPress={() => setUserType('student')}
                  activeOpacity={0.85}
                >
                  <GraduationCap size={20} color={userType === 'student' ? '#FFFFFF' : '#6C47FF'} />
                  <Text style={[styles.personaChipText, userType === 'student' && styles.personaChipTextActive]}>
                    Student
                  </Text>
                  {userType === 'student' && (
                    <View style={styles.chipCheckBadge}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.personaChip, userType === 'professional' && styles.personaChipActive]}
                  onPress={() => setUserType('professional')}
                  activeOpacity={0.85}
                >
                  <Briefcase size={20} color={userType === 'professional' ? '#FFFFFF' : '#6C47FF'} />
                  <Text style={[styles.personaChipText, userType === 'professional' && styles.personaChipTextActive]}>
                    Explorer
                  </Text>
                  {userType === 'professional' && (
                    <View style={styles.chipCheckBadge}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 4: Campus Details (ONLY SHOWN IF STUDENT)
             ========================================================================= */}
          {step === 4 && (
            <View style={styles.screenWrapper}>
              <View
                style={[
                  styles.imagePlaceholderBox,
                  { width: placeholderSize, height: placeholderSize },
                ]}
              >
                <GraduationCap size={28} color="#94A3B8" />
                <Text style={styles.placeholderLabel}>1:1 Image</Text>
              </View>

              <Text style={styles.headlineText}>Your Campus Details</Text>
              <Text style={styles.subheadlineText}>
                We'll calibrate your personalized college campus feed.
              </Text>

              {/* College Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>College / University Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Type to search (e.g. CBIT, IIT, VIT...)"
                  placeholderTextColor="#94A3B8"
                  value={collegeName}
                  onChangeText={(txt) => {
                    setCollegeName(txt);
                    setSelectedCollegeId(null);
                  }}
                />

                {/* College Suggestions + Notion-style Add Option */}
                {collegeName.trim().length >= 2 && (
                  <View style={styles.suggestionsBox}>
                    {collegeSuggestions.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setCollegeName(item.name);
                          setSelectedCollegeId(item.id);
                          setCollegeSuggestions([]);
                        }}
                      >
                        <GraduationCap size={14} color="#6C47FF" style={{ marginRight: 6 }} />
                        <Text style={styles.suggestionText} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Notion-style Add Custom College */}
                    {!collegeSuggestions.some(
                      (c) => c.name.toLowerCase() === collegeName.trim().toLowerCase()
                    ) && (
                      <TouchableOpacity
                        style={[styles.suggestionItem, styles.addNewSuggestionItem]}
                        onPress={() => {
                          setSelectedCollegeId(null);
                          setCollegeSuggestions([]);
                        }}
                      >
                        <Plus size={14} color="#6C47FF" style={{ marginRight: 6 }} />
                        <Text style={styles.addNewSuggestionText} numberOfLines={1}>
                          Use "{collegeName.trim()}" (Add as new college)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Branch Selection (Search & Type Only) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Branch / Major</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Type to search branch (e.g. CSE, Biotech, BBA...)"
                  placeholderTextColor="#94A3B8"
                  value={branch}
                  onChangeText={setBranch}
                />

                {/* Branch Suggestions + Custom Branch Option */}
                {branch.trim().length >= 1 && (
                  <View style={styles.suggestionsBox}>
                    {branchSuggestions.map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setBranch(b);
                        }}
                      >
                        <Text style={styles.suggestionText} numberOfLines={1}>
                          {b}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {!INDIAN_COLLEGE_BRANCHES.some(
                      (b) => b.toLowerCase() === branch.trim().toLowerCase()
                    ) && (
                      <TouchableOpacity
                        style={[styles.suggestionItem, styles.addNewSuggestionItem]}
                        onPress={() => {
                          // keep custom typed branch
                        }}
                      >
                        <Plus size={14} color="#6C47FF" style={{ marginRight: 6 }} />
                        <Text style={styles.addNewSuggestionText} numberOfLines={1}>
                          Use "{branch.trim()}"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Graduation Year */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Graduation Year</Text>
                <View style={styles.yearWrap}>
                  {GRAD_YEARS.map((yr) => (
                    <TouchableOpacity
                      key={yr}
                      style={[styles.yearPill, graduationYear === yr && styles.yearPillActive]}
                      onPress={() => setGraduationYear(yr)}
                    >
                      <Text style={[styles.yearText, graduationYear === yr && styles.yearTextActive]}>
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 5: Pick Your Cities (No Search Bar, No Default Pre-selection)
             ========================================================================= */}
          {step === 5 && (
            <View style={styles.screenWrapper}>
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
                Select up to 3 cities ({preferredCities.length}/3 selected)
              </Text>

              {/* All 32 Cities Chips Directly Visible */}
              <View style={styles.chipsContainer}>
                {CITIES.map((cityName) => {
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
              STEP 6: What do you like? (Top 10 Popular First, Expand for rest)
             ========================================================================= */}
          {step === 6 && (
            <View style={styles.screenWrapper}>
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

              {/* Popular Categories Chips */}
              <View style={styles.chipsContainer}>
                {visibleCategories.map((cat) => {
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

              {/* Show More / Show Less Toggle Button */}
              <TouchableOpacity
                style={styles.showMoreBtn}
                onPress={() => setShowAllCategories(!showAllCategories)}
                activeOpacity={0.7}
              >
                <Text style={styles.showMoreText}>
                  {showAllCategories
                    ? 'Show Less'
                    : `+ Show All (${CATEGORIES_LIST.length - POPULAR_CATEGORIES.length} more)`}
                </Text>
                {showAllCategories ? (
                  <ChevronUp size={14} color="#6C47FF" />
                ) : (
                  <ChevronDown size={14} color="#6C47FF" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* =========================================================================
              STEP 7: Your Feed is Ready (Login & Direct Launch)
             ========================================================================= */}
          {step === 7 && (
            <View style={styles.screenWrapper}>
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

      {/* Bottom Bar (Steps 1-6) */}
      {step < 7 && (
        <View style={styles.bottomNavigationBar}>
          {step > 1 && (
            <TouchableOpacity style={styles.navBackBtn} onPress={handleBack} activeOpacity={0.7}>
              <ArrowLeft size={18} color="#64748B" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navNextBtn, step === 1 && styles.navNextBtnFull]}
            onPress={handleNext}
            activeOpacity={0.88}
          >
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
    marginBottom: 16,
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
  personaChipRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  personaChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  personaChipActive: {
    borderColor: '#6C47FF',
    backgroundColor: '#6C47FF',
  },
  personaChipText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  personaChipTextActive: {
    color: '#FFFFFF',
  },
  chipCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    width: '100%',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  suggestionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  addNewSuggestionItem: {
    backgroundColor: '#FAF8FF',
  },
  addNewSuggestionText: {
    fontSize: 13,
    color: '#6C47FF',
    fontWeight: '800',
  },
  yearWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  yearPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  yearPillActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  yearText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  yearTextActive: {
    color: '#FFFFFF',
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
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(108, 71, 255, 0.08)',
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C47FF',
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
  navNextBtnFull: {
    marginLeft: 0,
  },
  navNextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
