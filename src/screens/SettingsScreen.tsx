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
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, CheckCircle2, Save, MapPin, User, Building, GraduationCap, Lock, Bell, Sparkles, Search, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CITIES } from '../lib/constants/cities';
import { CATEGORIES_LIST, getCategoryMeta } from '../lib/category-config';
import { INDIAN_COLLEGE_BRANCHES } from '../lib/constants/branches';
import { SelectPickerModal } from '../components/SelectPickerModal';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../lib/notifications';
import { haptic } from '../lib/haptics';

const GRAD_YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

const POPULAR_BRANCHES = [
  'CSE',
  'IT',
  'AI & ML',
  'Data Science',
  'Cyber Security',
  'ECE',
  'EEE',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'AERO',
  'BIOTECH',
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, profile, isAdmin, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const isUsernameLocked = !isAdmin && Boolean(profile?.is_onboarded || profile?.username);
  const [userType, setUserType] = useState<'student' | 'professional'>((profile?.user_type as any) || 'student');
  const [college, setCollege] = useState(profile?.college || '');
  const [collegeId, setCollegeId] = useState<string | null>(profile?.college_id || null);
  const [collegeSearch, setCollegeSearch] = useState(profile?.college || '');
  const [collegesList, setCollegesList] = useState<Array<{ id: string; name: string }>>([]);
  const [isSearchingColleges, setIsSearchingColleges] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branch, setBranch] = useState(profile?.branch || 'CSE');
  const [branchSearch, setBranchSearch] = useState(profile?.branch || 'CSE');
  const [branchesList, setBranchesList] = useState<string[]>([]);
  const [graduationYear, setGraduationYear] = useState(profile?.graduation_year || '2026');

  const [preferredCities, setPreferredCities] = useState<string[]>(profile?.preferred_cities || []);
  const [goals, setGoals] = useState<string[]>(profile?.goals || []);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});

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
        console.warn('[SettingsScreen] Event counts load error:', err);
      }
    })();
  }, []);

  useEffect(() => {
    getNotificationPreferences(user?.id).then(setNotifPrefs);
  }, [user?.id]);

  const toggleNotifPref = (key: keyof NotificationPreferences) => {
    haptic.light();
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCity = (city: string) => {
    haptic.light();
    if (preferredCities.includes(city)) {
      setPreferredCities(preferredCities.filter((c) => c !== city));
    } else {
      if (!isAdmin && preferredCities.length >= 3) {
        Alert.alert('Limit Reached', 'Non-admin users can select up to 3 preferred cities.');
        return;
      }
      setPreferredCities([...preferredCities, city]);
    }
  };

  const toggleCategory = (cat: string) => {
    haptic.light();
    if (goals.includes(cat)) {
      setGoals(goals.filter((g) => g !== cat));
    } else {
      if (!isAdmin && goals.length >= 6) {
        Alert.alert('Limit Reached', 'Non-admin users can select up to 6 category interests.');
        return;
      }
      setGoals([...goals, cat]);
    }
  };

  const selectAllCities = () => {
    if (!isAdmin) return;
    if (preferredCities.length === CITIES.length) {
      setPreferredCities([]);
    } else {
      setPreferredCities([...CITIES]);
    }
  };

  const selectAllCategories = () => {
    if (!isAdmin) return;
    if (goals.length === CATEGORIES_LIST.length) {
      setGoals([]);
    } else {
      setGoals([...CATEGORIES_LIST]);
    }
  };

  useEffect(() => {
    if (userType !== 'student') return;
    const q = collegeSearch.trim();
    if (!q || (college && q === college)) {
      setCollegesList([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingColleges(true);
      try {
        const { data } = await supabase
          .from('colleges')
          .select('id, name')
          .ilike('name', `%${q}%`)
          .limit(10);
        if (data) {
          setCollegesList(data);
        }
      } catch (err) {
        console.error('[Settings] College search error:', err);
      } finally {
        setIsSearchingColleges(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [collegeSearch, userType, college]);

  const handleSelectCollege = (col: { id: string; name: string }) => {
    setCollege(col.name);
    setCollegeId(col.id);
    setCollegeSearch(col.name);
    setCollegesList([]);
  };

  const handleClearCollege = () => {
    setCollege('');
    setCollegeId(null);
    setCollegeSearch('');
    setCollegesList([]);
  };

  const handleBranchSearchChange = (t: string) => {
    setBranchSearch(t);
    setBranch(t);
    const q = t.trim().toLowerCase();
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

  const handleSave = async () => {
    if (!user) return;
    const cleanUsername = isUsernameLocked
      ? (profile?.username || username)
      : username.trim().toLowerCase();

    if (!cleanUsername) {
      Alert.alert('Validation Error', 'Username is required.');
      return;
    }
    if (!isUsernameLocked) {
      if (cleanUsername.length < 3) {
        Alert.alert('Validation Error', 'Username must be at least 3 characters.');
        return;
      }
      if (cleanUsername.length > 12) {
        Alert.alert('Validation Error', 'Username must be 12 characters or less.');
        return;
      }
      const USERNAME_REGEX = /^[a-z0-9_.-]{3,12}$/;
      if (!USERNAME_REGEX.test(cleanUsername)) {
        Alert.alert('Validation Error', 'Username can only contain letters, numbers, and . _ -');
        return;
      }
    }

    setIsSaving(true);
    try {
      // Check username uniqueness if changed and not locked
      if (!isUsernameLocked && cleanUsername !== profile?.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .neq('id', user.id)
          .maybeSingle();

        if (existing) {
          Alert.alert('Username Taken', 'This username is already taken. Please choose another.');
          setIsSaving(false);
          return;
        }
      }

      const payload = {
        full_name: fullName.trim() || null,
        username: cleanUsername,
        user_type: userType,
        college: userType === 'student' ? college.trim() || null : null,
        college_id: userType === 'student' ? collegeId : null,
        branch: userType === 'student' ? branch : null,
        graduation_year: userType === 'student' ? graduationYear : null,
        preferred_cities: isAdmin ? preferredCities : preferredCities.slice(0, 3),
        goals: isAdmin ? goals : goals.slice(0, 6),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) throw error;

      await saveNotificationPreferences(notifPrefs, user.id);

      await refreshProfile();
      haptic.success();
      Alert.alert('Success', 'Profile settings updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.error('[Settings] Save error:', err);
      Alert.alert('Error', err?.message || 'Could not save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Wipe Data?',
      'Under the DPDP Act 2023, your account and all associated profile preferences, saves, and event interests will be permanently deleted. This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              // 1. Unlink creator association on created events to prevent foreign key constraint violations
              await supabase.from('events').update({ creator_id: null } as any).eq('creator_id', user.id);

              // 2. Execute server-side delete_user RPC with fallback to relational deletion
              const { error: rpcErr } = await supabase.rpc('delete_user');
              if (rpcErr) {
                console.warn('[Settings] delete_user RPC fallback:', rpcErr.message);
                await Promise.all([
                  supabase.from('saved_events').delete().eq('user_id', user.id),
                  supabase.from('interested_events').delete().eq('user_id', user.id),
                  supabase.from('profiles').delete().eq('id', user.id),
                ]);
              }

              await supabase.auth.signOut();
              Alert.alert('Account Deleted', 'Your account data has been completely erased.');
              (navigation as any).navigate('MainTabs');
            } catch (delErr: any) {
              Alert.alert('Error', delErr?.message || 'Could not complete account deletion.');
            }
          },
        },
      ]
    );
  };

  const isStudentNow = userType === 'student';
  const missingItems: string[] = [];
  if (!profile?.avatar_url) missingItems.push("Profile photo");
  if (!username) missingItems.push("Username");
  if (preferredCities.length === 0) missingItems.push("Preferred cities");
  if (goals.length === 0) missingItems.push("Interest categories");
  if (isStudentNow && (!college || !graduationYear || !branch)) missingItems.push("College, graduation year & branch");

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.brand} />
          ) : (
            <Text style={styles.saveHeaderText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Missing Items Banner */}
        {missingItems.length > 0 && (
          <View style={styles.missingBanner}>
            <Lock size={16} color="#D97706" style={{ marginTop: 2 }} />
            <View style={styles.missingBannerTextContainer}>
              <Text style={styles.missingBannerTitle}>Still missing to reach 100%:</Text>
              <Text style={styles.missingBannerList}>{missingItems.join(" • ")}</Text>
            </View>
          </View>
        )}

        {/* Basic Identity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your Name"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Username</Text>
              {isUsernameLocked && (
                <View style={styles.lockedPill}>
                  <Lock size={10} color="#64748B" />
                  <Text style={styles.lockedPillText}>Permanent</Text>
                </View>
              )}
            </View>

            {isUsernameLocked ? (
              <View style={styles.lockedInputContainer}>
                <Text style={styles.lockedAtSymbol}>@</Text>
                <Text style={styles.lockedUsernameText}>{profile?.username || username}</Text>
                <Lock size={14} color="#94A3B8" />
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                placeholder="username"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                maxLength={12}
              />
            )}

            {isUsernameLocked ? (
              <Text style={styles.lockedHelperText}>
                Curator handles are permanent and cannot be modified.
              </Text>
            ) : (
              <Text style={styles.inputHelperText}>
                3–12 characters. Letters, numbers, underscores, and dashes only.
              </Text>
            )}
          </View>
        </View>

        {/* Academic / Occupation */}
        {/* Academic / Occupation -> "I am a..." */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I am a...</Text>

          <View style={styles.typeSelectorRow}>
            <TouchableOpacity
              style={[styles.typeOption, userType === 'student' && styles.typeOptionActive]}
              onPress={() => setUserType('student')}
            >
              <GraduationCap size={16} color={userType === 'student' ? '#FFF' : theme.colors.textPrimary} />
              <Text style={[styles.typeOptionText, userType === 'student' && styles.typeOptionTextActive]}>
                Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeOption, userType === 'professional' && styles.typeOptionActive]}
              onPress={() => setUserType('professional')}
            >
              <Building size={16} color={userType === 'professional' ? '#FFF' : theme.colors.textPrimary} />
              <Text style={[styles.typeOptionText, userType === 'professional' && styles.typeOptionTextActive]}>
                Professional
              </Text>
            </TouchableOpacity>
          </View>

          {userType === 'student' && (
            <>
              {/* College Search Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>College / University</Text>
                <View style={styles.searchBox}>
                  <Search size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.collegeSearchInput}
                    value={collegeSearch}
                    onChangeText={(t) => {
                      setCollegeSearch(t);
                      if (!t.trim()) {
                        setCollege('');
                        setCollegeId(null);
                      }
                    }}
                    placeholder="Search 52,000+ colleges across India..."
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  {isSearchingColleges && (
                    <ActivityIndicator size="small" color={theme.colors.brand} style={{ marginRight: 6 }} />
                  )}
                  {collegeSearch.length > 0 && !isSearchingColleges && (
                    <TouchableOpacity onPress={handleClearCollege} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* College Suggestions Dropdown */}
                {collegesList.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {collegesList.map((col) => (
                      <TouchableOpacity
                        key={col.id}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectCollege(col)}
                      >
                        <Text style={styles.suggestionText}>{col.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {Boolean(collegeId) && (
                  <View style={styles.verifiedCollegeBadge}>
                    <CheckCircle2 size={13} color="#059669" />
                    <Text style={styles.verifiedCollegeText}>Verified Campus Feed Connected</Text>
                  </View>
                )}
              </View>

              {/* Branch / Stream with Live Search & Autocomplete */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.label}>Branch / Stream</Text>
                  <TouchableOpacity onPress={() => setShowBranchModal(true)}>
                    <Text style={styles.browseAllText}>Directory (170+) ›</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchBox}>
                  <Search size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.collegeSearchInput}
                    value={branchSearch}
                    onChangeText={handleBranchSearchChange}
                    placeholder="Search 170+ branches (CSE, Mechanical, Biotech...)"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  {branchSearch.length > 0 && (
                    <TouchableOpacity onPress={handleClearBranch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Branch Suggestions Dropdown */}
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

                {/* Popular Quick-Select Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipsScroll, { marginTop: 8 }]}>
                  {POPULAR_BRANCHES.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.smallChip, branch === b && styles.smallChipActive]}
                      onPress={() => handleSelectBranch(b)}
                    >
                      <Text style={[styles.smallChipText, branch === b && styles.smallChipTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                  {branch && !POPULAR_BRANCHES.includes(branch) && (
                    <View style={[styles.smallChip, styles.smallChipActive]}>
                      <Text style={[styles.smallChipText, styles.smallChipTextActive]}>{branch}</Text>
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* Graduation Year */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Graduation Year</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {GRAD_YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.smallChip, graduationYear === y && styles.smallChipActive]}
                      onPress={() => setGraduationYear(y)}
                    >
                      <Text style={[styles.smallChipText, graduationYear === y && styles.smallChipTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}
        </View>

        {/* Preferred Cities */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionHeaderTop}>
              <Text style={styles.sectionTitle}>Preferred Cities</Text>
              <View style={styles.limitBadge}>
                <Text style={styles.limitBadgeText}>
                  {preferredCities.length} {isAdmin ? 'Unlocked' : '/ 3 Max'}
                </Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Select in order of preference. #1 is your Home City for leaderboards; #2 & #3 curate your feed.
            </Text>
            {isAdmin && (
              <View style={styles.adminControlsRow}>
                <Text style={styles.adminNoticeText}>Admin Access: All 32 Cities Unlocked</Text>
                <TouchableOpacity onPress={selectAllCities} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.adminSelectAllText}>
                    {preferredCities.length === CITIES.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.chipGrid}>
            {CITIES.map((c) => {
              const isSelected = preferredCities.includes(c);
              const priorityIndex = isSelected ? preferredCities.indexOf(c) + 1 : null;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => toggleCity(c)}
                >
                  {isSelected && priorityIndex !== null && (
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityBadgeText}>{priorityIndex}</Text>
                    </View>
                  )}
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category Interests */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionHeaderTop}>
              <Text style={styles.sectionTitle}>Category Interests</Text>
              <View style={styles.limitBadge}>
                <Text style={styles.limitBadgeText}>
                  {goals.length} {isAdmin ? 'Unlocked' : '/ 6 Max'}
                </Text>
              </View>
            </View>
            {isAdmin && (
              <View style={styles.adminControlsRow}>
                <Text style={styles.adminNoticeText}>Admin Access: All 36 Categories Unlocked</Text>
                <TouchableOpacity onPress={selectAllCategories} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.adminSelectAllText}>
                    {goals.length === CATEGORIES_LIST.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.chipGrid}>
            {CATEGORIES_LIST.map((cat) => {
              const isSelected = goals.includes(cat);
              const meta = getCategoryMeta(cat);
              const count = categoryCounts[cat] || 0;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: meta.accentColor, borderColor: meta.accentColor },
                  ]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {cat}
                    {count > 0 ? ` (${count})` : ''}
                  </Text>
                  {isSelected && <CheckCircle2 size={13} color="#FFF" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Push Notification Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Push Notifications</Text>
            <Bell size={18} color={theme.colors.brand} />
          </View>
          <Text style={styles.sectionSubtitle}>
            Configure what alerts you receive on this device.
          </Text>

          <View style={styles.notifRow}>
            <View style={styles.notifTextContainer}>
              <Text style={styles.notifTitle}>24h Event Reminders</Text>
              <Text style={styles.notifDescription}>Get reminded 24h before saved or attending events start.</Text>
            </View>
            <Switch
              value={notifPrefs.event_reminders}
              onValueChange={() => toggleNotifPref('event_reminders')}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.notifRow}>
            <View style={styles.notifTextContainer}>
              <Text style={styles.notifTitle}>Campus & College Alerts</Text>
              <Text style={styles.notifDescription}>Exclusive notices, hackathons & fests for your college.</Text>
            </View>
            <Switch
              value={notifPrefs.campus_alerts}
              onValueChange={() => toggleNotifPref('campus_alerts')}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor="#FFF"
            />
          </View>

          <View style={styles.notifRow}>
            <View style={styles.notifTextContainer}>
              <Text style={styles.notifTitle}>City & Local Updates</Text>
              <Text style={styles.notifDescription}>Alerts when new events drop in your preferred cities.</Text>
            </View>
            <Switch
              value={notifPrefs.city_updates}
              onValueChange={() => toggleNotifPref('city_updates')}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor="#FFF"
            />
          </View>

          <View style={[styles.notifRow, { borderBottomWidth: 0 }]}>
            <View style={styles.notifTextContainer}>
              <Text style={styles.notifTitle}>Weekly Digest</Text>
              <Text style={styles.notifDescription}>Top curated events delivered once every Friday morning.</Text>
            </View>
            <Switch
              value={notifPrefs.weekly_digest}
              onValueChange={() => toggleNotifPref('weekly_digest')}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Legal & Privacy Section (DPDP Act) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Legal</Text>

          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => (navigation as any).navigate('PrivacyPolicy')}
            activeOpacity={0.7}
          >
            <View style={styles.legalLeft}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.legalText}>Privacy Policy (DPDP Compliant)</Text>
            </View>
            <Text style={styles.legalArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => (navigation as any).navigate('Terms')}
            activeOpacity={0.7}
          >
            <View style={styles.legalLeft}>
              <Building size={16} color={theme.colors.brand} />
              <Text style={styles.legalText}>Terms of Service & Guidelines</Text>
            </View>
            <Text style={styles.legalArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.legalRow, { borderBottomWidth: 0 }]}
            onPress={() => (navigation as any).navigate('Onboarding')}
            activeOpacity={0.7}
          >
            <View style={styles.legalLeft}>
              <Sparkles size={16} color={theme.colors.brand} />
              <Text style={styles.legalText}>Replay Onboarding Tour</Text>
            </View>
            <Text style={styles.legalArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.bottomSaveBtn, isSaving && styles.bottomSaveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.bottomSaveBtnText}>Save Profile Preferences</Text>
          )}
        </TouchableOpacity>

        {/* Delete Account (DPDP Act Section 12 Right to Erasure) */}
        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteAccountText}>Delete Account & Wipe Data</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Branch Selection Modal */}
      <SelectPickerModal
        visible={showBranchModal}
        title="Select Branch / Stream"
        items={INDIAN_COLLEGE_BRANCHES}
        selectedItem={branch}
        onSelect={(b) => {
          setBranch(b);
          setShowBranchModal(false);
        }}
        onClose={() => setShowBranchModal(false)}
        searchPlaceholder="Search all 170+ college branches..."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  saveHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveHeaderText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: theme.colors.brand,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: 60,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionHeaderContainer: {
    marginBottom: 12,
  },
  sectionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  adminControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    flexWrap: 'wrap',
    gap: 6,
  },
  adminNoticeText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 11,
    color: theme.colors.brand,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  missingBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  missingBannerTextContainer: {
    flex: 1,
  },
  missingBannerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#B45309',
  },
  missingBannerList: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#D97706',
    marginTop: 4,
    lineHeight: 18,
  },
  limitBadge: {
    backgroundColor: theme.colors.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    flexShrink: 0,
  },
  limitBadgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: theme.colors.brand,
  },
  adminSelectAllText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: theme.colors.brand,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  inputGroup: {
    marginBottom: 14,
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
    color: theme.colors.textPrimary,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  lockedPillText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10.5,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  lockedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lockedAtSymbol: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#94A3B8',
    marginRight: 4,
  },
  lockedUsernameText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  lockedHelperText: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 5,
  },
  inputHelperText: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 5,
  },
  input: {
    fontFamily: 'Switzer-Regular',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
  },
  collegeSearchInput: {
    fontFamily: 'Switzer-Regular',
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  suggestionsBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  suggestionText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  verifiedCollegeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  verifiedCollegeText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#059669',
  },
  browseAllText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: theme.colors.brand,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  typeOptionText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  typeOptionTextActive: {
    color: '#FFF',
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  smallChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  smallChipText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  smallChipTextActive: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  priorityBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  priorityBadgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
    color: theme.colors.brand,
    lineHeight: 12,
  },
  chipText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: theme.colors.textPrimary,
  },
  chipTextActive: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
  },
  bottomSaveBtn: {
    backgroundColor: theme.colors.brand,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 8,
    ...theme.shadows.brand,
  },
  bottomSaveBtnDisabled: {
    opacity: 0.6,
  },
  bottomSaveBtnText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 15,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  legalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legalText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  legalArrow: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  sectionSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 12,
  },
  notifTextContainer: {
    flex: 1,
  },
  notifTitle: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 3,
  },
  notifDescription: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  deleteAccountBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 16,
  },
  deleteAccountText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: theme.colors.danger,
  },
});
