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
  Switch,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Trophy,
  Globe,
  Users,
  Check,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CATEGORIES_LIST } from '../lib/category-config';
import { CITIES } from '../lib/constants/cities';
import { INDIAN_COLLEGE_BRANCHES } from '../lib/constants/branches';
import { CATEGORY_TEMPLATES, teamOptions } from '../lib/constants/event-options';
import { uploadEventPoster } from '../lib/storage';
import type { RootStackParamList } from '../types';

const COLLEGE_YEAR_OPTIONS = ['All Years', '1st Year', '2nd Year', '3rd Year', '4th Year'];

// Reusable Select Modal for Category and City Selection
function SelectPickerModal({
  visible,
  title,
  items,
  selectedItem,
  onSelect,
  onClose,
  searchPlaceholder = 'Search...',
}: {
  visible: boolean;
  title: string;
  items: readonly string[] | string[];
  selectedItem: string;
  onSelect: (item: string) => void;
  onClose: () => void;
  searchPlaceholder?: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.toLowerCase().includes(q));
  }, [items, searchQuery]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={modalStyles.modalContainer} activeOpacity={1} onPress={() => {}}>
          {/* Modal Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{title}</Text>
            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={modalStyles.searchWrapper}>
            <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={modalStyles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={modalStyles.listContent}
            renderItem={({ item }) => {
              const isSelected = item.toLowerCase() === selectedItem.toLowerCase();
              return (
                <TouchableOpacity
                  style={[modalStyles.itemRow, isSelected && modalStyles.itemRowActive]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[modalStyles.itemText, isSelected && modalStyles.itemTextActive]}>
                    {item}
                  </Text>
                  {isSelected && <Check size={18} color={theme.colors.brand} />}
                </TouchableOpacity>
              );
            }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function DatePickerModal({
  visible,
  title = 'Select Date',
  initialDateString,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title?: string;
  initialDateString?: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (initialDateString) {
      const parsed = new Date(initialDateString);
      if (!isNaN(parsed.getTime())) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
        setSelectedDay(parsed.getDate());
      }
    }
  }, [initialDateString, visible]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handlePickDay = (day: number) => {
    setSelectedDay(day);
    const formatted = `${day} ${MONTHS_SHORT[viewMonth]} ${viewYear}`;
    onSelect(formatted);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={modalStyles.calendarModalContainer} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{title}</Text>
            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={modalStyles.monthNavRow}>
            <TouchableOpacity style={modalStyles.monthNavBtn} onPress={prevMonth} activeOpacity={0.7}>
              <ChevronLeft size={20} color="#6C47FF" />
            </TouchableOpacity>
            <Text style={modalStyles.monthYearTitle}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity style={modalStyles.monthNavBtn} onPress={nextMonth} activeOpacity={0.7}>
              <ChevronRight size={20} color="#6C47FF" />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={modalStyles.dayHeaderRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={modalStyles.dayHeaderCell}>
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={modalStyles.calendarGrid}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <View key={`empty-${i}`} style={modalStyles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();
              const isSelected = selectedDay === day;
              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    modalStyles.dayCell,
                    isToday && modalStyles.todayCell,
                    isSelected && modalStyles.selectedDayCell,
                  ]}
                  onPress={() => handlePickDay(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      modalStyles.dayCellText,
                      isToday && modalStyles.todayCellText,
                      isSelected && modalStyles.selectedDayCellText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'] as const;

function TimePickerModal({
  visible,
  title = 'Select Time',
  currentTimeString,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title?: string;
  currentTimeString?: string;
  onSelect: (timeStr: string) => void;
  onClose: () => void;
}) {
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMin, setSelectedMin] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (currentTimeString) {
      const match = currentTimeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        setSelectedHour(match[1].padStart(2, '0'));
        setSelectedMin(match[2]);
        setSelectedPeriod(match[3].toUpperCase() as 'AM' | 'PM');
      }
    }
  }, [currentTimeString, visible]);

  const handleConfirm = () => {
    const timeStr = `${selectedHour}:${selectedMin} ${selectedPeriod}`;
    onSelect(timeStr);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={modalStyles.timeModalContainer} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{title}</Text>
            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Time Preview Banner */}
          <View style={modalStyles.timePreviewBanner}>
            <Text style={modalStyles.timePreviewText}>
              {selectedHour}:{selectedMin} {selectedPeriod}
            </Text>
          </View>

          {/* Hour Selector */}
          <Text style={modalStyles.timeSectionLabel}>Select Hour</Text>
          <View style={modalStyles.timeChipRow}>
            {HOURS.map((h) => (
              <TouchableOpacity
                key={h}
                style={[modalStyles.timeChip, selectedHour === h && modalStyles.timeChipActive]}
                onPress={() => setSelectedHour(h)}
              >
                <Text
                  style={[
                    modalStyles.timeChipText,
                    selectedHour === h && modalStyles.timeChipTextActive,
                  ]}
                >
                  {h}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Minute Selector */}
          <Text style={modalStyles.timeSectionLabel}>Select Minute</Text>
          <View style={modalStyles.timeChipRow}>
            {MINUTES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[modalStyles.timeChip, selectedMin === m && modalStyles.timeChipActive]}
                onPress={() => setSelectedMin(m)}
              >
                <Text
                  style={[
                    modalStyles.timeChipText,
                    selectedMin === m && modalStyles.timeChipTextActive,
                  ]}
                >
                  :{m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Period Selector (AM / PM) */}
          <Text style={modalStyles.timeSectionLabel}>Period</Text>
          <View style={modalStyles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[modalStyles.periodBtn, selectedPeriod === p && modalStyles.periodBtnActive]}
                onPress={() => setSelectedPeriod(p)}
              >
                <Text
                  style={[
                    modalStyles.periodBtnText,
                    selectedPeriod === p && modalStyles.periodBtnTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={modalStyles.confirmTimeBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={modalStyles.confirmTimeBtnText}>Set Time</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function CreateEventScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateEvent'>>();
  const { user, profile, isAdmin } = useAuth();

  const editId = route.params?.editId;
  const initialEvent = route.params?.event;

  // Step state: 0 = Mandatory Event Details, 1 = Featured & Advanced Setup
  const [step, setStep] = useState<0 | 1>(0);

  // Global Featured Setting from Supabase app_settings
  const [isFeaturedEnabledGlobally, setIsFeaturedEnabledGlobally] = useState<boolean>(false);

  // Form Fields - Step 0: Mandatory
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [regLink, setRegLink] = useState(initialEvent?.registration_link || '');
  const [category, setCategory] = useState<string>(initialEvent?.category || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [dateString, setDateString] = useState(initialEvent?.date_string || '');
  const [hasEndDate, setHasEndDate] = useState<boolean>(Boolean(initialEvent?.end_date_string));
  const [endDateString, setEndDateString] = useState(initialEvent?.end_date_string || '');
  const [startTime, setStartTime] = useState(initialEvent?.start_time || '');
  const [hasEndTime, setHasEndTime] = useState<boolean>(Boolean(initialEvent?.end_time));
  const [endTime, setEndTime] = useState(initialEvent?.end_time || '');

  // Location & City
  const [isVirtual, setIsVirtual] = useState<boolean>(Boolean(initialEvent?.is_virtual));
  const [city, setCity] = useState<string>(initialEvent?.city || '');
  const [location, setLocation] = useState(initialEvent?.location || '');

  // Pricing
  const [isFree, setIsFree] = useState<boolean>(initialEvent?.is_free !== false);
  const [price, setPrice] = useState(initialEvent?.price ? String(initialEvent.price) : '');

  // Admin Feature Toggle
  const [isFeatured, setIsFeatured] = useState<boolean>(Boolean(initialEvent?.is_featured));

  // College & Campus Section (Only visible for 'College Event' or 'College Fest')
  const [collegeOnly, setCollegeOnly] = useState(initialEvent?.college_only || false);
  const [collegeName, setCollegeName] = useState(initialEvent?.colleges?.name || profile?.college || '');
  const [collegeId, setCollegeId] = useState<string | null>(initialEvent?.college_id || profile?.college_id || null);
  const [collegeBranch, setCollegeBranch] = useState(initialEvent?.college_branch || 'All Branches');
  const [collegeYear, setCollegeYear] = useState(initialEvent?.college_year || 'All Years');
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('');
  const [collegesList, setCollegesList] = useState<any[]>([]);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [isSearchingColleges, setIsSearchingColleges] = useState(false);

  // Step 1 / Optional Advanced Fields
  const [posterUri, setPosterUri] = useState<string | null>(initialEvent?.poster_url || null);
  const [organizerName, setOrganizerName] = useState(initialEvent?.organizer_name || profile?.full_name || '');
  const [website, setWebsite] = useState(initialEvent?.website || '');
  const [prizes, setPrizes] = useState(initialEvent?.prizes || '');
  const [teamSize, setTeamSize] = useState(initialEvent?.team_size || 'Solo');
  const [registrationDeadline, setRegistrationDeadline] = useState(initialEvent?.registration_deadline || '');

  // Pickers Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Trust check & link extraction states
  const [isTrusted, setIsTrusted] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  const [extractionConfidence, setExtractionConfidence] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(Boolean(editId && !initialEvent));

  // Determine if selected category is a college category
  const isCollegeCategory = category === 'College Event' || category === 'College Fest';

  // Admin feature controls
  const isAdminFeatureEnabled = Boolean(isAdmin && isFeaturedEnabledGlobally);

  // Fetch app settings from Supabase
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('featured_enabled')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.featured_enabled !== undefined) {
          setIsFeaturedEnabledGlobally(Boolean(data.featured_enabled));
        }
      });
  }, []);

  // Search colleges when query changes
  useEffect(() => {
    const q = collegeSearchQuery.trim();
    if (q.length < 2) {
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

  // Load existing event data if editing
  useEffect(() => {
    if (!editId || initialEvent) return;

    (async () => {
      try {
        setIsLoadingInitial(true);
        const { data, error } = await supabase
          .from('events')
          .select('*, colleges(name)')
          .eq('id', editId)
          .single();

        if (error) throw error;
        if (data) {
          setTitle(data.title || '');
          setRegLink(data.registration_link || '');
          setCategory(data.category || CATEGORIES_LIST[0]);
          setDateString(data.date_string || '');
          setHasEndDate(Boolean(data.end_date_string));
          setEndDateString(data.end_date_string || '');
          setStartTime(data.start_time || '');
          setHasEndTime(Boolean(data.end_time));
          setEndTime(data.end_time || '');
          setIsVirtual(Boolean(data.is_virtual));
          setCity(data.city || CITIES[0]);
          setLocation(data.location || '');
          setIsFree(data.is_free !== false);
          setPrice(data.price ? String(data.price) : '');
          setOrganizerName(data.organizer_name || '');
          setWebsite(data.website || '');
          setDescription(data.description || '');
          setPrizes(data.prizes || '');
          setTeamSize(data.team_size || 'Solo');
          setRegistrationDeadline(data.registration_deadline || '');
          setPosterUri(data.poster_url || null);
          setIsFeatured(Boolean(data.is_featured));
          setCollegeOnly(Boolean(data.college_only));
          setCollegeName((data as any).colleges?.name || '');
          setCollegeId(data.college_id || null);
          setCollegeBranch(data.college_branch || 'All Branches');
          setCollegeYear(data.college_year || 'All Years');
          if (data.is_featured) {
            setStep(1);
          }
        }
      } catch (err) {
        console.error('Fetch edit event error:', err);
      } finally {
        setIsLoadingInitial(false);
      }
    })();
  }, [editId, initialEvent]);

  // Check link validity, partner domain, duplicate, and auto-extraction
  const checkLink = async (url: string) => {
    setRegLink(url);
    setDuplicateError('');
    setExtractionConfidence(0);
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

      // 2. Verified partner domain lookup
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

      // 3. Auto-extract event details from link
      if (!editId) {
        try {
          setIsExtracting(true);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const res = await fetch('https://eventime.thesurfboard.in/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url.trim() }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const extracted = await res.json();
            if (extracted.title && !title) setTitle(extracted.title);
            if (extracted.description && !description) setDescription(extracted.description);
            if (extracted.location && !location) setLocation(extracted.location);
            if (extracted.date && !dateString) {
              const parsed = new Date(extracted.date);
              if (!isNaN(parsed.getTime())) {
                const yyyy = parsed.getFullYear();
                const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                const dd = String(parsed.getDate()).padStart(2, '0');
                setDateString(`${yyyy}-${mm}-${dd}`);
              }
            }
            if (extracted.isTrusted !== undefined) setIsTrusted(Boolean(extracted.isTrusted));
            setExtractionConfidence(extracted.title ? 0.9 : 0.5);
          }
        } catch {
          // Extraction fallback to manual input
        } finally {
          setIsExtracting(false);
        }
      }
    } catch (e) {
      console.error('Domain check error:', e);
    } finally {
      setIsCheckingDomain(false);
    }
  };

  // 1:1 Square Poster Picker for Step 1
  const pickPoster = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera roll permissions are required to upload event posters.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Exactly matching 1:1 square ratio from website
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPosterUri(result.assets[0].uri);
    }
  };

  // Add or select custom college
  const handleSelectCollege = (col: { id: string; name: string }) => {
    setCollegeId(col.id);
    setCollegeName(col.name);
    setCollegeSearchQuery(col.name);
    setShowCollegeDropdown(false);
  };

  const handleAddCustomCollege = async () => {
    const trimmed = collegeSearchQuery.trim();
    if (!trimmed) return;
    try {
      const { data } = await supabase
        .from('colleges')
        .insert({ name: trimmed })
        .select('id, name')
        .single();
      if (data) {
        setCollegeId(data.id);
        setCollegeName(data.name);
        setCollegeSearchQuery(data.name);
      } else {
        setCollegeName(trimmed);
        setCollegeId(null);
      }
    } catch {
      setCollegeName(trimmed);
      setCollegeId(null);
    }
    setShowCollegeDropdown(false);
  };

  // Slug generator matching website
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

  // Validation logic matching website
  const isStep0Valid = Boolean(
    title.trim() &&
    description.trim() &&
    category.trim() &&
    dateString.trim() &&
    (isVirtual ? regLink.trim() : city.trim())
  );

  // Submit Handler
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
      Alert.alert('Date Required', 'Please enter an event date (e.g. 24 Oct 2026).');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Description Required', 'Please provide a brief event description.');
      return;
    }

    if (isVirtual && !regLink.trim()) {
      Alert.alert('Link Required', 'Registration link is required for virtual events.');
      return;
    }

    if (!isVirtual && !city.trim()) {
      Alert.alert('City Required', 'Please select a city for in-person events.');
      return;
    }

    if (isCollegeCategory && collegeOnly && !collegeId && !collegeName.trim()) {
      Alert.alert('College Required', "Please select your college before restricting this event to it, or turn off 'Restrict to my college only'.");
      return;
    }

    if (duplicateError) {
      Alert.alert('Duplicate Event', duplicateError);
      return;
    }

    // If on Step 1 for featured event, poster is required
    if (step === 1 && isFeatured && !posterUri) {
      Alert.alert('Poster Required', 'A 1:1 square poster is required for featured events.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalPosterUrl = posterUri;

      // Upload local file to Cloudflare R2 if selected
      if (posterUri && posterUri.startsWith('file://')) {
        finalPosterUrl = await uploadEventPoster(posterUri);
      }

      const effectiveCity = isVirtual ? 'online' : city;
      const effectiveLocation = isVirtual ? 'Virtual Event' : (location.trim() || city);
      const effectiveOrganizer = organizerName.trim() || profile?.full_name || user?.user_metadata?.full_name || 'Event Curator';
      const uniqueSlug = editId ? undefined : generateSlug(title, effectiveCity, dateString);
      const status = isAdmin || isTrusted ? 'approved' : 'pending';

      const payload: any = {
        title: title.trim(),
        category,
        date_string: dateString.trim(),
        end_date_string: hasEndDate && endDateString.trim() ? endDateString.trim() : null,
        registration_deadline: registrationDeadline.trim() || null,
        start_time: startTime.trim() || null,
        end_time: hasEndTime && endTime.trim() ? endTime.trim() : null,
        is_virtual: isVirtual,
        city: effectiveCity,
        location: effectiveLocation,
        is_free: isFree,
        price: !isFree && price ? parseFloat(price) : 0,
        organizer_name: effectiveOrganizer,
        registration_link: regLink.trim() || null,
        website: website.trim() || null,
        description: description.trim(),
        prizes: prizes.trim() || null,
        team_size: teamSize || 'Solo',
        poster_url: finalPosterUrl || null,
        is_featured: isAdmin && isFeatured,
        college_only: isCollegeCategory ? collegeOnly : false,
        college_id: isCollegeCategory ? collegeId : null,
        college_name: isCollegeCategory ? collegeName.trim() || null : null,
        college_branch: isCollegeCategory && collegeBranch !== 'All Branches' ? collegeBranch : null,
        branch_tags: isCollegeCategory && collegeBranch && collegeBranch !== 'All Branches' ? [collegeBranch] : null,
        college_year: isCollegeCategory && collegeYear !== 'All Years' ? collegeYear : null,
        target_audience: isCollegeCategory && collegeOnly ? ['College Students'] : ['Everyone'],
      };

      if (editId) {
        let updateQuery = supabase
          .from('events')
          .update(payload)
          .eq('id', editId);

        if (!isAdmin) {
          updateQuery = updateQuery.eq('creator_id', user.id);
        }

        const { error } = await updateQuery;
        if (error) throw error;

        // Auto-resolve reports
        try {
          await supabase
            .from('event_reports')
            .update({ status: 'resolved' })
            .eq('event_id', editId)
            .eq('status', 'pending');
        } catch {}

        Alert.alert('Success', 'Event updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        payload.slug = uniqueSlug;
        payload.creator_id = user.id;
        payload.status = status;

        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;

        // Award +100 ET points if approved live
        if (status === 'approved') {
          try {
            await supabase.rpc('increment_et_score', {
              user_id: user.id,
              delta: 100,
            } as any);
          } catch {}
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
      const isDuplicateLink = err?.code === '23505' && err?.message?.includes('unique_registration_link');
      Alert.alert(
        'Submission Error',
        isDuplicateLink
          ? 'This event link has already been posted by someone else.'
          : err?.message || 'Could not submit event. Please try again.'
      );
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
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === 1) {
              setStep(0);
            } else {
              navigation.goBack();
            }
          }}
        >
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {step === 0
              ? editId
                ? 'Edit Event'
                : 'Event Details'
              : 'Feature & Advanced Setup'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {step === 0 ? 'All essential details for your event' : 'Make your event stand out'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* =========================================================================
              STEP 0: MANDATORY EVENT DETAILS (Website Parity)
             ========================================================================= */}
          {step === 0 && (
            <>
              {/* 1. Registration Link (Website Parity) */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    Registration Link{' '}
                    {isVirtual ? (
                      <Text style={{ color: '#EF4444' }}>*</Text>
                    ) : (
                      <Text style={styles.optionalLabel}>(Optional)</Text>
                    )}
                  </Text>
                </View>

                <View style={styles.inputWrapper}>
                  <Link2 size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Paste event link (lu.ma, eventbrite, unstop, etc.)"
                    placeholderTextColor={theme.colors.textMuted}
                    value={regLink}
                    onChangeText={checkLink}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {isCheckingDomain || isExtracting ? (
                    <ActivityIndicator size="small" color={theme.colors.brand} />
                  ) : regLink.length > 5 && !duplicateError ? (
                    <CheckCircle2 size={18} color="#10B981" />
                  ) : null}
                </View>

                {/* Status Feedback Banners */}
                {isExtracting && (
                  <View style={styles.extractingBox}>
                    <ActivityIndicator size="small" color="#6C47FF" />
                    <Text style={styles.extractingText}>Auto-extracting event details from link...</Text>
                  </View>
                )}

                {duplicateError ? (
                  <View style={styles.errorAlertBox}>
                    <AlertCircle size={15} color="#EF4444" />
                    <Text style={styles.errorAlertText}>{duplicateError}</Text>
                  </View>
                ) : null}

                {extractionConfidence > 0 && !duplicateError && (
                  <View style={styles.confidenceBox}>
                    <CheckCircle2 size={15} color="#047857" />
                    <Text style={styles.confidenceText}>Details auto-filled from link. Review & continue.</Text>
                  </View>
                )}

                {!isAdmin && !isTrusted && regLink.length > 8 && !isCheckingDomain && !isExtracting && (
                  <View style={styles.trustWarningBox}>
                    <AlertCircle size={15} color="#D97706" />
                    <Text style={styles.trustWarningText}>
                      Since this link is from an unverified domain, your event will require admin approval before going live.
                    </Text>
                  </View>
                )}

                {(isAdmin || isTrusted) && regLink.length > 8 && !isCheckingDomain && !isExtracting && (
                  <View style={styles.trustSuccessBox}>
                    <CheckCircle2 size={15} color="#047857" />
                    <Text style={styles.trustSuccessText}>
                      {isAdmin ? 'Admin privilege: Auto-approved upon submit.' : 'Verified Partner Domain: Instantly auto-approved!'}
                    </Text>
                  </View>
                )}
              </View>

              {/* 2. Event Title * */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Event Title <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.inputPlain}
                  placeholder="e.g. AI Hackathon 2026"
                  placeholderTextColor={theme.colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* 3. Category Selector (Dropdown Style like Website) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Category <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() => setShowCategoryModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.selectTriggerLeft}>
                    <Text style={[styles.selectTriggerText, !category && styles.placeholderText]}>
                      {category || 'Select category'}
                    </Text>
                  </View>
                  <ChevronDown size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* 4. College / Campus Section (STRICTLY ONLY SHOWN FOR College Event & College Fest) */}
              {isCollegeCategory && (
                <View style={styles.collegeCard}>
                  <View style={styles.collegeHeaderRow}>
                    <View style={styles.collegeIconCircle}>
                      <GraduationCap size={18} color={theme.colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.collegeCardTitle}>College Event Details</Text>
                      <Text style={styles.collegeCardSubtitle}>
                        Restrict to your college or specify target branches.
                      </Text>
                    </View>
                  </View>

                  {/* Restrict to College Only Switch */}
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

                  {/* College Search / Selection */}
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.subLabel}>College / Institute Name</Text>
                    <TextInput
                      style={styles.inputPlain}
                      placeholder="Search college (e.g. CBIT, IIT, BITS...)"
                      placeholderTextColor={theme.colors.textMuted}
                      value={collegeSearchQuery || collegeName}
                      onChangeText={(txt) => {
                        setCollegeSearchQuery(txt);
                        setCollegeName(txt);
                        setShowCollegeDropdown(true);
                      }}
                      onFocus={() => setShowCollegeDropdown(true)}
                    />

                    {showCollegeDropdown && collegeSearchQuery.trim().length >= 2 && (
                      <View style={styles.collegeDropdown}>
                        {isSearchingColleges && (
                          <View style={{ padding: 12 }}>
                            <ActivityIndicator size="small" color={theme.colors.brand} />
                          </View>
                        )}
                        {!isSearchingColleges &&
                          collegesList.map((col) => (
                            <TouchableOpacity
                              key={col.id}
                              style={styles.collegeDropdownItem}
                              onPress={() => handleSelectCollege(col)}
                            >
                              <Building size={14} color={theme.colors.brand} />
                              <Text style={styles.collegeDropdownText} numberOfLines={1}>
                                {col.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        {!isSearchingColleges &&
                          !collegesList.some(
                            (c) => c.name.toLowerCase() === collegeSearchQuery.trim().toLowerCase()
                          ) && (
                            <TouchableOpacity
                              style={[styles.collegeDropdownItem, styles.addNewCollegeItem]}
                              onPress={handleAddCustomCollege}
                            >
                              <Plus size={14} color="#6C47FF" />
                              <Text style={styles.addNewCollegeText} numberOfLines={1}>
                                Use "{collegeSearchQuery.trim()}" as college
                              </Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    )}
                  </View>

                  {/* Branch & Year Selection */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subLabel}>Branch</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                        {['All Branches', 'CSE', 'ECE', 'IT', 'EEE', 'Mechanical', 'Civil'].map((b) => (
                          <TouchableOpacity
                            key={b}
                            style={[styles.smallChip, collegeBranch === b && styles.smallChipActive]}
                            onPress={() => setCollegeBranch(b)}
                          >
                            <Text style={[styles.smallChipText, collegeBranch === b && styles.smallChipTextActive]}>
                              {b}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.subLabel}>Year</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                        {COLLEGE_YEAR_OPTIONS.map((yr) => (
                          <TouchableOpacity
                            key={yr}
                            style={[styles.smallChip, collegeYear === yr && styles.smallChipActive]}
                            onPress={() => setCollegeYear(yr)}
                          >
                            <Text style={[styles.smallChipText, collegeYear === yr && styles.smallChipTextActive]}>
                              {yr}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </View>
              )}

              {/* 5. Description * */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Description <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.inputPlain, styles.descriptionInput]}
                  placeholder="What is this event about?"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* 6. Event Date & Time (Website Parity with + End Date / + End Time toggles) */}
              <View style={styles.sectionDivider}>
                {/* Event Date */}
                <View style={styles.inputGroup}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.label}>
                      Event Date <Text style={{ color: '#EF4444' }}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.toggleTextBtn}
                      onPress={() => setHasEndDate(!hasEndDate)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.toggleText, hasEndDate && styles.toggleTextActive]}>
                        {hasEndDate ? '— Remove End Date' : '+ End Date'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.pickerTriggerLeft}>
                      <Calendar
                        size={18}
                        color={dateString ? theme.colors.brand : theme.colors.textSecondary}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.pickerTriggerText, !dateString && styles.placeholderText]}>
                        {dateString || 'Select event date'}
                      </Text>
                    </View>
                    <ChevronDown size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Optional End Date */}
                {hasEndDate && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.subLabel}>Event End Date</Text>
                    <TouchableOpacity
                      style={styles.pickerTrigger}
                      onPress={() => setShowEndDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.pickerTriggerLeft}>
                        <Calendar
                          size={18}
                          color={endDateString ? theme.colors.brand : theme.colors.textSecondary}
                          style={{ marginRight: 10 }}
                        />
                        <Text style={[styles.pickerTriggerText, !endDateString && styles.placeholderText]}>
                          {endDateString || 'Select end date'}
                        </Text>
                      </View>
                      <ChevronDown size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Event Time */}
                <View style={styles.inputGroup}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.label}>Start Time (Optional)</Text>
                    <TouchableOpacity
                      style={styles.toggleTextBtn}
                      onPress={() => setHasEndTime(!hasEndTime)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.toggleText, hasEndTime && styles.toggleTextActive]}>
                        {hasEndTime ? '— Remove End Time' : '+ End Time'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setShowStartTimePicker(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.pickerTriggerLeft}>
                      <Clock
                        size={18}
                        color={startTime ? theme.colors.brand : theme.colors.textSecondary}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.pickerTriggerText, !startTime && styles.placeholderText]}>
                        {startTime || 'Select start time'}
                      </Text>
                    </View>
                    <ChevronDown size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Optional End Time */}
                {hasEndTime && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.subLabel}>End Time</Text>
                    <TouchableOpacity
                      style={styles.pickerTrigger}
                      onPress={() => setShowEndTimePicker(true)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.pickerTriggerLeft}>
                        <Clock
                          size={18}
                          color={endTime ? theme.colors.brand : theme.colors.textSecondary}
                          style={{ marginRight: 10 }}
                        />
                        <Text style={[styles.pickerTriggerText, !endTime && styles.placeholderText]}>
                          {endTime || 'Select end time'}
                        </Text>
                      </View>
                      <ChevronDown size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* 7. Location & Mode (Website Parity with Virtual Switch & City Dropdown) */}
              <View style={styles.sectionDivider}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.label}>
                    Event Location <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.modePill, isVirtual && styles.modePillActive]}
                    onPress={() => setIsVirtual(!isVirtual)}
                    activeOpacity={0.7}
                  >
                    <Video size={14} color={isVirtual ? '#6C47FF' : '#64748B'} />
                    <Text style={[styles.modePillText, isVirtual && styles.modePillTextActive]}>
                      {isVirtual ? 'Virtual Event' : 'Switch to Virtual'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isVirtual ? (
                  <View style={styles.virtualCard}>
                    <Video size={20} color={theme.colors.brand} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.virtualCardTitle}>Online / Virtual Event</Text>
                      <Text style={styles.virtualCardSubtitle}>
                        Event happens on Zoom, Google Meet, or Discord.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    {/* City Selector Dropdown (Website Parity) */}
                    <TouchableOpacity
                      style={styles.selectTrigger}
                      onPress={() => setShowCityModal(true)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.selectTriggerLeft}>
                        <MapPin size={16} color={city ? theme.colors.brand : '#94A3B8'} style={{ marginRight: 10 }} />
                        <Text style={[styles.selectTriggerText, !city && styles.placeholderText]}>
                          {city || 'Select Location'}
                        </Text>
                      </View>
                      <ChevronDown size={18} color="#64748B" />
                    </TouchableOpacity>

                    {/* Venue Address (Optional) */}
                    <View style={{ marginTop: 10 }}>
                      <TextInput
                        style={styles.inputPlain}
                        placeholder="Venue Address / Campus Landmark (Optional)"
                        placeholderTextColor={theme.colors.textMuted}
                        value={location}
                        onChangeText={setLocation}
                      />
                    </View>
                  </>
                )}
              </View>

              {/* 8. Pricing (Free vs Paid Pills) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pricing</Text>
                <View style={styles.pricingRow}>
                  <TouchableOpacity
                    style={[styles.pricingOption, isFree && styles.pricingOptionActive]}
                    onPress={() => {
                      setIsFree(true);
                      setPrice('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pricingText, isFree && styles.pricingTextActive]}>
                      Free Event
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pricingOption, !isFree && styles.pricingOptionActive]}
                    onPress={() => setIsFree(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pricingText, !isFree && styles.pricingTextActive]}>
                      Paid Event
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Price Input (Visible when Paid) */}
                {!isFree && (
                  <View style={[styles.inputWrapper, { marginTop: 10 }]}>
                    <IndianRupee size={18} color={theme.colors.brand} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ticket Price (e.g. 199)"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                      value={price}
                      onChangeText={setPrice}
                    />
                  </View>
                )}
              </View>

              {/* 9. Admin Feature Toggle (ONLY Visible to Admins when enabled globally) */}
              {isAdminFeatureEnabled && (
                <View style={styles.adminFeatureCard}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.adminFeatureTitle}>Feature this event</Text>
                    <Text style={styles.adminFeatureSubtitle}>
                      Add a 1:1 custom poster and showcase in top carousels.
                    </Text>
                  </View>
                  <Switch
                    value={isFeatured}
                    onValueChange={setIsFeatured}
                    trackColor={{ false: theme.colors.border, true: '#F59E0B' }}
                  />
                </View>
              )}

              {/* Bottom CTA for Step 0 */}
              <View style={styles.bottomCtaSection}>
                {isAdminFeatureEnabled && isFeatured ? (
                  <TouchableOpacity
                    style={[styles.submitBtn, !isStep0Valid && styles.submitBtnDisabled]}
                    onPress={() => setStep(1)}
                    disabled={!isStep0Valid}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>Continue to Next Step (Poster & Feature) →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      (!isStep0Valid || isSubmitting) && styles.submitBtnDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!isStep0Valid || isSubmitting}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.submitBtnText}>
                          {editId
                            ? 'Update Event'
                            : isAdmin || isTrusted
                            ? 'Post your event'
                            : 'Submit Event'}
                        </Text>
                        <CheckCircle2 size={18} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* =========================================================================
              STEP 1: FEATURED & ADVANCED SETUP (Admin Only when isFeatured is enabled)
             ========================================================================= */}
          {step === 1 && (
            <View style={{ flex: 1 }}>
              {/* Back to Step 0 */}
              <TouchableOpacity style={styles.stepBackBtn} onPress={() => setStep(0)}>
                <ArrowLeft size={16} color="#64748B" />
                <Text style={styles.stepBackText}>Back to Event Details</Text>
              </TouchableOpacity>

              {/* Featured Poster Upload (1:1 Ratio Required for Featured) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  1:1 Square Featured Poster <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>

                {posterUri ? (
                  <View style={styles.posterSquareContainer}>
                    <Image source={{ uri: posterUri }} style={styles.posterSquareImage} contentFit="cover" />
                    <TouchableOpacity style={styles.changePosterBtn} onPress={pickPoster}>
                      <Text style={styles.changePosterText}>Change 1:1 Poster</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadSquareArea} onPress={pickPoster} activeOpacity={0.8}>
                    <UploadCloud size={36} color={theme.colors.brand} />
                    <Text style={styles.uploadSquareTitle}>Upload 1:1 Square Poster</Text>
                    <Text style={styles.uploadSquareSubtitle}>Prominent placement in homescreen carousels</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Advanced Fields */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Organizer / Club Name</Text>
                <TextInput
                  style={styles.inputPlain}
                  placeholder="e.g. Google Developer Group"
                  placeholderTextColor={theme.colors.textMuted}
                  value={organizerName}
                  onChangeText={setOrganizerName}
                />
              </View>

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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Prizes / Rewards (Optional)</Text>
                <TextInput
                  style={styles.inputPlain}
                  placeholder="e.g. ₹1,00,000 Prize Pool"
                  placeholderTextColor={theme.colors.textMuted}
                  value={prizes}
                  onChangeText={setPrizes}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Team Size</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                  {teamOptions.map((opt) => {
                    const isSelected = teamSize === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setTeamSize(opt)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Registration Deadline (Optional)</Text>
                <TextInput
                  style={styles.inputPlain}
                  placeholder="e.g. 2026-10-22"
                  placeholderTextColor={theme.colors.textMuted}
                  value={registrationDeadline}
                  onChangeText={setRegistrationDeadline}
                />
              </View>

              {/* Step 1 Actions */}
              <View style={styles.step1ActionsRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(0)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { flex: 1 },
                    (!posterUri || isSubmitting) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!posterUri || isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.submitBtnText}>
                        {editId ? 'Update Featured Event' : 'Publish Featured Event'}
                      </Text>
                      <CheckCircle2 size={18} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selection Modal */}
      <SelectPickerModal
        visible={showCategoryModal}
        title="Select Category"
        items={CATEGORIES_LIST}
        selectedItem={category}
        onSelect={(cat) => {
          setCategory(cat);
          if (!description || Object.values(CATEGORY_TEMPLATES).includes(description)) {
            setDescription(CATEGORY_TEMPLATES[cat] || '');
          }
        }}
        onClose={() => setShowCategoryModal(false)}
        searchPlaceholder="Search categories..."
      />

      {/* City Selection Modal */}
      <SelectPickerModal
        visible={showCityModal}
        title="Select City"
        items={CITIES}
        selectedItem={city}
        onSelect={(c) => {
          setCity(c);
          if (!location || location === city) {
            setLocation(c);
          }
        }}
        onClose={() => setShowCityModal(false)}
        searchPlaceholder="Search Indian cities..."
      />

      {/* Event Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        title="Select Event Date"
        initialDateString={dateString}
        onSelect={setDateString}
        onClose={() => setShowDatePicker(false)}
      />

      {/* End Date Picker Modal */}
      <DatePickerModal
        visible={showEndDatePicker}
        title="Select End Date"
        initialDateString={endDateString}
        onSelect={setEndDateString}
        onClose={() => setShowEndDatePicker(false)}
      />

      {/* Start Time Picker Modal */}
      <TimePickerModal
        visible={showStartTimePicker}
        title="Select Start Time"
        currentTimeString={startTime}
        onSelect={setStartTime}
        onClose={() => setShowStartTimePicker(false)}
      />

      {/* End Time Picker Modal */}
      <TimePickerModal
        visible={showEndTimePicker}
        title="Select End Time"
        currentTimeString={endTime}
        onSelect={setEndTime}
        onClose={() => setShowEndTimePicker(false)}
      />
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 10,
  },
  itemRowActive: {
    backgroundColor: '#F5F3FF',
  },
  itemText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
    color: '#334155',
  },
  itemTextActive: {
    fontFamily: 'Switzer-Bold',
    color: theme.colors.brand,
  },
  // Calendar Modal Styles
  calendarModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dayHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#94A3B8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#6C47FF',
  },
  selectedDayCell: {
    backgroundColor: '#6C47FF',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  dayCellText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
    color: '#1E293B',
  },
  todayCellText: {
    fontFamily: 'Switzer-Bold',
    color: '#6C47FF',
  },
  selectedDayCellText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
  },

  // Time Modal Styles
  timeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  timePreviewBanner: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  timePreviewText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    color: '#6C47FF',
    letterSpacing: 1,
  },
  timeSectionLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  timeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 42,
    alignItems: 'center',
  },
  timeChipActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  timeChipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#334155',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 12,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  periodBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#475569',
  },
  periodBtnTextActive: {
    color: '#FFFFFF',
  },
  confirmTimeBtn: {
    marginTop: 18,
    backgroundColor: '#6C47FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmTimeBtnText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
    fontSize: 15,
  },
});

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
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
  },
  optionalLabel: {
    fontFamily: 'Switzer-Medium',
    fontSize: 11,
    color: '#94A3B8',
  },
  subLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#475569',
    marginBottom: 5,
  },
  inputPlain: {
    fontFamily: 'Switzer-Regular',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  descriptionInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectTriggerText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#0F172A',
  },
  placeholderText: {
    fontFamily: 'Switzer-Medium',
    color: '#94A3B8',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pickerTriggerText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#0F172A',
  },
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toggleTextBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  toggleText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: theme.colors.brand,
  },
  toggleTextActive: {
    color: '#EF4444',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  modePillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  modePillText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: theme.colors.brand,
  },
  modePillTextActive: {
    color: '#FFFFFF',
  },
  virtualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  virtualCardTitle: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#0F172A',
  },
  virtualCardSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 11,
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
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  pricingOptionActive: {
    borderColor: theme.colors.brand,
    backgroundColor: '#F5F3FF',
  },
  pricingText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#64748B',
  },
  pricingTextActive: {
    color: theme.colors.brand,
  },
  collegeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
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
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collegeCardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#1E40AF',
  },
  collegeCardSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  switchTitle: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#1E3A8A',
  },
  switchSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
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
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#0F172A',
  },
  addNewCollegeItem: {
    backgroundColor: '#FAF8FF',
  },
  addNewCollegeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#6C47FF',
  },
  horizontalChips: {
    flexDirection: 'row',
    marginTop: 4,
  },
  smallChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
  },
  smallChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  smallChipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#1E40AF',
  },
  smallChipTextActive: {
    color: '#FFFFFF',
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  chipText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#475569',
  },
  chipTextActive: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
  },
  adminFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
  },
  adminFeatureTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#92400E',
  },
  adminFeatureSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  optionalSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginBottom: 16,
  },
  optionalToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  optionalToggleTitle: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#6C47FF',
  },
  optionalContent: {
    marginTop: 8,
  },
  bottomCtaSection: {
    marginTop: 8,
  },
  submitBtn: {
    backgroundColor: theme.colors.brand,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 14,
  },
  secondaryBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Switzer-Bold',
    color: '#475569',
    fontSize: 14,
  },
  stepBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  stepBackText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#64748B',
  },
  step1ActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  posterSquareContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  posterSquareImage: {
    width: '100%',
    height: '100%',
  },
  changePosterBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  changePosterText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 12,
  },
  uploadSquareArea: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  uploadSquareTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#0F172A',
    marginTop: 10,
  },
  uploadSquareSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  extractingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  extractingText: {
    fontFamily: 'Switzer-Medium',
    flex: 1,
    fontSize: 12,
    color: '#6C47FF',
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  errorAlertText: {
    fontFamily: 'Switzer-Medium',
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
  },
  confidenceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  confidenceText: {
    fontFamily: 'Switzer-Medium',
    flex: 1,
    fontSize: 12,
    color: '#047857',
  },
  trustWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  trustWarningText: {
    fontFamily: 'Switzer-Regular',
    flex: 1,
    fontSize: 12,
    color: '#B45309',
  },
  trustSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  trustSuccessText: {
    fontFamily: 'Switzer-Medium',
    flex: 1,
    fontSize: 12,
    color: '#047857',
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
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontFamily: 'Switzer-Regular',
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
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 15,
  },
});
