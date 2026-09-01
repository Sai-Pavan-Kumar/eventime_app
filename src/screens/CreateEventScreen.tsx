import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Link2,
  GraduationCap,
  Building,
  Hourglass,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CATEGORIES_LIST } from '../lib/category-config';
import { CITIES } from '../lib/constants/cities';
import { INDIAN_COLLEGE_BRANCHES } from '../lib/constants/branches';
import { CAREER_GOALS } from '../lib/constants/goals';
import { uploadEventPoster } from '../lib/storage';
import type { RootStackParamList } from '../types';

export default function CreateEventScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateEvent'>>();
  const { user, profile, isAdmin } = useAuth();

  const editId = route.params?.editId;
  const initialEvent = route.params?.event;

  // Form Fields
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [regLink, setRegLink] = useState(initialEvent?.registration_link || '');
  const [category, setCategory] = useState<string>(initialEvent?.category || CATEGORIES_LIST[0]);
  const [dateString, setDateString] = useState(initialEvent?.date_string || '');
  const [endDateString, setEndDateString] = useState(initialEvent?.end_date_string || '');
  const [registrationDeadline, setRegistrationDeadline] = useState(initialEvent?.registration_deadline || '');
  const [startTime, setStartTime] = useState(initialEvent?.start_time || '');
  const [endTime, setEndTime] = useState(initialEvent?.end_time || '');
  const [isVirtual, setIsVirtual] = useState(initialEvent?.is_virtual || false);
  const [city, setCity] = useState<string>(initialEvent?.city || CITIES[0]);
  const [location, setLocation] = useState(initialEvent?.location || '');
  const [isFree, setIsFree] = useState(initialEvent?.is_free !== false);
  const [price, setPrice] = useState(initialEvent?.price ? String(initialEvent.price) : '');
  const [organizerName, setOrganizerName] = useState(initialEvent?.organizer_name || profile?.full_name || '');
  const [website, setWebsite] = useState(initialEvent?.website || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [prizes, setPrizes] = useState(initialEvent?.prizes || '');
  const [teamSize, setTeamSize] = useState(initialEvent?.team_size || 'Solo');
  const [posterUri, setPosterUri] = useState<string | null>(initialEvent?.poster_url || null);
  const [isFeatured, setIsFeatured] = useState(initialEvent?.is_featured || false);
  const [goalTags, setGoalTags] = useState<string[]>(initialEvent?.goal_tags || []);

  // College & Campus event settings
  const [collegeOnly, setCollegeOnly] = useState(initialEvent?.college_only || false);
  const [collegeName, setCollegeName] = useState(initialEvent?.colleges?.name || profile?.college || '');
  const [collegeId, setCollegeId] = useState<string | null>(initialEvent?.college_id || profile?.college_id || null);
  const [collegeBranch, setCollegeBranch] = useState(initialEvent?.college_branch || profile?.branch || '');
  const [collegeYear, setCollegeYear] = useState(initialEvent?.college_year || profile?.graduation_year || '');
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('');
  const [collegesList, setCollegesList] = useState<any[]>([]);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [isSearchingColleges, setIsSearchingColleges] = useState(false);

  // Trust check state
  const [isTrusted, setIsTrusted] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(Boolean(editId && !initialEvent));

  // Search colleges when query changes
  useEffect(() => {
    const q = collegeSearchQuery.trim();
    if (!q) {
      setCollegesList([]);
      return;
    }
    setIsSearchingColleges(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('colleges')
          .select('id, name')
          .ilike('name', `%${q}%`)
          .limit(6);
        setCollegesList(data || []);
      } catch (err) {
        console.error('Colleges search error:', err);
      } finally {
        setIsSearchingColleges(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [collegeSearchQuery]);

  // Load existing event data if in edit mode and initialEvent not provided
  useEffect(() => {
    if (!editId || initialEvent) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, colleges(name)')
          .eq('id', editId)
          .single();
        if (error) throw error;
        if (data) {
          setTitle(data.title);
          setRegLink(data.registration_link || '');
          setCategory(data.category);
          setDateString(data.date_string);
          setEndDateString(data.end_date_string || '');
          setRegistrationDeadline(data.registration_deadline || '');
          setStartTime(data.start_time || '');
          setEndTime(data.end_time || '');
          setIsVirtual(data.is_virtual || false);
          setCity(data.city || CITIES[0]);
          setLocation(data.location || '');
          setIsFree(data.is_free !== false);
          setPrice(data.price ? String(data.price) : '');
          setOrganizerName(data.organizer_name);
          setWebsite(data.website || '');
          setDescription(data.description || '');
          setPrizes(data.prizes || '');
          setTeamSize(data.team_size || 'Solo');
          setPosterUri(data.poster_url);
          setIsFeatured(data.is_featured || false);
          setGoalTags(data.goal_tags || []);
          setCollegeOnly(data.college_only || false);
          setCollegeId(data.college_id || null);
          setCollegeName((data as any).colleges?.name || '');
          setCollegeBranch(data.college_branch || '');
          setCollegeYear(data.college_year || '');
        }
      } catch (err) {
        console.error('Fetch edit event error:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    })();
  }, [editId, initialEvent]);

  // Verified domain & duplicate check when registration link changes
  const checkLink = async (url: string) => {
    setRegLink(url);
    setDuplicateError('');
    if (!url || !url.startsWith('http')) {
      setIsTrusted(false);
      return;
    }

    setIsCheckingDomain(true);
    try {
      // 1. Duplicate check
      let dupQuery = supabase.from('events').select('id, title').eq('registration_link', url.trim());
      if (editId) dupQuery = dupQuery.neq('id', editId);
      const { data: duplicate } = await dupQuery.maybeSingle();

      if (duplicate) {
        setDuplicateError(`This event was already posted as "${duplicate.title}".`);
        setIsCheckingDomain(false);
        return;
      }

      // 2. Verified domain lookup
      const { data: trustedDomains } = await supabase.from('verified_domains').select('domain_name');

      let hostname = '';
      try {
        hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      } catch {
        hostname = '';
      }

      const trusted = !!trustedDomains?.some((d) => {
        const dName = d.domain_name.toLowerCase().replace(/^www\./, '');
        return hostname === dName || hostname.endsWith(`.${dName}`);
      });

      setIsTrusted(trusted);
    } catch (e) {
      console.error('Domain check error:', e);
    } finally {
      setIsCheckingDomain(false);
    }
  };

  const toggleGoalTag = (goal: string) => {
    if (goalTags.includes(goal)) {
      setGoalTags(goalTags.filter((g) => g !== goal));
    } else {
      setGoalTags([...goalTags, goal]);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera roll permissions are required to upload event posters.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPosterUri(result.assets[0].uri);
    }
  };

  const generateSlug = (eventTitle: string, eventCity: string, dateStr: string): string => {
    const slugTitle = eventTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const cleanCity = (eventCity || 'online')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${slugTitle}-${cleanCity}-${randomSuffix}`;
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to submit an event.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter an event title.');
      return;
    }

    if (!dateString.trim()) {
      Alert.alert('Date Required', 'Please enter event date (e.g. 15 Oct 2026).');
      return;
    }

    if (duplicateError) {
      Alert.alert('Duplicate Event', duplicateError);
      return;
    }

    setIsSubmitting(true);

    try {
      let finalPosterUrl = posterUri;

      // If a local image URI was selected (file://), upload to storage
      if (posterUri && posterUri.startsWith('file://')) {
        finalPosterUrl = await uploadEventPoster(posterUri);
      }

      const effectiveCity = isVirtual ? 'online' : city;
      const uniqueSlug = editId ? undefined : generateSlug(title, effectiveCity, dateString);

      const status = isAdmin || isTrusted ? 'approved' : 'pending';
      const isCollegeCategory = category === 'Campus' || category === 'College Fests' || category === 'Hackathons';

      const payload: any = {
        title: title.trim(),
        category,
        date_string: dateString.trim(),
        end_date_string: endDateString.trim() || null,
        registration_deadline: registrationDeadline.trim() || null,
        start_time: startTime.trim() || null,
        end_time: endTime.trim() || null,
        is_virtual: isVirtual,
        city: isVirtual ? 'online' : city,
        location: isVirtual ? 'Online' : location.trim() || city,
        is_free: isFree,
        price: !isFree && price ? parseFloat(price) : null,
        organizer_name: organizerName.trim() || profile?.full_name || 'Event Curator',
        registration_link: regLink.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
        prizes: prizes.trim() || null,
        team_size: teamSize,
        poster_url: finalPosterUrl,
        is_featured: isAdmin ? isFeatured : false,
        goal_tags: goalTags.length > 0 ? goalTags : null,
        college_only: isCollegeCategory && collegeId ? collegeOnly : false,
        college_id: isCollegeCategory ? collegeId : null,
        college_name: isCollegeCategory ? collegeName : null,
        college_branch: isCollegeCategory ? collegeBranch : null,
        branch_tags: isCollegeCategory && collegeBranch ? [collegeBranch] : null,
        college_year: isCollegeCategory ? collegeYear : null,
        target_audience: isCollegeCategory && collegeOnly ? ['College Students'] : ['Everyone'],
      };

      if (editId) {
        let updateQuery = supabase
          .from('events')
          .update(payload)
          .eq('id', editId);

        // If not admin, restrict update to own event
        if (!isAdmin) {
          updateQuery = updateQuery.eq('creator_id', user.id);
        }

        const { error } = await updateQuery;
        if (error) throw error;
        Alert.alert('Success', 'Event updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        payload.slug = uniqueSlug;
        payload.creator_id = user.id;
        payload.status = status;

        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;

        // If approved right away, award +100 ET points
        if (status === 'approved') {
          try {
            await supabase.rpc('increment_et_score', {
              user_id: user.id,
              delta: 100,
            } as any);
          } catch (scoreErr) {
            console.warn('Could not increment ET score for event post:', scoreErr);
          }
        }

        const successMessage =
          status === 'approved'
            ? 'Event posted live! (+100 ET Score earned)'
            : "Event submitted! It'll go live once approved.";

        Alert.alert('Success', successMessage, [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainTabs'),
          },
        ]);
      }
    } catch (err: any) {
      console.error('[CreateEvent] Error:', err);
      Alert.alert('Submission Error', err?.message || 'Could not submit event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingInitial) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Host an Event</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.guestContainer}>
          <View style={styles.guestIconCircle}>
            <UploadCloud size={36} color={theme.colors.brand} />
          </View>
          <Text style={styles.guestTitle}>Sign in to Post Events</Text>
          <Text style={styles.guestSubtitle}>
            Join India's curator community. Post events, earn ET score points, and climb the curator leaderboard.
          </Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.signInBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editId ? 'Edit Event' : 'Create New Event'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Registration Link Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registration / Ticket Link</Text>
          <View style={styles.inputWrapper}>
            <Link2 size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="https://luma.com/... or unstop.com/..."
              placeholderTextColor={theme.colors.textMuted}
              value={regLink}
              onChangeText={checkLink}
              autoCapitalize="none"
              keyboardType="url"
            />
            {isCheckingDomain && <ActivityIndicator size="small" color={theme.colors.brand} />}
          </View>

          {/* Domain Trust Feedback */}
          {!isAdmin && !isTrusted && regLink.length > 5 && !isCheckingDomain && (
            <View style={styles.trustWarningBox}>
              <AlertCircle size={15} color="#D97706" />
              <Text style={styles.trustWarningText}>
                Since this link is from an unverified domain, your event will require admin approval
                before going live.
              </Text>
            </View>
          )}

          {(isAdmin || isTrusted) && regLink.length > 5 && !isCheckingDomain && (
            <View style={styles.trustSuccessBox}>
              <CheckCircle2 size={15} color={theme.colors.success} />
              <Text style={styles.trustSuccessText}>
                {isAdmin ? 'Admin privilege: Auto-approved upon submit.' : 'Verified Partner Domain: Instantly auto-approved!'}
              </Text>
            </View>
          )}

          {duplicateError ? <Text style={styles.errorText}>{duplicateError}</Text> : null}
        </View>

        {/* Event Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Title *</Text>
          <TextInput
            style={styles.inputPlain}
            placeholder="e.g. AI Hackathon 2026"
            placeholderTextColor={theme.colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
            {CATEGORIES_LIST.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Goal / Interest Tags Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Goals & Topics (Select multiple)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
            {CAREER_GOALS.map((goal) => {
              const isSelected = goalTags.includes(goal);
              return (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalChip, isSelected && styles.goalChipActive]}
                  onPress={() => toggleGoalTag(goal)}
                >
                  <Sparkles size={12} color={isSelected ? '#FFFFFF' : '#6C47FF'} />
                  <Text style={[styles.goalChipText, isSelected && styles.goalChipTextActive]}>
                    {goal}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* College & Campus Event Section */}
        {(category === 'Campus' || category === 'College Fests' || category === 'Hackathons' || collegeId) && (
          <View style={styles.collegeCard}>
            <View style={styles.collegeHeaderRow}>
              <View style={styles.collegeIconCircle}>
                <GraduationCap size={18} color={theme.colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.collegeCardTitle}>College / Campus Event</Text>
                <Text style={styles.collegeCardSubtitle}>
                  Associate with a college and manage campus student visibility.
                </Text>
              </View>
            </View>

            {/* College Search / Select */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.subLabel}>College / Institute Name</Text>
              <TextInput
                style={styles.inputPlain}
                placeholder="Search college (e.g. IIT, BITS, CBIT...)"
                placeholderTextColor={theme.colors.textMuted}
                value={collegeName}
                onChangeText={(text) => {
                  setCollegeName(text);
                  setCollegeSearchQuery(text);
                  setShowCollegeDropdown(true);
                }}
                onFocus={() => setShowCollegeDropdown(true)}
              />

              {showCollegeDropdown && collegesList.length > 0 && (
                <View style={styles.collegeDropdown}>
                  {collegesList.map((col) => (
                    <TouchableOpacity
                      key={col.id}
                      style={styles.collegeDropdownItem}
                      onPress={() => {
                        setCollegeId(col.id);
                        setCollegeName(col.name);
                        setShowCollegeDropdown(false);
                      }}
                    >
                      <Building size={14} color={theme.colors.brand} />
                      <Text style={styles.collegeDropdownText} numberOfLines={1}>
                        {col.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Restrict to College Only Toggle */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>Restrict to my college only</Text>
                <Text style={styles.switchSubtitle}>
                  Only students registered with this college can view this event.
                </Text>
              </View>
              <Switch
                value={collegeOnly}
                onValueChange={setCollegeOnly}
                trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              />
            </View>

            {/* Branch Tags */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.subLabel}>Target Branch / Department (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                {INDIAN_COLLEGE_BRANCHES.slice(0, 16).map((br) => {
                  const isSelected = collegeBranch === br;
                  return (
                    <TouchableOpacity
                      key={br}
                      style={[styles.smallChip, isSelected && styles.smallChipActive]}
                      onPress={() => setCollegeBranch(isSelected ? '' : br)}
                    >
                      <Text style={[styles.smallChipText, isSelected && styles.smallChipTextActive]}>
                        {br}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Date & Times */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Start Date *</Text>
          <View style={styles.inputWrapper}>
            <Calendar size={18} color={theme.colors.brand} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 24 Oct 2026"
              placeholderTextColor={theme.colors.textMuted}
              value={dateString}
              onChangeText={setDateString}
            />
          </View>
        </View>

        {/* End Date (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event End Date (Optional, for multi-day events)</Text>
          <View style={styles.inputWrapper}>
            <Calendar size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 26 Oct 2026"
              placeholderTextColor={theme.colors.textMuted}
              value={endDateString}
              onChangeText={setEndDateString}
            />
          </View>
        </View>

        {/* Registration Deadline */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registration Deadline (Optional)</Text>
          <View style={styles.inputWrapper}>
            <Hourglass size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 22 Oct 2026, 11:59 PM"
              placeholderTextColor={theme.colors.textMuted}
              value={registrationDeadline}
              onChangeText={setRegistrationDeadline}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput
              style={styles.inputPlain}
              placeholder="10:00 AM"
              placeholderTextColor={theme.colors.textMuted}
              value={startTime}
              onChangeText={setStartTime}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>End Time</Text>
            <TextInput
              style={styles.inputPlain}
              placeholder="5:00 PM"
              placeholderTextColor={theme.colors.textMuted}
              value={endTime}
              onChangeText={setEndTime}
            />
          </View>
        </View>

        {/* Mode: Virtual Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Virtual / Online Event</Text>
            <Text style={styles.toggleSubtitle}>Event takes place via Zoom/Meet/Discord</Text>
          </View>
          <Switch
            value={isVirtual}
            onValueChange={setIsVirtual}
            trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
          />
        </View>

        {/* City & Venue if in-person */}
        {!isVirtual && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                {CITIES.map((c) => {
                  const isSelected = city === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setCity(c)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Venue Address / Campus</Text>
              <TextInput
                style={styles.inputPlain}
                placeholder="e.g. Auditorium Hall, IIT Madras"
                placeholderTextColor={theme.colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </>
        )}

        {/* Free vs Paid Pricing */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ticket Pricing</Text>
          <View style={styles.pricingRow}>
            <TouchableOpacity
              style={[styles.pricingOption, isFree && styles.pricingOptionActive]}
              onPress={() => setIsFree(true)}
            >
              <Text style={[styles.pricingText, isFree && styles.pricingTextActive]}>Free Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pricingOption, !isFree && styles.pricingOptionActive]}
              onPress={() => setIsFree(false)}
            >
              <Text style={[styles.pricingText, !isFree && styles.pricingTextActive]}>Paid Event</Text>
            </TouchableOpacity>
          </View>

          {!isFree && (
            <View style={[styles.inputWrapper, { marginTop: 10 }]}>
              <IndianRupee size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Ticket Price (e.g. 499)"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>
          )}
        </View>

        {/* Poster Image Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Poster Image</Text>
          {posterUri ? (
            <View style={styles.posterPreviewContainer}>
              <Image source={{ uri: posterUri }} style={styles.posterPreview} contentFit="cover" />
              <TouchableOpacity style={styles.changePosterBtn} onPress={pickImage}>
                <Text style={styles.changePosterText}>Change Poster</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadArea} onPress={pickImage}>
              <UploadCloud size={32} color={theme.colors.brand} />
              <Text style={styles.uploadTitle}>Choose Poster from Gallery</Text>
              <Text style={styles.uploadSubtitle}>16:9 or 4:3 high-res recommended</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Organizer Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Organizer / Club Name</Text>
          <TextInput
            style={styles.inputPlain}
            placeholder="e.g. GDG / IEEE / Startups Club"
            placeholderTextColor={theme.colors.textMuted}
            value={organizerName}
            onChangeText={setOrganizerName}
          />
        </View>

        {/* Website Link */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website (Optional)</Text>
          <TextInput
            style={styles.inputPlain}
            placeholder="https://eventwebsite.com"
            placeholderTextColor={theme.colors.textMuted}
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.inputPlain, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Describe what attendees will experience, schedule, eligibility..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Prizes / Rewards */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prizes / Certificates (Optional)</Text>
          <TextInput
            style={styles.inputPlain}
            placeholder="e.g. ₹50,000 Cash Pool + Certificates"
            placeholderTextColor={theme.colors.textMuted}
            value={prizes}
            onChangeText={setPrizes}
          />
        </View>

        {/* Team Size */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Team Size</Text>
          <TextInput
            style={styles.inputPlain}
            placeholder="e.g. Solo / 2-4 Members / Unlimited"
            placeholderTextColor={theme.colors.textMuted}
            value={teamSize}
            onChangeText={setTeamSize}
          />
        </View>

        {/* Admin Feature Toggle */}
        {isAdmin && (
          <View style={styles.adminFeatureCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminFeatureTitle}>Feature this Event</Text>
              <Text style={styles.adminFeatureSubtitle}>
                Displays on the featured carousel & highlights on home feed.
              </Text>
            </View>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
              trackColor={{ false: theme.colors.border, true: '#F59E0B' }}
            />
          </View>
        )}

        {/* Submit Action Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {editId
                ? 'Update Event'
                : isAdmin || isTrusted
                ? 'Publish Instantly'
                : 'Submit for Approval'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  inputPlain: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  row: {
    flexDirection: 'row',
  },
  horizontalChips: {
    flexDirection: 'row',
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  goalChipActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C47FF',
  },
  goalChipTextActive: {
    color: '#FFFFFF',
  },
  smallChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
  },
  smallChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  smallChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  smallChipTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pricingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pricingOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  pricingOptionActive: {
    borderColor: theme.colors.brand,
    backgroundColor: '#EEF2FF',
  },
  pricingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  pricingTextActive: {
    color: theme.colors.brand,
  },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  posterPreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  posterPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  changePosterBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  changePosterText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  collegeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  collegeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collegeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collegeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  collegeCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  collegeDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  collegeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  collegeDropdownText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  adminFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
  },
  adminFeatureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  adminFeatureSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  trustWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  trustWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#B45309',
    fontWeight: '500',
  },
  trustSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  trustSuccessText: {
    flex: 1,
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 6,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: theme.colors.brand,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: theme.colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  guestIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  signInBtn: {
    backgroundColor: theme.colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  signInBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
