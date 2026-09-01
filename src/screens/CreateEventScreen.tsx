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
  Sparkles,
  AlertCircle,
  IndianRupee,
  Link2,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CATEGORIES_LIST } from '../lib/category-config';
import { CITIES } from '../lib/constants/cities';
import { uploadEventPoster } from '../lib/storage';
import type { RootStackParamList } from '../types';

export default function CreateEventScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateEvent'>>();
  const { user, profile, isAdmin } = useAuth();

  const editId = route.params?.editId;

  // Form Fields
  const [title, setTitle] = useState('');
  const [regLink, setRegLink] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES_LIST[0]);
  const [dateString, setDateString] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [city, setCity] = useState<string>(CITIES[0]);
  const [location, setLocation] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [organizerName, setOrganizerName] = useState(profile?.full_name || '');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [prizes, setPrizes] = useState('');
  const [teamSize, setTeamSize] = useState('Solo');
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);

  // Trust check state
  const [isTrusted, setIsTrusted] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(!!editId);

  // Load existing event data if in edit mode
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const { data, error } = await supabase.from('events').select('*').eq('id', editId).single();
        if (error) throw error;
        if (data) {
          setTitle(data.title);
          setRegLink(data.registration_link || '');
          setCategory(data.category);
          setDateString(data.date_string);
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
        }
      } catch (err) {
        console.error('Fetch edit event error:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    })();
  }, [editId]);

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

      const payload: any = {
        title: title.trim(),
        category,
        date_string: dateString.trim(),
        start_time: startTime.trim() || null,
        end_time: endTime.trim() || null,
        is_virtual: isVirtual,
        city: isVirtual ? null : city,
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
      };

      if (editId) {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editId)
          .eq('creator_id', user.id);
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

        const successMessage =
          status === 'approved'
            ? 'Event posted live!'
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
        {/* Registration Link Input (Smart autofill & verified domain check) */}
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

        {/* Date & Times */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date *</Text>
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

        {/* Admin Feature Toggle */}
        {isAdmin && (
          <View style={styles.adminFeatureCard}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="#B45309" />
                <Text style={styles.adminFeatureTitle}>Feature this Event</Text>
              </View>
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

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.submitBtnContent}>
              <Text style={styles.submitButtonText}>
                {editId ? 'Save Changes' : isTrusted || isAdmin ? 'Post Event Live' : 'Submit for Approval'}
              </Text>
              <CheckCircle2 size={18} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: 60,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  inputPlain: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  trustWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  trustWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  trustSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successBg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  trustSuccessText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '600',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  horizontalChips: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  pricingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pricingOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  pricingOptionActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandLight,
  },
  pricingText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  pricingTextActive: {
    color: theme.colors.brand,
  },
  uploadArea: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  uploadSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  posterPreviewContainer: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  posterPreview: {
    width: '100%',
    height: 180,
  },
  changePosterBtn: {
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
  },
  changePosterText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  adminFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: theme.spacing.xl,
    gap: 12,
  },
  adminFeatureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  adminFeatureSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: theme.colors.brand,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 10,
    ...theme.shadows.brand,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
