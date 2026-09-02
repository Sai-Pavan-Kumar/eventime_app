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
  Building2,
  Star,
  Plus,
  Eye,
  EyeOff,
  Flame,
  Check,
  Zap,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
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
import type { CollegeRow } from '../types';

const { width } = Dimensions.get('window');

const PROFESSIONAL_DOMAINS = [
  'Software & AI',
  'Product & Design',
  'Startups & VC',
  'Marketing & Growth',
  'Business & Finance',
  'Other Fields',
];

const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029+'];

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

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
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

  // Cities (Max 3)
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [preferredCities, setPreferredCities] = useState<string[]>(
    profile?.preferred_cities && profile.preferred_cities.length > 0
      ? profile.preferred_cities
      : ['Hyderabad', 'Bengaluru']
  );

  // Categories / Goals (Max 6)
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile?.goals && profile.goals.length > 0
      ? profile.goals
      : ['Hackathon', 'AI Event', 'Tech Event', 'College Fest']
  );

  // Auth States for Step 4
  const [showEmailForm, setShowEmailForm] = useState(false);
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

  const toggleCity = (c: string) => {
    if (preferredCities.includes(c)) {
      if (preferredCities.length > 1) {
        setPreferredCities(preferredCities.filter((item) => item !== c));
      }
    } else {
      if (preferredCities.length >= 3) {
        Alert.alert('Limit Reached', 'You can choose up to 3 cities.');
        return;
      }
      setPreferredCities([...preferredCities, c]);
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
    if (!citySearchQuery.trim()) return CITIES.slice(0, 16);
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
    college: userType === 'student' ? college : undefined,
    collegeId: userType === 'student' ? collegeId : undefined,
    branch: userType === 'student' ? branch : undefined,
    graduationYear: userType === 'student' ? graduationYear : undefined,
    industryFocus: userType !== 'student' ? industryFocus : undefined,
    preferredCities,
    goals: selectedCategories,
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (userType === 'student' && !college.trim()) {
        Alert.alert('College Selection', 'Please enter or select your college to continue.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (preferredCities.length === 0) {
        Alert.alert('City Selection', 'Please choose at least 1 city.');
        return;
      }
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  // Complete Onboarding and enter app
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
      {/* Sleek Minimal Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navBarLeft}>
          <Image source={APP_ASSETS.logo} style={styles.logoBadge} contentFit="contain" />
          <Text style={styles.brandTitle}>EvenTime</Text>
        </View>

        {step < 4 ? (
          <TouchableOpacity onPress={handleLaunchApp} style={styles.skipPill} activeOpacity={0.7}>
            <Text style={styles.skipPillText}>Skip to App</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Segmented Step Indicator */}
      <View style={styles.stepIndicatorRow}>
        {[1, 2, 3, 4].map((i) => (
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
              STEP 1: Hero Welcome & Persona Selection
             ========================================================================= */}
          {step === 1 && (
            <View style={styles.stepCard}>
              <View style={styles.heroBadge}>
                <Sparkles size={14} color="#6C47FF" />
                <Text style={styles.heroBadgeText}>ALL EVENTS • ONE FEED</Text>
              </View>

              <Text style={styles.headline}>Never miss what's happening.</Text>
              <Text style={styles.subheadline}>
                Discover campus fests, hackathons, concerts, and tech summits across India in real-time.
              </Text>

              <Text style={styles.sectionHeading}>Tell us who you are</Text>

              {/* Persona Options */}
              <TouchableOpacity
                style={[styles.personaPill, userType === 'student' && styles.personaPillSelected]}
                onPress={() => setUserType('student')}
                activeOpacity={0.85}
              >
                <View style={[styles.personaIconBox, userType === 'student' && styles.personaIconBoxActive]}>
                  <GraduationCap size={22} color={userType === 'student' ? '#FFF' : '#6C47FF'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personaMainText, userType === 'student' && styles.personaMainTextActive]}>
                    College Student
                  </Text>
                  <Text style={styles.personaSubText}>Campus fests, hackathons, and student perks</Text>
                </View>
                {userType === 'student' && (
                  <View style={styles.checkCircle}>
                    <Check size={14} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.personaPill, userType === 'professional' && styles.personaPillSelected]}
                onPress={() => setUserType('professional')}
                activeOpacity={0.85}
              >
                <View style={[styles.personaIconBox, userType === 'professional' && styles.personaIconBoxActive]}>
                  <Briefcase size={22} color={userType === 'professional' ? '#FFF' : '#6C47FF'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personaMainText, userType === 'professional' && styles.personaMainTextActive]}>
                    Working Professional
                  </Text>
                  <Text style={styles.personaSubText}>Tech conferences, founder meetups, and summits</Text>
                </View>
                {userType === 'professional' && (
                  <View style={styles.checkCircle}>
                    <Check size={14} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.personaPill, userType === 'creator' && styles.personaPillSelected]}
                onPress={() => setUserType('creator')}
                activeOpacity={0.85}
              >
                <View style={[styles.personaIconBox, userType === 'creator' && styles.personaIconBoxActive]}>
                  <Palette size={22} color={userType === 'creator' ? '#FFF' : '#6C47FF'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personaMainText, userType === 'creator' && styles.personaMainTextActive]}>
                    Creator & Organizer
                  </Text>
                  <Text style={styles.personaSubText}>Post events in 30s, climb leaderboards & grow reach</Text>
                </View>
                {userType === 'creator' && (
                  <View style={styles.checkCircle}>
                    <Check size={14} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* =========================================================================
              STEP 2: Campus / Career Specialization
             ========================================================================= */}
          {step === 2 && (
            <View style={styles.stepCard}>
              <View style={styles.heroBadge}>
                <Building2 size={14} color="#6C47FF" />
                <Text style={styles.heroBadgeText}>
                  {userType === 'student' ? 'CAMPUS SPHERE' : 'CAREER FOCUS'}
                </Text>
              </View>

              <Text style={styles.headline}>
                {userType === 'student' ? 'Unlock your campus hub.' : 'Tailor your event radar.'}
              </Text>
              <Text style={styles.subheadline}>
                {userType === 'student'
                  ? 'Get private feeds for your university and verified inter-college symposiums.'
                  : 'Receive personalized invites to curated tech roundtables and industry meets.'}
              </Text>

              {userType === 'student' ? (
                <>
                  {/* College Field */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>College or University *</Text>
                    <View style={styles.searchBoxContainer}>
                      <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.searchTextInput}
                        placeholder="Search IIT, CBIT, OU, VIT, BITS..."
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
                      {isSearchingColleges && <ActivityIndicator size="small" color="#6C47FF" />}
                    </View>

                    {showCollegeDropdown && collegesList.length > 0 && (
                      <View style={styles.dropdownContainer}>
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
                            <Building2 size={14} color="#6C47FF" style={{ marginRight: 8 }} />
                            <Text style={styles.dropdownItemText} numberOfLines={1}>
                              {col.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Branch Selection */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Engineering & Degree Branch</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                      {INDIAN_COLLEGE_BRANCHES.slice(0, 8).map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.smallPill, branch === b && styles.smallPillActive]}
                          onPress={() => setBranch(b)}
                        >
                          <Text style={[styles.smallPillText, branch === b && styles.smallPillTextActive]}>
                            {b}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Graduation Year */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Graduation Year</Text>
                    <View style={styles.yearPillsRow}>
                      {GRAD_YEARS.map((y) => (
                        <TouchableOpacity
                          key={y}
                          style={[styles.yearPill, graduationYear === y && styles.yearPillActive]}
                          onPress={() => setGraduationYear(y)}
                        >
                          <Text style={[styles.yearPillText, graduationYear === y && styles.yearPillTextActive]}>
                            {y}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Industry Domain</Text>
                  <View style={{ gap: 8 }}>
                    {PROFESSIONAL_DOMAINS.map((domain) => {
                      const isSelected = industryFocus === domain;
                      return (
                        <TouchableOpacity
                          key={domain}
                          style={[styles.domainCard, isSelected && styles.domainCardSelected]}
                          onPress={() => setIndustryFocus(domain)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.domainCardText, isSelected && styles.domainCardTextSelected]}>
                            {domain}
                          </Text>
                          {isSelected && <Check size={16} color="#6C47FF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* =========================================================================
              STEP 3: Cities & Category Radar
             ========================================================================= */}
          {step === 3 && (
            <View style={styles.stepCard}>
              <View style={styles.heroBadge}>
                <MapPin size={14} color="#6C47FF" />
                <Text style={styles.heroBadgeText}>LOCATION & INTERESTS</Text>
              </View>

              <Text style={styles.headline}>Tune your radar.</Text>
              <Text style={styles.subheadline}>
                Pick your preferred cities and categories to calibrate your algorithm.
              </Text>

              {/* City Selection */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelWithCounter}>
                  <Text style={styles.fieldLabel}>Preferred Cities</Text>
                  <Text style={styles.counterBadge}>{preferredCities.length}/3 selected</Text>
                </View>

                <View style={styles.chipsWrap}>
                  {filteredCities.map((cityName) => {
                    const isSelected = preferredCities.includes(cityName);
                    return (
                      <TouchableOpacity
                        key={cityName}
                        style={[styles.tagPill, isSelected && styles.tagPillActive]}
                        onPress={() => toggleCity(cityName)}
                        activeOpacity={0.7}
                      >
                        <MapPin
                          size={12}
                          color={isSelected ? '#FFFFFF' : '#64748B'}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.tagPillText, isSelected && styles.tagPillTextActive]}>
                          {cityName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Category Selection */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelWithCounter}>
                  <Text style={styles.fieldLabel}>Interests & Formats</Text>
                  <Text style={styles.counterBadge}>{selectedCategories.length}/6 selected</Text>
                </View>

                <View style={styles.chipsWrap}>
                  {filteredCategories.slice(0, 14).map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    const meta = getCategoryMeta(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catPill,
                          isSelected && {
                            backgroundColor: meta.accentColor || '#6C47FF',
                            borderColor: meta.accentColor || '#6C47FF',
                          },
                        ]}
                        onPress={() => toggleCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* =========================================================================
              STEP 4: Apple Wallet Style EvenTime Passport & Launch
             ========================================================================= */}
          {step === 4 && (
            <View style={styles.stepCard}>
              {/* Apple Wallet Style Membership Card */}
              <View style={styles.membershipCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardBrand}>
                    <Image source={APP_ASSETS.logo} style={styles.cardLogo} contentFit="contain" />
                    <Text style={styles.cardBrandText}>EvenTime Pass</Text>
                  </View>
                  <View style={styles.scorePill}>
                    <Flame size={12} color="#F59E0B" />
                    <Text style={styles.scorePillText}>100 ET SCORE</Text>
                  </View>
                </View>

                <View style={styles.cardMiddle}>
                  <Text style={styles.cardUserTitle}>
                    {userType === 'student' ? (college || 'Campus Explorer') : 'Event Curator'}
                  </Text>
                  <Text style={styles.cardUserSub}>
                    {preferredCities.join(' • ')}
                  </Text>
                </View>

                <View style={styles.cardBottomRow}>
                  <View>
                    <Text style={styles.cardTagLabel}>ACCESS TIER</Text>
                    <Text style={styles.cardTagVal}>Verified Early Access</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardTagLabel}>INTERESTS</Text>
                    <Text style={styles.cardTagVal} numberOfLines={1}>
                      {selectedCategories.slice(0, 3).join(', ')}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.headline}>Your Feed is Ready.</Text>
              <Text style={styles.subheadline}>
                Sign in with Google to sync your bookmarks across devices, or dive straight in as a guest.
              </Text>

              {/* Primary: Quick Google Auth */}
              <TouchableOpacity
                style={styles.googleLaunchBtn}
                onPress={handleGoogleSignIn}
                disabled={Boolean(authLoading)}
                activeOpacity={0.88}
              >
                {authLoading === 'google' ? (
                  <ActivityIndicator size="small" color="#1E293B" />
                ) : (
                  <>
                    <Image source={APP_ASSETS.logo} style={styles.googleLogoSmall} contentFit="contain" />
                    <Text style={styles.googleLaunchText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Email Form Toggle or Quick Launch */}
              {!showEmailForm ? (
                <View style={styles.altActionsRow}>
                  <TouchableOpacity
                    style={styles.emailTextBtn}
                    onPress={() => setShowEmailForm(true)}
                  >
                    <Mail size={14} color="#6C47FF" />
                    <Text style={styles.emailTextBtnLabel}>Email Sign-in</Text>
                  </TouchableOpacity>

                  <Text style={{ color: '#CBD5E1' }}>•</Text>

                  <TouchableOpacity
                    style={styles.guestDirectBtn}
                    onPress={handleLaunchApp}
                    disabled={isSaving}
                  >
                    <Text style={styles.guestDirectLabel}>Explore as Guest</Text>
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

                  <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6C47FF', fontWeight: '700' }}>
                      {isSignUp ? 'Already registered? Sign In' : 'New to EvenTime? Create Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Bottom Action Bar for Steps 1-3 */}
      {step < 4 && (
        <View style={styles.bottomBar}>
          {step > 1 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <ArrowLeft size={18} color="#64748B" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}

          <TouchableOpacity style={styles.primaryNextBtn} onPress={handleNext} activeOpacity={0.88}>
            <Text style={styles.primaryNextText}>Continue</Text>
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  navBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
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
    marginBottom: 12,
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
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108, 71, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6C47FF',
    letterSpacing: 0.8,
  },
  headline: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  personaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  personaPillSelected: {
    borderColor: '#6C47FF',
    backgroundColor: '#FAF8FF',
  },
  personaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaIconBoxActive: {
    backgroundColor: '#6C47FF',
  },
  personaMainText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  personaMainTextActive: {
    color: '#6C47FF',
  },
  personaSubText: {
    fontSize: 12,
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
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  labelWithCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  counterBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C47FF',
  },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  smallPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  smallPillActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  smallPillTextActive: {
    color: '#FFFFFF',
  },
  yearPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yearPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  yearPillActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  yearPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  yearPillTextActive: {
    color: '#FFFFFF',
  },
  domainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  domainCardSelected: {
    borderColor: '#6C47FF',
    backgroundColor: '#FAF8FF',
  },
  domainCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  domainCardTextSelected: {
    color: '#6C47FF',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagPillActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  tagPillTextActive: {
    color: '#FFFFFF',
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  membershipCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  cardBrandText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scorePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.6,
  },
  cardMiddle: {
    marginBottom: 24,
  },
  cardUserTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  cardUserSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12,
  },
  cardTagLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.8,
  },
  cardTagVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  googleLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  googleLogoSmall: {
    width: 20,
    height: 20,
  },
  googleLaunchText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  altActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  emailTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  emailTextBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C47FF',
  },
  guestDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  guestDirectLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  emailBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  emailInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emailSubmitBtn: {
    backgroundColor: '#6C47FF',
    borderRadius: 12,
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryNextBtn: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C47FF',
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryNextText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
