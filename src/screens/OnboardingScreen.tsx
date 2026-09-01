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
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building,
  Calendar,
  Layers,
  Star,
  Plus,
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
  'Software & Tech',
  'AI & Data Science',
  'Product & Design',
  'Startups & VC',
  'Marketing & Growth',
  'Business & Finance',
  'Arts & Entertainment',
  'Other',
];

const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];

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
  const [industryFocus, setIndustryFocus] = useState<string>('Software & Tech');

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

  // Auth Modal/Form States for Step 6
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
        .limit(6);
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
        Alert.alert('Limit Reached', 'You can select up to 3 preferred cities.');
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
        Alert.alert('Limit Reached', 'You can select up to 6 category interests.');
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
        Alert.alert('College Required', 'Please select or enter your college name to find campus events.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (preferredCities.length === 0) {
        Alert.alert('Select City', 'Please select at least one city to discover events around you.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (selectedCategories.length === 0) {
        Alert.alert('Select Category', 'Please select at least 1 category interest.');
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
    // If successful, onAuthStateChange in AuthContext will update user,
    // and we sync the preferences to Supabase
    if (user) {
      await syncPreferencesToSupabase(user.id, currentOnboardingData);
      await refreshProfile();
    } else {
      await saveGuestPreferences(currentOnboardingData);
      await setHasCompletedOnboarding(true);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  // Email Auth
  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation Error', 'Please enter your email and password.');
      return;
    }
    setAuthLoading('email');
    if (isSignUp) {
      const { error, unconfirmed } = await signUpWithEmail(email.trim(), password);
      setAuthLoading(null);
      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else if (unconfirmed) {
        Alert.alert('Email Already Registered', 'Please sign in with this email.');
        setIsSignUp(false);
      } else {
        await saveGuestPreferences(currentOnboardingData);
        Alert.alert('Account Created', 'Please check your email to verify your account, then sign in.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await signInWithEmail(email.trim(), password);
      setAuthLoading(null);
      if (error) {
        Alert.alert('Sign In Failed', error.message);
      } else {
        if (user) {
          await syncPreferencesToSupabase(user.id, currentOnboardingData);
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

  // Progress Bar Percentage
  const progressPercent = Math.round((step / 6) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Image source={APP_ASSETS.logo} style={styles.logoImage} contentFit="contain" />
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {step} of 6</Text>
          </View>
        </View>

        {step < 6 && (
          <TouchableOpacity onPress={handleContinueAsGuest} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Line */}
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
              SCREEN 1: What is Eventime? & Persona Selection
             ========================================================================= */}
          {step === 1 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="⚡ All Events in One Place"
                placeholderIcon={<Compass size={36} color="#A78BFA" />}
                gradientColors={['#1E1B4B', '#312E81', '#0F172A']}
              />

              <Text style={styles.slideHeadline}>
                Your Gateway to Every Event in Your City & Campus
              </Text>
              <Text style={styles.slideStory}>
                Stop hunting across random WhatsApp groups, dead posters, and scattered links. Eventime brings tech fests, hackathons, conferences, workshops, concerts & meetups into one live verified feed.
              </Text>

              <Text style={styles.sectionQuestion}>Who are you joining as?</Text>

              {/* Persona Selector Cards */}
              <TouchableOpacity
                style={[
                  styles.personaCard,
                  userType === 'student' && styles.personaCardActive,
                ]}
                onPress={() => setUserType('student')}
                activeOpacity={0.8}
              >
                <View style={[styles.personaIconBox, userType === 'student' && styles.personaIconBoxActive]}>
                  <GraduationCap size={22} color={userType === 'student' ? '#FFF' : '#6C47FF'} />
                </View>
                <View style={styles.personaTextContainer}>
                  <Text style={[styles.personaTitle, userType === 'student' && styles.personaTitleActive]}>
                    College Student
                  </Text>
                  <Text style={styles.personaDesc}>
                    Campus fests, hackathons, department symposiums & student discounts.
                  </Text>
                </View>
                {userType === 'student' && <CheckCircle2 size={20} color={theme.colors.brand} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.personaCard,
                  userType === 'professional' && styles.personaCardActive,
                ]}
                onPress={() => setUserType('professional')}
                activeOpacity={0.8}
              >
                <View style={[styles.personaIconBox, userType === 'professional' && styles.personaIconBoxActive]}>
                  <Briefcase size={22} color={userType === 'professional' ? '#FFF' : '#6C47FF'} />
                </View>
                <View style={styles.personaTextContainer}>
                  <Text style={[styles.personaTitle, userType === 'professional' && styles.personaTitleActive]}>
                    Working Professional
                  </Text>
                  <Text style={styles.personaDesc}>
                    Tech summits, developer conferences, workshops & networking meetups.
                  </Text>
                </View>
                {userType === 'professional' && <CheckCircle2 size={20} color={theme.colors.brand} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.personaCard,
                  userType === 'creator' && styles.personaCardActive,
                ]}
                onPress={() => setUserType('creator')}
                activeOpacity={0.8}
              >
                <View style={[styles.personaIconBox, userType === 'creator' && styles.personaIconBoxActive]}>
                  <Palette size={22} color={userType === 'creator' ? '#FFF' : '#6C47FF'} />
                </View>
                <View style={styles.personaTextContainer}>
                  <Text style={[styles.personaTitle, userType === 'creator' && styles.personaTitleActive]}>
                    Creator & Founder
                  </Text>
                  <Text style={styles.personaDesc}>
                    Pitch days, creative showcases, open mics, design circles & expos.
                  </Text>
                </View>
                {userType === 'creator' && <CheckCircle2 size={20} color={theme.colors.brand} />}
              </TouchableOpacity>
            </View>
          )}

          {/* =========================================================================
              SCREEN 2: Campus Hub (Student) OR Career Sphere (Professional/Creator)
             ========================================================================= */}
          {step === 2 && (
            <View style={styles.slideContainer}>
              {userType === 'student' ? (
                <>
                  <IllustrationPlaceholder
                    badge="🏫 Campus Circle"
                    placeholderIcon={<GraduationCap size={36} color="#A78BFA" />}
                    gradientColors={['#172554', '#1E3A8A', '#0F172A']}
                  />

                  <Text style={styles.slideHeadline}>Never Miss an Event on Your Campus</Text>
                  <Text style={styles.slideStory}>
                    Get a dedicated Campus feed for your college. Inter-college fests, department symposiums, and private campus events appear directly in your Campus tab.
                  </Text>

                  {/* College Search Autocomplete */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Search College / University *</Text>
                    <View style={styles.searchBarWrapper}>
                      <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="e.g. IIT Hyderabad, CBIT, OU, VIT..."
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

                    {/* Autocomplete Dropdown */}
                    {showCollegeDropdown && collegesList.length > 0 && (
                      <View style={styles.dropdownCard}>
                        {collegesList.map((col) => (
                          <TouchableOpacity
                            key={col.id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setCollege(col.name);
                              setCollegeId(col.id);
                              setCollegeSearch(col.name);
                              setShowCollegeDropdown(false);
                            }}
                          >
                            <Building size={14} color="#6C47FF" style={{ marginRight: 8 }} />
                            <Text style={styles.dropdownItemText} numberOfLines={1}>
                              {col.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {showCollegeDropdown &&
                      collegeSearch.length >= 2 &&
                      !isSearchingColleges &&
                      collegesList.length === 0 && (
                        <TouchableOpacity
                          style={styles.createCollegeBtn}
                          onPress={() => handleCreateCollege(collegeSearch)}
                        >
                          <Plus size={14} color={theme.colors.brand} />
                          <Text style={styles.createCollegeBtnText}>
                            Add "{collegeSearch.trim()}" to Colleges
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>

                  {/* Branch Selection */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Engineering / Major Branch</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                      {INDIAN_COLLEGE_BRANCHES.slice(0, 12).map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.smallChip, branch === b && styles.smallChipActive]}
                          onPress={() => setBranch(b)}
                        >
                          <Text style={[styles.smallChipText, branch === b && styles.smallChipTextActive]}>
                            {b}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Graduation Year */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.inputLabel}>Graduation Year</Text>
                    <View style={styles.rowWrap}>
                      {GRAD_YEARS.map((y) => (
                        <TouchableOpacity
                          key={y}
                          style={[styles.yearChip, graduationYear === y && styles.yearChipActive]}
                          onPress={() => setGraduationYear(y)}
                        >
                          <Text style={[styles.yearChipText, graduationYear === y && styles.yearChipTextActive]}>
                            {y}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <IllustrationPlaceholder
                    badge="💼 Career Sphere"
                    placeholderIcon={<Briefcase size={36} color="#A78BFA" />}
                    gradientColors={['#064E3B', '#065F46', '#0F172A']}
                  />

                  <Text style={styles.slideHeadline}>Curated for Your Professional Journey</Text>
                  <Text style={styles.slideStory}>
                    Discover conferences, founder meetups, AI symposiums, and networking circles tailored to your domain and ambition.
                  </Text>

                  <Text style={styles.inputLabel}>Select Your Industry / Primary Focus</Text>
                  <View style={styles.domainGrid}>
                    {PROFESSIONAL_DOMAINS.map((domain) => {
                      const isSelected = industryFocus === domain;
                      return (
                        <TouchableOpacity
                          key={domain}
                          style={[styles.domainCard, isSelected && styles.domainCardActive]}
                          onPress={() => setIndustryFocus(domain)}
                        >
                          <Text style={[styles.domainCardText, isSelected && styles.domainCardTextActive]}>
                            {domain}
                          </Text>
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
              SCREEN 3: Preferred Cities (Search & Select)
             ========================================================================= */}
          {step === 3 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="📍 Location Hub"
                placeholderIcon={<MapPin size={36} color="#A78BFA" />}
                gradientColors={['#3B0764', '#581C87', '#0F172A']}
              />

              <Text style={styles.slideHeadline}>Where Do You Want to Explore?</Text>
              <Text style={styles.slideStory}>
                Track events in your home city, college hub, or online. Your "Around You" feed filters live events based on these choices.
              </Text>

              {/* City Selection Header with Counter */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Pick Your Cities</Text>
                <View style={styles.counterBadge}>
                  <Text style={styles.counterBadgeText}>{preferredCities.length} / 3 Selected</Text>
                </View>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBarWrapper}>
                <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Indian cities..."
                  placeholderTextColor="#94A3B8"
                  value={citySearchQuery}
                  onChangeText={setCitySearchQuery}
                />
              </View>

              {/* Cities Grid */}
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
                      <MapPin size={13} color={isSelected ? '#FFF' : '#64748B'} style={{ marginRight: 4 }} />
                      <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>
                        {cityName}
                      </Text>
                      {isSelected && <CheckCircle2 size={13} color="#FFF" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              SCREEN 4: Your Event Passions (36 Categories)
             ========================================================================= */}
          {step === 4 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="🎯 Custom Interests"
                placeholderIcon={<Layers size={36} color="#A78BFA" />}
                gradientColors={['#701A75', '#4A044E', '#0F172A']}
              />

              <Text style={styles.slideHeadline}>What Inspires You Most?</Text>
              <Text style={styles.slideStory}>
                From 48-hour AI Hackathons to high-energy College Fests and Creator Meetups — your "For You" feed is built entirely around these choices.
              </Text>

              {/* Category Counter */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Select Categories</Text>
                <View style={styles.counterBadge}>
                  <Text style={styles.counterBadgeText}>{selectedCategories.length} / 6 Selected</Text>
                </View>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBarWrapper}>
                <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter categories (e.g. Hackathon, Concert)..."
                  placeholderTextColor="#94A3B8"
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                />
              </View>

              {/* Categories Grid */}
              <View style={styles.chipGrid}>
                {filteredCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  const meta = getCategoryMeta(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        isSelected && {
                          backgroundColor: meta.accentColor,
                          borderColor: meta.accentColor,
                        },
                      ]}
                      onPress={() => toggleCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                      {isSelected && <CheckCircle2 size={13} color="#FFF" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* =========================================================================
              SCREEN 5: The Leaderboard & ET Score Economy
             ========================================================================= */}
          {step === 5 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="🏆 Leaderboard & Rewards"
                placeholderIcon={<Trophy size={36} color="#FBBF24" />}
                gradientColors={['#78350F', '#92400E', '#0F172A']}
              />

              <Text style={styles.slideHeadline}>Compete, Earn ET Score & Rule the Leaderboard</Text>
              <Text style={styles.slideStory}>
                Eventime is driven by community curators. Post events, earn ET Points, unlock Silver & Gold Curator tiers, and rank on your City and Campus leaderboards.
              </Text>

              {/* Starting Bonus Card */}
              <View style={styles.bonusCard}>
                <View style={styles.bonusIconCircle}>
                  <Star size={24} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bonusTitle}>Starting Curator Bonus</Text>
                  <Text style={styles.bonusSubtitle}>+100 ET Score automatically credited on account creation!</Text>
                </View>
              </View>

              {/* Summary Passport Card */}
              <View style={styles.passportCard}>
                <Text style={styles.passportHeader}>YOUR EVENTIME PROFILE SETUP</Text>

                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Persona:</Text>
                  <Text style={styles.passportValue}>
                    {userType === 'student' ? '🎓 College Student' : userType === 'professional' ? '💼 Professional' : '🎨 Creator'}
                  </Text>
                </View>

                {userType === 'student' && college ? (
                  <View style={styles.passportRow}>
                    <Text style={styles.passportLabel}>College:</Text>
                    <Text style={styles.passportValue} numberOfLines={1}>{college} ({branch} '{graduationYear})</Text>
                  </View>
                ) : null}

                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Hubs ({preferredCities.length}):</Text>
                  <Text style={styles.passportValue}>{preferredCities.join(', ')}</Text>
                </View>

                <View style={styles.passportRow}>
                  <Text style={styles.passportLabel}>Interests ({selectedCategories.length}):</Text>
                  <Text style={styles.passportValue} numberOfLines={2}>{selectedCategories.join(', ')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* =========================================================================
              SCREEN 6: Lock in Your Setup & Sign In
             ========================================================================= */}
          {step === 6 && (
            <View style={styles.slideContainer}>
              <IllustrationPlaceholder
                badge="🚀 Ready to Launch"
                placeholderIcon={<Sparkles size={36} color="#A78BFA" />}
                gradientColors={['#1E1B4B', '#4C1D95', '#0F172A']}
              />

              <Text style={styles.slideHeadline}>Lock In Your Preferences</Text>
              <Text style={styles.slideStory}>
                Sign in to save your customized feeds, sync bookmarks, track your ET Score rank, and post events in 30 seconds.
              </Text>

              {/* Option A: Google 1-Tap Sign-In */}
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

              {/* Option B: Email Auth Toggle / Form */}
              {authMode === 'none' ? (
                <TouchableOpacity
                  style={styles.emailOptionBtn}
                  onPress={() => setAuthMode('email')}
                >
                  <Mail size={18} color="#6C47FF" />
                  <Text style={styles.emailOptionBtnText}>Sign in / Sign up with Email</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.emailFormCard}>
                  <Text style={styles.emailFormTitle}>{isSignUp ? 'Create an Account' : 'Welcome Back'}</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabelSmall}>Email Address</Text>
                    <TextInput
                      style={styles.authInput}
                      placeholder="curator@college.edu"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabelSmall}>Password</Text>
                    <View style={styles.passwordWrapper}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="••••••••"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.authSubmitBtn}
                    onPress={handleEmailAuth}
                    disabled={Boolean(authLoading)}
                  >
                    {authLoading === 'email' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.authSubmitBtnText}>{isSignUp ? 'Sign Up & Save Setup' : 'Sign In & Save Setup'}</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleAuthBtn}>
                    <Text style={styles.toggleAuthText}>
                      {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Option C: Explore as Guest */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.guestBtn}
                onPress={handleContinueAsGuest}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#64748B" />
                ) : (
                  <>
                    <Text style={styles.guestBtnText}>Explore as Guest</Text>
                    <ArrowRight size={16} color="#64748B" />
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.guestNote}>
                Guest mode lets you browse all public events without account sync.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Bar Controls (Steps 1 to 5) */}
      {step < 6 && (
        <View style={styles.bottomBar}>
          {step > 1 ? (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <ArrowLeft size={20} color="#64748B" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>{step === 5 ? 'Finish Setup' : 'Continue'}</Text>
            <ArrowRight size={18} color="#FFF" />
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  stepBadge: {
    backgroundColor: 'rgba(108, 71, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(108, 71, 255, 0.25)',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: theme.colors.borderLight,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.brand,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  slideContainer: {
    flex: 1,
  },
  slideHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 28,
    marginBottom: 8,
  },
  slideStory: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: 12,
    gap: 14,
    ...theme.shadows.sm,
  },
  personaCardActive: {
    borderColor: theme.colors.brand,
    backgroundColor: 'rgba(108, 71, 255, 0.04)',
  },
  personaIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(108, 71, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaIconBoxActive: {
    backgroundColor: theme.colors.brand,
  },
  personaTextContainer: {
    flex: 1,
  },
  personaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  personaTitleActive: {
    color: theme.colors.brand,
  },
  personaDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  inputLabelSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  dropdownCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: 10,
    ...theme.shadows.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dropdownItemText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  createCollegeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(108, 71, 255, 0.08)',
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  createCollegeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  horizontalChips: {
    flexDirection: 'row',
  },
  smallChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  smallChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  smallChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  smallChipTextActive: {
    color: '#FFF',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  yearChipTextActive: {
    color: '#FFF',
  },
  domainGrid: {
    gap: 8,
    marginTop: 8,
  },
  domainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  domainCardActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  domainCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  domainCardTextActive: {
    color: '#FFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  counterBadge: {
    backgroundColor: 'rgba(108, 71, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cityChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  bonusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  bonusSubtitle: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
    fontWeight: '600',
  },
  passportCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  passportHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingBottom: 8,
  },
  passportRow: {
    marginBottom: 10,
  },
  passportLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  passportValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  emailOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(108, 71, 255, 0.06)',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(108, 71, 255, 0.2)',
    gap: 8,
    marginBottom: 16,
  },
  emailOptionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  emailFormCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  emailFormTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  authInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  authSubmitBtn: {
    backgroundColor: theme.colors.brand,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  authSubmitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleAuthBtn: {
    alignItems: 'center',
    marginTop: 10,
  },
  toggleAuthText: {
    fontSize: 12,
    color: theme.colors.brand,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  guestBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  guestNote: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.full,
    gap: 8,
    ...theme.shadows.brand,
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
