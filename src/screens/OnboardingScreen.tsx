import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Compass,
  Trophy,
  Mail,
  Building,
  Star,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CITIES } from '../lib/constants/cities';
import { CATEGORIES_LIST, getCategoryMeta } from '../lib/category-config';
import { INDIAN_COLLEGE_BRANCHES } from '../lib/constants/branches';
import { IllustrationPlaceholder } from '../components/IllustrationPlaceholder';
import {
  setHasCompletedOnboarding,
  saveGuestPreferences,
  syncPreferencesToSupabase,
  OnboardingData,
} from '../lib/guest-preferences';
import { APP_ASSETS } from '../lib/asset-registry';
import type { CollegeRow } from '../types';

const { width } = Dimensions.get('window');

const PROFESSIONAL_DOMAINS = [
  'Software & AI',
  'Product & Design',
  'Startups & VC',
  'Marketing & Media',
  'Business & Finance',
  'Other Domains',
];

const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029'];

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

  // Form State
  const [userType, setUserType] = useState<'student' | 'professional' | 'creator'>('student');
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  
  // Student Specific
  const [collegeSearch, setCollegeSearch] = useState(profile?.college || '');
  const [college, setCollege] = useState(profile?.college || '');
  const [collegeId, setCollegeId] = useState<string | null>(profile?.college_id || null);
  const [branch, setBranch] = useState(profile?.branch || 'CSE');
  const [graduationYear, setGraduationYear] = useState(profile?.graduation_year || '2026');
  const [collegesList, setCollegesList] = useState<CollegeRow[]>([]);
  const [isSearchingColleges, setIsSearchingColleges] = useState(false);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);

  // Professional Specific
  const [industryFocus, setIndustryFocus] = useState<string>('Software & AI');

  // Cities
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [preferredCities, setPreferredCities] = useState<string[]>(
    profile?.preferred_cities && profile.preferred_cities.length > 0
      ? profile.preferred_cities
      : ['Hyderabad']
  );

  // Categories / Goals
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile?.goals && profile.goals.length > 0
      ? profile.goals
      : ['Hackathon', 'AI Event', 'Tech Event', 'College Fest']
  );

  // Auth States for Step 6
  const [authMode, setAuthMode] = useState<'none' | 'email'>('none');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState<string | null>(null);

  // Search colleges in Supabase
  useEffect(() => {
    if (!collegeSearch || collegeSearch.length < 2) {
      setCollegesList([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearchingColleges(true);
      const { data } = await supabase
        .from('colleges')
        .select('*')
        .ilike('name', `%${collegeSearch}%`)
        .limit(5);
      setCollegesList(data || []);
      setIsSearchingColleges(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [collegeSearch]);

  // City toggle (Max 3)
  const toggleCity = (c: string) => {
    if (preferredCities.includes(c)) {
      setPreferredCities(preferredCities.filter((item) => item !== c));
    } else {
      if (preferredCities.length >= 3) {
        Alert.alert('Limit Reached', 'Select up to 3 cities.');
        return;
      }
      setPreferredCities([...preferredCities, c]);
    }
  };

  // Category toggle (Max 6)
  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((item) => item !== cat));
    } else {
      if (selectedCategories.length >= 6) {
        Alert.alert('Limit Reached', 'Select up to 6 categories.');
        return;
      }
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Filtered Cities list for search
  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return CITIES;
    return CITIES.filter((c) =>
      c.toLowerCase().includes(citySearchQuery.trim().toLowerCase())
    );
  }, [citySearchQuery]);

  // Filtered Categories list for search
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return CATEGORIES_LIST;
    return CATEGORIES_LIST.filter((cat) =>
      cat.toLowerCase().includes(categorySearchQuery.trim().toLowerCase())
    );
  }, [categorySearchQuery]);

  const handleCreateCollege = async (name: string) => {
    if (!name.trim()) return;
    try {
      const { data, error } = await supabase
        .from('colleges')
        .insert({ name: name.trim() })
        .select()
        .single();
      if (!error && data) {
        setCollege(data.name);
        setCollegeId(data.id);
        setCollegeSearch(data.name);
        setShowCollegeDropdown(false);
      }
    } catch (e) {
      console.error('Create college error:', e);
    }
  };

  const currentOnboardingData: OnboardingData = {
    userType,
    fullName,
    college: userType === 'student' ? college : undefined,
    collegeId: userType === 'student' ? collegeId : undefined,
    branch: userType === 'student' ? branch : undefined,
    graduationYear: userType === 'student' ? graduationYear : undefined,
    industryFocus: userType !== 'student' ? industryFocus : undefined,
    preferredCities,
    goals: selectedCategories,
  };

  // Next Step validation and navigation
  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (userType === 'student' && !college.trim()) {
        Alert.alert('College Required', 'Please choose your college to continue.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (preferredCities.length === 0) {
        Alert.alert('Select City', 'Please select at least 1 city.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (selectedCategories.length === 0) {
        Alert.alert('Select Category', 'Please select at least 1 category.');
        return;
      }
      setStep(5);
    } else if (step === 5) {
      setStep(6);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  // Skip / Continue as Guest
  const handleContinueAsGuest = async () => {
    setIsSaving(true);
    await saveGuestPreferences(currentOnboardingData);
    await setHasCompletedOnboarding(true);
    setIsSaving(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  // Google Login & Sync
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

  // Email Auth
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

  const progressPercent = Math.round((step / 6) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Minimal Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Image source={APP_ASSETS.logo} style={styles.logoImage} contentFit="contain" />
          <Text style={styles.stepCounterText}>Step {step} of 6</Text>
        </View>

        {step < 6 && (
          <TouchableOpacity onPress={handleContinueAsGuest} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sleek Progress Indicator */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* =========================================================================
              SCREEN 1: All Events, One Feed & Persona Selection
             ========================================================================= */}
          {step === 1 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="All Events, One Feed"
                placeholderIcon={<Compass size={32} color="#A78BFA" />}
                gradientColors={['#1E1B4B', '#312E81']}
                height={150}
              />

              <Text style={styles.headline}>Never Miss What's Happening</Text>
              <Text style={styles.subtitle}>
                Tech fests, hackathons, conferences, concerts & meetups across India.
              </Text>

              <Text style={styles.questionLabel}>I am a...</Text>

              <TouchableOpacity
                style={[styles.personaCard, userType === 'student' && styles.personaCardActive]}
                onPress={() => setUserType('student')}
                activeOpacity={0.8}
              >
                <View style={[styles.personaIcon, userType === 'student' && styles.personaIconActive]}>
                  <GraduationCap size={20} color={userType === 'student' ? '#FFF' : '#6C47FF'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personaTitle, userType === 'student' && styles.personaTitleActive]}>
                    College Student
                  </Text>
                  <Text style={styles.personaSub}>Campus fests, hackathons & student perks</Text>
                </View>
                {userType === 'student' && <CheckCircle2 size={18} color={theme.colors.brand} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.personaCard, userType === 'professional' && styles.personaCardActive]}
                onPress={() => setUserType('professional')}
                activeOpacity={0.8}
              >
                <View style={[styles.personaIcon, userType === 'professional' && styles.personaIconActive]}>
                  <Briefcase size={20} color={userType === 'professional' ? '#FFF' : '#6C47FF'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personaTitle, userType === 'professional' && styles.personaTitleActive]}>
                    Working Professional
                  </Text>
                  <Text style={styles.personaSub}>Tech summits, conferences & networking</Text>
                </View>
                {userType === 'professional' && <CheckCircle2 size={18} color={theme.colors.brand} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.personaCard, userType === 'creator' && styles.personaCardActive]}
                onPress={() => setUserType('creator')}
                activeOpacity={0.8}
              >
                <View style={[styles.personaIcon, userType === 'creator' && styles.personaIconActive]}>
                  <Palette size={20} color={userType === 'creator' ? '#FFF' : '#6C47FF'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personaTitle, userType === 'creator' && styles.personaTitleActive]}>
                    Creator / Founder
                  </Text>
                  <Text style={styles.personaSub}>Showcases, pitch events & cultural fests</Text>
                </View>
                {userType === 'creator' && <CheckCircle2 size={18} color={theme.colors.brand} />}
              </TouchableOpacity>
            </View>
          )}

          {/* =========================================================================
              SCREEN 2: Campus / Career Setup
             ========================================================================= */}
          {step === 2 && (
            <View style={styles.slideContainer}>
              {userType === 'student' ? (
                <>
                  <IllustrationPlaceholder
                    badge="Campus Sphere"
                    placeholderIcon={<GraduationCap size={32} color="#A78BFA" />}
                    gradientColors={['#172554', '#1E3A8A']}
                    height={140}
                  />

                  <Text style={styles.headline}>Your Campus Hub</Text>
                  <Text style={styles.subtitle}>
                    Get private feeds for your college fests and symposiums.
                  </Text>

                  {/* College Search */}
                  <View style={styles.inputSection}>
                    <Text style={styles.label}>College / University *</Text>
                    <View style={styles.searchBar}>
                      <Search size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                      <TextInput
                        style={styles.input}
                        placeholder="Search IIT, CBIT, OU, VIT..."
                        placeholderTextColor="#94A3B8"
                        value={collegeSearch}
                        onChangeText={(t) => {
                          setCollegeSearch(t);
                          setCollege(t);
                          setCollegeId(null);
                          setShowCollegeDropdown(true);
                        }}
                        onFocus={() => setShowCollegeDropdown(true)}
                      />
                      {isSearchingColleges && <ActivityIndicator size="small" color={theme.colors.brand} />}
                    </View>

                    {showCollegeDropdown && collegesList.length > 0 && (
                      <View style={styles.dropdown}>
                        {collegesList.map((col) => (
                          <TouchableOpacity
                            key={col.id}
                            style={styles.dropdownRow}
                            onPress={() => {
                              setCollege(col.name);
                              setCollegeId(col.id);
                              setCollegeSearch(col.name);
                              setShowCollegeDropdown(false);
                            }}
                          >
                            <Building size={14} color="#6C47FF" style={{ marginRight: 6 }} />
                            <Text style={styles.dropdownText} numberOfLines={1}>{col.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {showCollegeDropdown && collegeSearch.length >= 2 && !isSearchingColleges && collegesList.length === 0 && (
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => handleCreateCollege(collegeSearch)}
                      >
                        <Plus size={14} color={theme.colors.brand} />
                        <Text style={styles.addBtnText}>Add "{collegeSearch.trim()}"</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Branch */}
                  <View style={styles.inputSection}>
                    <Text style={styles.label}>Branch</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {INDIAN_COLLEGE_BRANCHES.slice(0, 10).map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.miniChip, branch === b && styles.miniChipActive]}
                          onPress={() => setBranch(b)}
                        >
                          <Text style={[styles.miniChipText, branch === b && styles.miniChipTextActive]}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Year */}
                  <View style={styles.inputSection}>
                    <Text style={styles.label}>Graduation Year</Text>
                    <View style={styles.chipRow}>
                      {GRAD_YEARS.map((y) => (
                        <TouchableOpacity
                          key={y}
                          style={[styles.yearChip, graduationYear === y && styles.yearChipActive]}
                          onPress={() => setGraduationYear(y)}
                        >
                          <Text style={[styles.yearChipText, graduationYear === y && styles.yearChipTextActive]}>{y}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <IllustrationPlaceholder
                    badge="Career Domain"
                    placeholderIcon={<Briefcase size={32} color="#A78BFA" />}
                    gradientColors={['#064E3B', '#065F46']}
                    height={140}
                  />

                  <Text style={styles.headline}>Your Domain Focus</Text>
                  <Text style={styles.subtitle}>
                    Discover conferences, summits, and meetups tailored for your career.
                  </Text>

                  <View style={{ gap: 8, marginTop: 12 }}>
                    {PROFESSIONAL_DOMAINS.map((domain) => {
                      const isSelected = industryFocus === domain;
                      return (
                        <TouchableOpacity
                          key={domain}
                          style={[styles.domainItem, isSelected && styles.domainItemActive]}
                          onPress={() => setIndustryFocus(domain)}
                        >
                          <Text style={[styles.domainText, isSelected && styles.domainTextActive]}>{domain}</Text>
                          {isSelected && <CheckCircle2 size={16} color="#FFF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          )}

          {/* =========================================================================
              SCREEN 3: Preferred Cities
             ========================================================================= */}
          {step === 3 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="Location Hub"
                placeholderIcon={<MapPin size={32} color="#A78BFA" />}
                gradientColors={['#3B0764', '#581C87']}
                height={140}
              />

              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headline}>Pick Your Cities</Text>
                  <Text style={styles.subtitle}>Select up to 3 cities for your Around You feed.</Text>
                </View>
                <View style={styles.counter}>
                  <Text style={styles.counterText}>{preferredCities.length}/3</Text>
                </View>
              </View>

              <View style={styles.searchBar}>
                <Search size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Search Indian cities..."
                  placeholderTextColor="#94A3B8"
                  value={citySearchQuery}
                  onChangeText={setCitySearchQuery}
                />
              </View>

              <View style={styles.chipGrid}>
                {filteredCities.map((cityName) => {
                  const isSelected = preferredCities.includes(cityName);
                  return (
                    <TouchableOpacity
                      key={cityName}
                      style={[styles.cityChip, isSelected && styles.cityChipActive]}
                      onPress={() => toggleCity(cityName)}
                      activeOpacity={0.7}
                    >
                      <MapPin size={12} color={isSelected ? '#FFF' : '#64748B'} style={{ marginRight: 4 }} />
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
              SCREEN 4: Interest Categories
             ========================================================================= */}
          {step === 4 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="Event Categories"
                placeholderIcon={<Sparkles size={32} color="#A78BFA" />}
                gradientColors={['#701A75', '#4A044E']}
                height={140}
              />

              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headline}>Choose Your Interests</Text>
                  <Text style={styles.subtitle}>Pick up to 6 categories for your For You feed.</Text>
                </View>
                <View style={styles.counter}>
                  <Text style={styles.counterText}>{selectedCategories.length}/6</Text>
                </View>
              </View>

              <View style={styles.searchBar}>
                <Search size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Filter categories (Hackathon, Fest)..."
                  placeholderTextColor="#94A3B8"
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                />
              </View>

              <View style={styles.chipGrid}>
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  const meta = getCategoryMeta(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        isSelected && {
                          backgroundColor: meta.accentColor,
                          borderColor: meta.accentColor,
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
              SCREEN 5: Leaderboard & ET Score
             ========================================================================= */}
          {step === 5 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="Leaderboard & ET Score"
                placeholderIcon={<Trophy size={32} color="#FBBF24" />}
                gradientColors={['#78350F', '#92400E']}
                height={140}
              />

              <Text style={styles.headline}>Compete & Climb Ranks</Text>
              <Text style={styles.subtitle}>
                Post events in 30 seconds, earn ET Points, and top your city leaderboard.
              </Text>

              <View style={styles.bonusBox}>
                <Star size={22} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bonusHead}>+100 Starting ET Score</Text>
                  <Text style={styles.bonusDesc}>Instant bonus unlocked upon profile creation!</Text>
                </View>
              </View>

              <View style={styles.miniCard}>
                <Text style={styles.miniCardTag}>PREFERENCES SUMMARY</Text>
                <Text style={styles.miniCardText}>
                  👤 {userType === 'student' ? 'College Student' : userType === 'professional' ? 'Professional' : 'Creator'}
                </Text>
                {userType === 'student' && college ? (
                  <Text style={styles.miniCardText}>🏫 {college}</Text>
                ) : null}
                <Text style={styles.miniCardText}>📍 {preferredCities.join(', ')}</Text>
                <Text style={styles.miniCardText} numberOfLines={1}>🎯 {selectedCategories.join(', ')}</Text>
              </View>
            </View>
          )}

          {/* =========================================================================
              SCREEN 6: Save & Launch
             ========================================================================= */}
          {step === 6 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="Save & Sync"
                placeholderIcon={<Sparkles size={32} color="#A78BFA" />}
                gradientColors={['#1E1B4B', '#4C1D95']}
                height={140}
              />

              <Text style={styles.headline}>Lock In Your Profile</Text>
              <Text style={styles.subtitle}>
                Sign in to save your custom feeds, sync bookmarks, and track your ET score.
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

              {/* Email Form Toggle */}
              {authMode === 'none' ? (
                <TouchableOpacity
                  style={styles.emailToggle}
                  onPress={() => setAuthMode('email')}
                >
                  <Mail size={16} color="#6C47FF" />
                  <Text style={styles.emailToggleText}>Sign in with Email</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.emailBox}>
                  <TextInput
                    style={styles.authField}
                    placeholder="Email address"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <View style={styles.passRow}>
                    <TextInput
                      style={{ flex: 1, fontSize: 14, color: theme.colors.textPrimary }}
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
                    style={styles.authBtn}
                    onPress={handleEmailAuth}
                    disabled={Boolean(authLoading)}
                  >
                    {authLoading === 'email' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.authBtnText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.brand, fontWeight: '600' }}>
                      {isSignUp ? 'Have an account? Sign In' : "New user? Create Account"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.orDivider}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              {/* Guest Option */}
              <TouchableOpacity
                style={styles.guestActionBtn}
                onPress={handleContinueAsGuest}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <Text style={styles.guestActionText}>Explore as Guest</Text>
                <ArrowRight size={14} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Nav Bar */}
      {step < 6 && (
        <View style={styles.bottomBar}>
          {step > 1 ? (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <ArrowLeft size={18} color="#64748B" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>{step === 5 ? 'Done' : 'Next'}</Text>
            <ArrowRight size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  progressBarBg: {
    height: 2,
    backgroundColor: theme.colors.borderLight,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.brand,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  slideContainer: {
    flex: 1,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  questionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: 10,
    gap: 12,
  },
  personaCardActive: {
    borderColor: theme.colors.brand,
    backgroundColor: 'rgba(108, 71, 255, 0.04)',
  },
  personaIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(108, 71, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaIconActive: {
    backgroundColor: theme.colors.brand,
  },
  personaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  personaTitleActive: {
    color: theme.colors.brand,
  },
  personaSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  inputSection: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  dropdown: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(108, 71, 255, 0.08)',
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  miniChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  miniChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  miniChipTextActive: {
    color: '#FFF',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  yearChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  yearChipTextActive: {
    color: '#FFF',
  },
  domainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  domainItemActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  domainText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  domainTextActive: {
    color: '#FFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    backgroundColor: 'rgba(108, 71, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cityChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  cityChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cityChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  catChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  bonusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  bonusHead: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  bonusDesc: {
    fontSize: 11,
    color: '#B45309',
  },
  miniCard: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  miniCardTag: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  miniCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  emailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(108, 71, 255, 0.06)',
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  emailToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  emailBox: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  authField: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  authBtn: {
    backgroundColor: theme.colors.brand,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  authBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  orText: {
    paddingHorizontal: 10,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  guestActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  guestActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
