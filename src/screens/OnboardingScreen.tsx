import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { GoogleIcon, GithubIcon } from '../components/SocialIcons';
import {
  GraduationCap,
  Briefcase,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
  ShieldCheck,
  Compass,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CITIES } from '../lib/constants/cities';
import { CATEGORIES_LIST } from '../lib/category-config';
import { INDIAN_COLLEGE_BRANCHES } from '../lib/constants/branches';
import { setHasCompletedOnboarding } from '../lib/guest-preferences';
import { APP_ASSETS } from '../lib/asset-registry';
import { theme } from '../config/theme';

interface CollegeItem {
  id: string;
  name: string;
  slug?: string | null;
}

const POPULAR_CITIES = [
  'Hyderabad',
  'Bengaluru',
  'Mumbai',
  'New Delhi',
  'Chennai',
  'Pune',
  'Kolkata',
  'Visakhapatnam',
] as const;

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

const GRAD_YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

const POPULAR_BRANCHES = [
  'CSE',
  'IT',
  'AI & ML',
  'Data Science',
  'ECE',
  'Mechanical',
  'Civil',
  'Electrical',
] as const;

// Tour slides data (Pure Apple-level UX writing, no AI badges)
const TOUR_SLIDES = [
  {
    image: APP_ASSETS.onboarding.screen1,
    headline: "All of India's Events.\nOne Unified Feed.",
    description:
      'Why switch between ten different apps? EvenTime indexes and organizes public events from Luma, BookMyShow, Unstop, Devfolio, college portals, and community groups into one live feed.',
  },
  {
    image: APP_ASSETS.onboarding.screen2,
    headline: 'Share Any Link.\nReach Thousands.',
    description:
      "You don't host events here — you curate and share them. Organizing a fest or spotted a great hackathon? Post your existing registration link and reach attendees for free.",
  },
  {
    image: APP_ASSETS.onboarding.screen3,
    headline: 'Your Campus,\nFront and Center.',
    description:
      'Never miss an inter-college symposium, cultural night, or 24-hour hackathon. Connect your university to see what is happening on your campus and neighboring colleges.',
  },
  {
    image: APP_ASSETS.onboarding.screen4,
    headline: "Find What's Happening\nRight Now.",
    description:
      'Filter events by date, 36+ curated categories, and major hubs across Hyderabad, Bengaluru, Mumbai, and Delhi. One tap opens the official source to register.',
  },
  {
    image: APP_ASSETS.onboarding.screen5,
    headline: 'Curate Events.\nClimb the Leaderboard.',
    description:
      'Discover hidden gems, submit verified event links, and build your curator reputation. Earn ET Score points for your contributions and top the national leaderboard.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const {
    user,
    profile,
    isAdmin,
    isOnboarded,
    isLoading: isAuthLoading,
    refreshProfile,
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  // Screen State:
  // 0 to 4: Tour Slides
  // 5: Auth & Gateway Screen
  // 6: Smart Profile Setup (Only for new users where !profile?.is_onboarded)
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auth form states for Slide 5
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasConsented, setHasConsented] = useState(true);
  const [authLoading, setAuthLoading] = useState<string | null>(null);

  // Profile Setup states (Step 6)
  const [profileSubStep, setProfileSubStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [climaxPhase, setClimaxPhase] = useState<'radar' | 'pass'>('radar');
  const [radarTextIndex, setRadarTextIndex] = useState(0);
  const [matchedEventsCount, setMatchedEventsCount] = useState<number>(18);

  const radarScale = useRef(new Animated.Value(0.8)).current;
  const radarOpacity = useRef(new Animated.Value(0.8)).current;
  const passScale = useRef(new Animated.Value(0.9)).current;
  const passOpacity = useRef(new Animated.Value(0)).current;

  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [role, setRole] = useState<'student' | 'professional'>('student');
  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegesList, setCollegesList] = useState<CollegeItem[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<CollegeItem | null>(null);
  const [isSearchingColleges, setIsSearchingColleges] = useState(false);
  const [gradYear, setGradYear] = useState('');
  const [branch, setBranch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [branchesList, setBranchesList] = useState<string[]>([]);

  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showAllCities, setShowAllCities] = useState(false);
  const [cityFilterQuery, setCityFilterQuery] = useState('');

  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categoryFilterQuery, setCategoryFilterQuery] = useState('');

  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 1. Cross-Platform Parity: If user logs in and already has completed onboarding on website
  useEffect(() => {
    if (!user) return;

    // DO NOT transition while profile is still loading from Supabase!
    if (isAuthLoading || profile === null) return;

    if ((isOnboarded || profile.is_onboarded) && profileSubStep !== 5) {
      setHasCompletedOnboarding(true).then(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      });
    } else if (currentSlide === 5) {
      // User signed in on Slide 5 and verified not onboarded
      setCurrentSlide(6);
    }
  }, [user, profile, isOnboarded, isAuthLoading, currentSlide, profileSubStep, navigation]);

  // College search debounce for profile setup
  useEffect(() => {
    if (role !== 'student' || currentSlide !== 6 || profileSubStep !== 2) return;
    const q = collegeSearch.trim();
    if (!q) {
      setCollegesList([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingColleges(true);
      try {
        const { data } = await supabase
          .from('colleges')
          .select('id, name, slug')
          .ilike('name', `%${q}%`)
          .limit(10);
        if (data) {
          setCollegesList(data);
        }
      } catch (err) {
        console.error('[Onboarding] College search error:', err);
      } finally {
        setIsSearchingColleges(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [collegeSearch, role, currentSlide, profileSubStep]);

  // Load live active event counts for categories and cities
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('category, city')
          .eq('status', 'approved');

        if (!error && data) {
          const catMap: Record<string, number> = {};
          const cityMap: Record<string, number> = {};
          data.forEach((ev) => {
            if (ev.category) {
              const cat = ev.category.trim();
              catMap[cat] = (catMap[cat] || 0) + 1;
            }
            if (ev.city) {
              const cTrim = ev.city.trim();
              const matchedCity = CITIES.find((c) => c.toLowerCase() === cTrim.toLowerCase()) || cTrim;
              cityMap[matchedCity] = (cityMap[matchedCity] || 0) + 1;
            }
          });
          setCategoryCounts(catMap);
          setCityCounts(cityMap);
        }
      } catch (err) {
        console.warn('[OnboardingScreen] Event counts load error:', err);
      }
    })();
  }, []);

  // 1:1 image size calculation
  const imageSize = Math.min(width - 64, 280);

  // Handlers for Tour Navigation
  const handleNextSlide = () => {
    if (currentSlide < 4) {
      setCurrentSlide((prev) => prev + 1);
    } else if (currentSlide === 4) {
      setCurrentSlide(5); // Go to Auth & Gateway
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleSkipToAuth = () => {
    setCurrentSlide(5);
  };

  const handleContinueAsGuest = async () => {
    await setHasCompletedOnboarding(true);
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  // Auth Handlers (Slide 5)
  const handleGoogleLogin = async () => {
    if (!hasConsented) {
      Alert.alert('Consent Required', 'Please accept the Terms and Privacy Policy to continue.');
      return;
    }
    setAuthLoading('google');
    const { error } = await signInWithGoogle();
    setAuthLoading(null);
    if (error) {
      Alert.alert('Sign-In Error', error.message || 'Could not complete Google Sign-In.');
    }
  };

  const handleGithubLogin = async () => {
    if (!hasConsented) {
      Alert.alert('Consent Required', 'Please accept the Terms and Privacy Policy to continue.');
      return;
    }
    setAuthLoading('github');
    const { error } = await signInWithGithub();
    setAuthLoading(null);
    if (error) {
      Alert.alert('Sign-In Error', error.message || 'Could not complete GitHub Sign-In.');
    }
  };

  const handleEmailAuth = async () => {
    if (!hasConsented) {
      Alert.alert('Consent Required', 'Please accept the Terms and Privacy Policy to continue.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      Alert.alert('Missing Fields', 'Please enter both your email and password.');
      return;
    }

    setAuthLoading('email');
    if (isSignUp) {
      const { error } = await signUpWithEmail(cleanEmail, password);
      setAuthLoading(null);
      if (error) {
        Alert.alert('Sign-Up Error', error.message);
      } else {
        Alert.alert('Account Created', 'Please check your email to verify your account before logging in.');
      }
    } else {
      const { error } = await signInWithEmail(cleanEmail, password);
      setAuthLoading(null);
      if (error) {
        Alert.alert('Sign-In Error', error.message);
      }
    }
  };

  // Profile Setup Validation & Handlers (Step 6)
  const handleValidateUsername = async () => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(clean);
    if (!clean) {
      setUsernameError('Please pick a unique username.');
      return;
    }
    if (clean.length > 12) {
      setUsernameError('Username must be 12 characters or less.');
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', user?.id || '')
        .maybeSingle();

      if (data) {
        setUsernameError('This username is already taken. Try another.');
      } else {
        setUsernameError('');
        setProfileSubStep(2); // Advance to Role/College
      }
    } catch (e) {
      console.error('[Onboarding] Username check error:', e);
      setProfileSubStep(2);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const startRadarAnimation = () => {
    setClimaxPhase('radar');
    setRadarTextIndex(0);

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(radarScale, {
            toValue: 1.8,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(radarScale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(radarOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(radarOpacity, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    setTimeout(() => {
      setRadarTextIndex(1);
    }, 600);

    setTimeout(() => {
      setRadarTextIndex(2);
    }, 1200);

    setTimeout(() => {
      setClimaxPhase('pass');
      Animated.parallel([
        Animated.spring(passScale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(passOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1800);
  };

  const handleSaveProfile = async () => {
    if (!user) {
      Alert.alert('Session Expired', 'Please sign in to complete your profile.');
      setCurrentSlide(5);
      return;
    }

    setIsSavingProfile(true);
    try {
      const cleanUsername = username.trim().toLowerCase();
      const updatePayload = {
        username: cleanUsername,
        user_type: role === 'student' ? 'student' : 'professional',
        college: role === 'student' ? selectedCollege?.name || collegeSearch.trim() || null : null,
        college_id: role === 'student' ? selectedCollege?.id || null : null,
        graduation_year: role === 'student' ? gradYear || null : null,
        branch: role === 'student' ? branch || null : null,
        preferred_cities: selectedCities,
        goals: selectedGoals.slice(0, isAdmin ? undefined : 6),
        is_onboarded: true,
      };

      const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user.id);

      if (error) {
        throw error;
      }

      // Award +50 ET Score for completing onboarding (Matching website action)
      try {
        await supabase.rpc('increment_et_score', { user_id: user.id, delta: 50 });
      } catch (rpcErr) {
        console.warn('[Onboarding] increment_et_score error:', rpcErr);
      }

      await refreshProfile();
      await setHasCompletedOnboarding(true);

      // Query matched events count in user's selected cities
      try {
        const { count } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .in('city', selectedCities.length > 0 ? selectedCities : ['Hyderabad']);
        if (count && count > 0) {
          setMatchedEventsCount(count);
        }
      } catch (cntErr) {
        setMatchedEventsCount(18);
      }

      setProfileSubStep(5);
      startRadarAnimation();
    } catch (err: any) {
      console.error('[Onboarding] Profile save error:', err);
      Alert.alert('Save Failed', err.message || 'Could not save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Branch search & autocomplete handlers
  const handleBranchSearchChange = (text: string) => {
    setBranchSearch(text);
    setBranch(text);
    const q = text.trim().toLowerCase();
    if (!q) {
      setBranchesList([]);
      return;
    }
    const matches = INDIAN_COLLEGE_BRANCHES.filter((b) =>
      b.toLowerCase().includes(q)
    ).slice(0, 8);
    setBranchesList(matches);
  };

  const handleSelectBranch = (b: string) => {
    setBranch(b);
    setBranchSearch(b);
    setBranchesList([]);
  };

  const handleClearBranch = () => {
    setBranch('');
    setBranchSearch('');
    setBranchesList([]);
  };

  // Filtered Cities list for step 3
  const filteredCities = useMemo(() => {
    if (!showAllCities) {
      return POPULAR_CITIES;
    }
    if (!cityFilterQuery.trim()) {
      return CITIES;
    }
    const q = cityFilterQuery.trim().toLowerCase();
    return CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [showAllCities, cityFilterQuery]);

  // Filtered Categories list for step 4
  const filteredCategories = useMemo(() => {
    if (!showAllCategories) {
      return POPULAR_CATEGORIES;
    }
    if (!categoryFilterQuery.trim()) {
      return CATEGORIES_LIST;
    }
    const q = categoryFilterQuery.trim().toLowerCase();
    return CATEGORIES_LIST.filter((cat) => cat.toLowerCase().includes(q));
  }, [showAllCategories, categoryFilterQuery]);

  // Toggle helpers for multi-select
  const toggleCity = (city: string) => {
    if (selectedCities.includes(city)) {
      setSelectedCities(selectedCities.filter((c) => c !== city));
    } else {
      if (!isAdmin && selectedCities.length >= 3) {
        Alert.alert('Limit Reached', 'You can pick up to 3 primary cities.');
        return;
      }
      setSelectedCities([...selectedCities, city]);
    }
  };

  const toggleGoal = (cat: string) => {
    if (selectedGoals.includes(cat)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== cat));
    } else {
      if (!isAdmin && selectedGoals.length >= 6) {
        Alert.alert('Limit Reached', 'You can pick up to 6 interests.');
        return;
      }
      setSelectedGoals([...selectedGoals, cat]);
    }
  };

  // ==========================================
  // RENDER: Loading Transition (When logged in and fetching profile)
  // ==========================================
  if (user && (isAuthLoading || profile === null)) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6C47FF" />
        <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
          Personalizing your experience...
        </Text>
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER: Tour Slides (0 - 4)
  // ==========================================
  if (currentSlide < 5) {
    const slide = TOUR_SLIDES[currentSlide];

    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top Bar: Brand & Skip */}
        <View style={styles.tourHeader}>
          {currentSlide > 0 ? (
            <TouchableOpacity style={styles.navIconButton} onPress={handlePrevSlide} activeOpacity={0.7}>
              <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <TouchableOpacity style={styles.skipButton} onPress={handleSkipToAuth} activeOpacity={0.7}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Center: 1:1 Centered Placeholder Graphic Container */}
        <View style={styles.centerVisualArea}>
          <View
            style={[
              styles.imageContainer1x1,
              { width: imageSize, height: imageSize, borderRadius: 28 },
            ]}
          >
            <Image
              source={slide.image}
              style={styles.image1x1}
              contentFit="cover"
              cachePolicy="none"
              priority="high"
              transition={200}
            />
          </View>
        </View>

        {/* Bottom Content Area: Apple-grade Typography & Nav */}
        <View style={styles.tourContentArea}>
          <Text style={styles.tourHeadline}>{slide.headline}</Text>
          <Text style={styles.tourDescription}>{slide.description}</Text>

          {/* Dots & Action Row */}
          <View style={styles.tourFooter}>
            {/* 5 Dots indicator */}
            <View style={styles.dotsRow}>
              {TOUR_SLIDES.map((_, index) => {
                const isActive = index === currentSlide;
                return (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      isActive ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                );
              })}
            </View>

            {/* Next / Continue Button */}
            <TouchableOpacity
              style={styles.tourPrimaryBtn}
              onPress={handleNextSlide}
              activeOpacity={0.85}
            >
              <Text style={styles.tourPrimaryBtnText}>
                {currentSlide === 4 ? 'Get Started' : 'Continue'}
              </Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER: Slide 5 - Auth & Gateway Screen
  // ==========================================
  if (currentSlide === 5) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.authScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back to Tour Button */}
            <View style={styles.authTopRow}>
              <TouchableOpacity
                style={styles.navIconButton}
                onPress={() => setCurrentSlide(4)}
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* 1:1 Centered Brand Graphic Placeholder */}
            <View style={styles.authVisualArea}>
              <View
                style={[
                  styles.imageContainer1x1,
                  { width: Math.min(width - 96, 200), height: Math.min(width - 96, 200), borderRadius: 24 },
                ]}
              >
                <Image
                  source={APP_ASSETS.onboarding.screen6}
                  style={styles.image1x1}
                  contentFit="cover"
                  cachePolicy="none"
                  priority="high"
                  transition={200}
                />
              </View>
            </View>

            {/* Header Typography */}
            <View style={styles.authHeader}>
              <Text style={styles.authTitle}>Step into India’s{'\n'}Event Dictionary.</Text>
              <Text style={styles.authSubtitle}>
                Sign in to personalize your feed, or start exploring immediately.
              </Text>
            </View>

            {/* Auth Buttons Stack (Google & GitHub Pushed First) */}
            <View style={styles.authButtonsStack}>
              {/* 1. Google Sign In */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleLogin}
                activeOpacity={0.85}
                disabled={authLoading !== null}
              >
                {authLoading === 'google' ? (
                  <ActivityIndicator color="#0F172A" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <View style={{ marginRight: 10 }}>
                      <GoogleIcon size={20} />
                    </View>
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* 2. GitHub Sign In */}
              <TouchableOpacity
                style={styles.githubBtn}
                onPress={handleGithubLogin}
                activeOpacity={0.85}
                disabled={authLoading !== null}
              >
                {authLoading === 'github' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <View style={{ marginRight: 10 }}>
                      <GithubIcon size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.githubBtnText}>Continue with GitHub</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* 3. Email Toggle / Form */}
              {!showEmailForm ? (
                <TouchableOpacity
                  style={styles.emailToggleBtn}
                  onPress={() => setShowEmailForm(true)}
                  activeOpacity={0.8}
                >
                  <Mail size={16} color="#475569" style={{ marginRight: 8 }} />
                  <Text style={styles.emailToggleText}>Continue with Email</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.emailFormBox}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="you@example.com"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="••••••••"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.emailSubmitBtn}
                    onPress={handleEmailAuth}
                    activeOpacity={0.85}
                    disabled={authLoading !== null}
                  >
                    {authLoading === 'email' ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.emailSubmitBtnText}>
                        {isSignUp ? 'Create Account' : 'Sign In with Email'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.switchAuthModeBtn}
                    onPress={() => setIsSignUp(!isSignUp)}
                  >
                    <Text style={styles.switchAuthModeText}>
                      {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 4. Continue as Guest (Exploration Entry) */}
              <TouchableOpacity
                style={styles.guestLinkBtn}
                onPress={handleContinueAsGuest}
                activeOpacity={0.7}
              >
                <Text style={styles.guestLinkText}>Explore as Guest</Text>
                <ArrowRight size={15} color="#6C47FF" />
              </TouchableOpacity>
            </View>

            {/* Legal & Consent Notice */}
            <View style={styles.legalNotice}>
              <Text style={styles.legalText}>
                By continuing, you agree to EvenTime’s Terms of Service and Privacy Policy.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER: Step 6 - Profile Setup (New Users Only)
  // ==========================================
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.profileSetupScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header (Only shown during input steps 1 to 4) */}
          {profileSubStep <= 4 && (
            <View style={styles.setupHeader}>
              <View style={styles.stepBadgeRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.setupStepIndicator}>Step {profileSubStep} of 4</Text>
                </View>
                {isAdmin && (
                  <View style={styles.adminBadge}>
                    <ShieldCheck size={12} color="#6C47FF" />
                    <Text style={styles.adminBadgeText}>Admin Access</Text>
                  </View>
                )}
              </View>
              <Text style={styles.setupTitle}>
                {profileSubStep === 1 && 'Pick Your Username'}
                {profileSubStep === 2 && 'Campus & Background'}
                {profileSubStep === 3 && 'Your Event Hubs'}
                {profileSubStep === 4 && 'Personalize Your Feed'}
              </Text>
              <Text style={styles.setupSubtitle}>
                {profileSubStep === 1 && 'Your unique handle for sharing, curating, and discovering events across India.'}
                {profileSubStep === 2 && 'Connect your university to unlock internal campus fests and department hackathons.'}
                {profileSubStep === 3 && 'Choose cities you want to track. We will curate meetups and fests in your area.'}
                {profileSubStep === 4 && 'Pick categories you care about to train your personal recommendation feed.'}
              </Text>
            </View>
          )}

          {/* SUB-STEP 1: Username */}
          {profileSubStep === 1 && (
            <View style={styles.setupCard}>
              <Text style={styles.inputLabel}>Username (Unique handle)</Text>
              <View style={styles.usernameInputRow}>
                <Text style={styles.atSymbol}>@</Text>
                <TextInput
                  style={styles.usernameInput}
                  placeholder="username"
                  placeholderTextColor="#94A3B8"
                  value={username}
                  maxLength={12}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(t) => {
                    setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    setUsernameError('');
                  }}
                />
              </View>
              {Boolean(usernameError) && (
                <Text style={styles.errorMessage}>{usernameError}</Text>
              )}

              <TouchableOpacity
                style={[styles.tourPrimaryBtn, { marginTop: 24 }]}
                onPress={handleValidateUsername}
                disabled={isCheckingUsername}
                activeOpacity={0.85}
              >
                {isCheckingUsername ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.tourPrimaryBtnText}>Continue</Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* SUB-STEP 2: Role & College */}
          {profileSubStep === 2 && (
            <View style={styles.setupCard}>
              {/* Role Selector */}
              <View style={styles.roleTabsRow}>
                <TouchableOpacity
                  style={[styles.roleTab, role === 'student' && styles.roleTabActive]}
                  onPress={() => setRole('student')}
                  activeOpacity={0.8}
                >
                  <GraduationCap size={18} color={role === 'student' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.roleTabText, role === 'student' && styles.roleTabTextActive]}>
                    Student
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleTab, role === 'professional' && styles.roleTabActive]}
                  onPress={() => setRole('professional')}
                  activeOpacity={0.8}
                >
                  <Briefcase size={18} color={role === 'professional' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.roleTabText, role === 'professional' && styles.roleTabTextActive]}>
                    Working Pro
                  </Text>
                </TouchableOpacity>
              </View>

              {role === 'student' ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.inputLabel}>College / University</Text>
                  <View style={styles.searchBox}>
                    <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search college (e.g. CBIT, IIT, BITS)..."
                      placeholderTextColor="#94A3B8"
                      value={selectedCollege ? selectedCollege.name : collegeSearch}
                      onChangeText={(t) => {
                        setSelectedCollege(null);
                        setCollegeSearch(t);
                      }}
                    />
                    {isSearchingColleges && <ActivityIndicator size="small" color="#6C47FF" />}
                  </View>

                  {/* College suggestions dropdown */}
                  {!selectedCollege && collegesList.length > 0 && (
                    <View style={styles.suggestionsBox}>
                      {collegesList.map((col) => (
                        <TouchableOpacity
                          key={col.id}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setSelectedCollege(col);
                            setCollegeSearch(col.name);
                            setCollegesList([]);
                          }}
                        >
                          <Text style={styles.suggestionText}>{col.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Graduation Year */}
                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>Graduation Year</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {GRAD_YEARS.map((y) => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.chip, gradYear === y && styles.chipActive]}
                        onPress={() => setGradYear(y)}
                      >
                        <Text style={[styles.chipText, gradYear === y && styles.chipTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Branch / Stream with Live Search & Autocomplete */}
                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>Branch / Stream</Text>
                  <View style={styles.searchBox}>
                    <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search 170+ branches (CSE, Biotech, Civil...)"
                      placeholderTextColor="#94A3B8"
                      value={branchSearch || branch}
                      onChangeText={handleBranchSearchChange}
                    />
                    {Boolean(branchSearch || branch) && (
                      <TouchableOpacity onPress={handleClearBranch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <X size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Branch suggestions dropdown */}
                  {branchesList.length > 0 && (
                    <View style={styles.suggestionsBox}>
                      {branchesList.map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectBranch(b)}
                        >
                          <Text style={styles.suggestionText}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Popular Branch Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {POPULAR_BRANCHES.map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={[styles.chip, branch === b && styles.chipActive]}
                        onPress={() => handleSelectBranch(b)}
                      >
                        <Text style={[styles.chipText, branch === b && styles.chipTextActive]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {Boolean(branch) && (
                    <View style={styles.selectedBranchBadge}>
                      <Text style={styles.selectedBranchText}>Selected: {branch}</Text>
                    </View>
                  )}
                </View>
              ) : null}

              <View style={styles.stepButtonsRow}>
                <TouchableOpacity
                  style={styles.stepBackBtn}
                  onPress={() => setProfileSubStep(1)}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={18} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stepNextBtn}
                  onPress={() => setProfileSubStep(3)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.stepNextBtnText}>Next: Cities</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SUB-STEP 3: Cities Selection */}
          {profileSubStep === 3 && (
            <View style={styles.setupCard}>
              <View style={styles.selectionHeaderRow}>
                <Text style={styles.selectionCounter}>
                  {selectedCities.length} {isAdmin ? 'Selected (Unlimited)' : 'of 3 cities selected'}
                </Text>

                <TouchableOpacity
                  style={styles.toggleAllBtn}
                  onPress={() => {
                    setShowAllCities((prev) => !prev);
                    setCityFilterQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleAllBtnText}>
                    {showAllCities ? 'Show Top Cities ▴' : 'Show All (32 Cities) ▾'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.priorityHelperText}>
                Tap in order of preference — #1 is your Home City for leaderboards.
              </Text>

              {showAllCities && (
                <View style={[styles.searchBox, { marginBottom: 12 }]}>
                  <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search 32 cities across India..."
                    placeholderTextColor="#94A3B8"
                    value={cityFilterQuery}
                    onChangeText={setCityFilterQuery}
                  />
                  {Boolean(cityFilterQuery) && (
                    <TouchableOpacity onPress={() => setCityFilterQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.selectionGrid}>
                {filteredCities.map((c) => {
                  const isSelected = selectedCities.includes(c);
                  const priorityIndex = isSelected ? selectedCities.indexOf(c) + 1 : null;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.gridChip, isSelected && styles.gridChipActive]}
                      onPress={() => toggleCity(c)}
                      activeOpacity={0.7}
                    >
                      {isSelected && priorityIndex !== null && (
                        <View style={styles.priorityBadge}>
                          <Text style={styles.priorityBadgeText}>{priorityIndex}</Text>
                        </View>
                      )}
                      <Text style={[styles.gridChipText, isSelected && styles.gridChipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.stepButtonsRow}>
                <TouchableOpacity
                  style={styles.stepBackBtn}
                  onPress={() => setProfileSubStep(2)}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={18} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stepNextBtn}
                  onPress={() => {
                    if (selectedCities.length === 0) {
                      Alert.alert('Selection Required', 'Please select at least 1 city to discover local events.');
                      return;
                    }
                    setProfileSubStep(4);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.stepNextBtnText}>Next: Interests</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SUB-STEP 4: Interests & Goals */}
          {profileSubStep === 4 && (
            <View style={styles.setupCard}>
              <View style={styles.selectionHeaderRow}>
                <Text style={styles.selectionCounter}>
                  {selectedGoals.length} {isAdmin ? 'Selected (Unlimited)' : 'of 6 interests selected'}
                </Text>

                <TouchableOpacity
                  style={styles.toggleAllBtn}
                  onPress={() => {
                    setShowAllCategories((prev) => !prev);
                    setCategoryFilterQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleAllBtnText}>
                    {showAllCategories ? 'Show Top Categories ▴' : 'Show All (36 Categories) ▾'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showAllCategories && (
                <View style={[styles.searchBox, { marginBottom: 12 }]}>
                  <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search 36 categories..."
                    placeholderTextColor="#94A3B8"
                    value={categoryFilterQuery}
                    onChangeText={setCategoryFilterQuery}
                  />
                  {Boolean(categoryFilterQuery) && (
                    <TouchableOpacity onPress={() => setCategoryFilterQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.selectionGrid}>
                {filteredCategories.map((cat) => {
                  const isSelected = selectedGoals.includes(cat);
                  const count = categoryCounts[cat] || 0;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.gridChip, isSelected && styles.gridChipActive]}
                      onPress={() => toggleGoal(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.gridChipText, isSelected && styles.gridChipTextActive]}>
                        {cat}
                        {count > 0 ? ` (${count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.stepButtonsRow}>
                <TouchableOpacity
                  style={styles.stepBackBtn}
                  onPress={() => setProfileSubStep(3)}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={18} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stepNextBtn, { backgroundColor: '#6C47FF' }]}
                  onPress={() => {
                    if (selectedGoals.length === 0) {
                      Alert.alert('Selection Required', 'Please select at least 1 category to personalize your feed.');
                      return;
                    }
                    handleSaveProfile();
                  }}
                  disabled={isSavingProfile}
                  activeOpacity={0.85}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.stepNextBtnText}>Complete Profile</Text>
                      <View style={styles.claimEtBadge}>
                        <Text style={styles.claimEtBadgeText}>+50 ET</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SUB-STEP 5: Tim Gabe Climax - Pulsing Radar & Discovery Pass (Zero Checkmarks) */}
          {profileSubStep === 5 && (
            <View style={styles.climaxContainer}>
              {climaxPhase === 'radar' ? (
                <View style={styles.radarContainer}>
                  <View style={styles.radarPulseWrapper}>
                    <Animated.View
                      style={[
                        styles.radarRing,
                        {
                          transform: [{ scale: radarScale }],
                          opacity: radarOpacity,
                        },
                      ]}
                    />
                    <View style={styles.radarCore}>
                      <Compass size={24} color="#6C47FF" />
                    </View>
                  </View>

                  <View style={styles.radarStatusBox}>
                    <Text style={styles.radarStatusTitle}>
                      {radarTextIndex === 0
                        ? `Finding events in ${selectedCities[0] || 'your city'}...`
                        : radarTextIndex === 1
                        ? role === 'student'
                          ? `Checking campus fests for ${selectedCollege?.name || collegeSearch.trim() || 'your college'}...`
                          : `Finding top events in ${selectedCities[0] || 'your city'}...`
                        : 'Your feed is ready!'}
                    </Text>
                    <Text style={styles.radarStatusSub}>
                      Personalizing your events feed
                    </Text>
                  </View>
                </View>
              ) : (
                <Animated.View
                  style={[
                    styles.passWrapper,
                    {
                      opacity: passOpacity,
                      transform: [{ scale: passScale }],
                    },
                  ]}
                >
                  {/* Clean Human-Friendly Discovery Pass */}
                  <View style={styles.passCard}>
                    {/* Header */}
                    <View style={styles.passHeader}>
                      <View>
                        <Text style={styles.passOverline}>EVEN·TIME PASS</Text>
                        <Text style={styles.passTitle}>You're All Set!</Text>
                      </View>
                      <View style={styles.passBadge}>
                        <View style={styles.passBadgeDot} />
                        <Text style={styles.passBadgeText}>READY</Text>
                      </View>
                    </View>

                    <View style={styles.passDivider} />

                    {/* User Identity Strip */}
                    <View style={styles.passUserRow}>
                      <View style={styles.passAvatar}>
                        <Text style={styles.passAvatarLetter}>
                          {(username || 'E').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.passUserInfo}>
                        <Text style={styles.passHandle}>@{username || 'member'}</Text>
                        <Text style={styles.passRoleLabel} numberOfLines={1}>
                          {role === 'student'
                            ? `Student · ${selectedCollege?.name || collegeSearch.trim() || 'Campus'}`
                            : `Member · ${selectedCities[0] || 'City'}`}
                        </Text>
                      </View>
                    </View>

                    {/* 3 Clear Metrics */}
                    <View style={styles.passMetricsGrid}>
                      <View style={styles.passMetricBox}>
                        <Text style={styles.passMetricVal}>{matchedEventsCount || 18}</Text>
                        <Text style={styles.passMetricLbl}>Events Near You</Text>
                      </View>
                      <View style={styles.passMetricBox}>
                        <Text style={styles.passMetricVal}>
                          {role === 'student' ? 'College Events' : 'City Events'}
                        </Text>
                        <Text style={styles.passMetricLbl}>Access</Text>
                      </View>
                      <View style={styles.passMetricBox}>
                        <Text style={[styles.passMetricVal, { color: '#6C47FF' }]}>+50 ET</Text>
                        <Text style={styles.passMetricLbl}>Bonus Score</Text>
                      </View>
                    </View>

                    {/* Reassurance text */}
                    <View style={styles.passNoteBox}>
                      <Text style={styles.passNoteText}>
                        We've picked the top events, workshops, and fests for you. Tap below to start exploring!
                      </Text>
                    </View>
                  </View>

                  {/* Launch CTA */}
                  <TouchableOpacity
                    style={styles.passLaunchBtn}
                    onPress={() => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'MainTabs' }],
                      });
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.passLaunchBtnText}>Explore Events</Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ---------------------------------------------
  // Tour Layout Styles
  // ---------------------------------------------
  tourHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  skipButtonText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#64748B',
  },
  centerVisualArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  imageContainer1x1: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  image1x1: {
    width: '100%',
    height: '100%',
  },
  tourContentArea: {
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  tourHeadline: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    color: '#0F172A',
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 10,
  },
  tourDescription: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
    marginBottom: 28,
  },
  tourFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: '#6C47FF',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#E2E8F0',
  },
  tourPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  tourPrimaryBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  // ---------------------------------------------
  // Slide 5: Auth & Gateway Styles
  // ---------------------------------------------
  authScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  authTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  authVisualArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  authHeader: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 30,
    marginBottom: 8,
  },
  authSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  authButtonsStack: {
    gap: 12,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleG: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  googleBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: '#0F172A',
  },
  githubBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  githubBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  emailToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 13,
    borderRadius: 100,
  },
  emailToggleText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#475569',
  },
  emailFormBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#475569',
  },
  textInput: {
    fontFamily: 'Switzer-Regular',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    fontFamily: 'Switzer-Regular',
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 4,
  },
  emailSubmitBtn: {
    backgroundColor: '#6C47FF',
    paddingVertical: 13,
    borderRadius: 100,
    alignItems: 'center',
    marginTop: 4,
  },
  emailSubmitBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  switchAuthModeBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchAuthModeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#6C47FF',
  },
  guestLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  guestLinkText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#6C47FF',
  },
  legalNotice: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  legalText: {
    fontFamily: 'Switzer-Regular',
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },

  // ---------------------------------------------
  // Step 6: Profile Setup Styles
  // ---------------------------------------------
  profileSetupScroll: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  setupHeader: {
    marginBottom: 24,
  },
  stepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  setupStepIndicator: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#6C47FF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  adminBadgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#059669',
  },
  setupTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    color: '#0F172A',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  setupSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  setupCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 24,
    padding: 20,
  },
  usernameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  atSymbol: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#6C47FF',
    marginRight: 6,
  },
  usernameInput: {
    fontFamily: 'Switzer-Bold',
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  errorMessage: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  roleTabsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 14,
  },
  roleTabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  roleTabText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#64748B',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  searchInput: {
    fontFamily: 'Switzer-Regular',
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  suggestionsBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#0F172A',
  },
  chipRow: {
    gap: 8,
    paddingVertical: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  chipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  selectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  selectionCounter: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#6C47FF',
  },
  toggleAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 100,
  },
  toggleAllBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#6C47FF',
  },
  selectedBranchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  selectedBranchText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#059669',
  },
  claimEtBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    marginLeft: 4,
  },
  claimEtBadgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  priorityHelperText: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridChipActive: {
    backgroundColor: '#F3F0FF',
    borderColor: '#6C47FF',
  },
  priorityBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  priorityBadgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
    color: '#FFFFFF',
    lineHeight: 12,
  },
  gridChipText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#475569',
  },
  gridChipTextActive: {
    fontFamily: 'Switzer-Bold',
    color: '#6C47FF',
  },
  stepButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  stepBackBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNextBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 100,
    backgroundColor: '#0F172A',
    gap: 8,
  },
  stepNextBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  // ---------------------------------------------
  // Step 5: Climax & Discovery Pass Styles
  // ---------------------------------------------
  climaxContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    width: '100%',
  },
  radarPulseWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#6C47FF',
    backgroundColor: 'rgba(108, 71, 255, 0.08)',
  },
  radarCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  radarStatusBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  radarStatusTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  radarStatusSub: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  passWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  passCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 20,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passOverline: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
    color: '#6C47FF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  passTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#0F172A',
    marginTop: 2,
  },
  passBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  passBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 2,
  },
  passBadgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
    color: '#059669',
    letterSpacing: 0.8,
  },
  passDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  passUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  passAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passAvatarLetter: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  passUserInfo: {
    flex: 1,
  },
  passHandle: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: '#0F172A',
  },
  passRoleLabel: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  passMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  passMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  passMetricVal: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  passMetricLbl: {
    fontFamily: 'Switzer-Medium',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  passNoteBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  passNoteText: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#4C1D95',
    lineHeight: 18,
    textAlign: 'center',
  },
  passLaunchBtn: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  passLaunchBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
