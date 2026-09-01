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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, ArrowRight, ArrowLeft, MapPin, Building, GraduationCap, Compass } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CITIES } from '../lib/constants/cities';
import { CATEGORIES_LIST, getCategoryMeta } from '../lib/category-config';
import { INDIAN_COLLEGE_BRANCHES } from '../lib/constants/branches';
import type { CollegeRow } from '../types';

export default function OnboardingScreen() {
  const { user, profile, isAdmin, refreshProfile } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Identity & Academic
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [userType, setUserType] = useState<'student' | 'professional'>((profile?.user_type as any) || 'student');
  const [college, setCollege] = useState(profile?.college || '');
  const [collegeId, setCollegeId] = useState<string | null>(profile?.college_id || null);
  const [branch, setBranch] = useState(profile?.branch || 'CSE');
  const [graduationYear, setGraduationYear] = useState(profile?.graduation_year || '2026');

  // College search
  const [collegeSearch, setCollegeSearch] = useState(profile?.college || '');
  const [collegesList, setCollegesList] = useState<CollegeRow[]>([]);
  const [isSearchingColleges, setIsSearchingColleges] = useState(false);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);

  // Step 2: Preferred Cities (Max 3 for non-admin, unlimited for admin)
  const [preferredCities, setPreferredCities] = useState<string[]>(profile?.preferred_cities || []);

  // Step 3: Categories / Goals (Max 6 for non-admin, unlimited for admin)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(profile?.goals || []);

  // Search colleges when query changes
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
    }, 300);
    return () => clearTimeout(timeout);
  }, [collegeSearch]);

  const toggleCity = (cityName: string) => {
    if (preferredCities.includes(cityName)) {
      setPreferredCities(preferredCities.filter((c) => c !== cityName));
    } else {
      if (!isAdmin && preferredCities.length >= 3) {
        Alert.alert('City Limit Reached', 'Non-admin users can select up to 3 preferred cities.');
        return;
      }
      setPreferredCities([...preferredCities, cityName]);
    }
  };

  const toggleCategory = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== catName));
    } else {
      if (!isAdmin && selectedCategories.length >= 6) {
        Alert.alert('Category Limit Reached', 'Non-admin users can select up to 6 categories.');
        return;
      }
      setSelectedCategories([...selectedCategories, catName]);
    }
  };

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

  const handleNextStep = async () => {
    if (step === 1) {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername) {
        Alert.alert('Required', 'Please choose a username.');
        return;
      }
      if (cleanUsername.length < 3) {
        Alert.alert('Invalid Username', 'Username must be at least 3 characters.');
        return;
      }

      // Check username uniqueness if changed
      if (cleanUsername !== profile?.username) {
        setIsSaving(true);
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .maybeSingle();
        setIsSaving(false);

        if (existingUser && existingUser.id !== user?.id) {
          Alert.alert('Username Taken', 'This username is already taken. Please choose another.');
          return;
        }
      }
      setStep(2);
    } else if (step === 2) {
      if (preferredCities.length === 0) {
        Alert.alert('Select Cities', 'Please select at least 1 city to get relevant event recommendations.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (selectedCategories.length === 0) {
        Alert.alert('Select Categories', 'Please select at least 1 event category you are interested in.');
        return;
      }
      await handleCompleteOnboarding();
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const payload = {
        full_name: fullName.trim() || null,
        username: cleanUsername,
        user_type: userType,
        college: userType === 'student' ? college || null : null,
        college_id: userType === 'student' ? collegeId || null : null,
        branch: userType === 'student' ? branch || null : null,
        graduation_year: userType === 'student' ? graduationYear || null : null,
        preferred_cities: preferredCities,
        goals: selectedCategories,
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);

      if (error) throw error;

      // Award +50 ET Score for completing profile onboarding
      try {
        await supabase.rpc('increment_et_score', {
          user_id: user.id,
          delta: 50,
        } as any);
      } catch (scoreErr) {
        console.warn('Could not increment ET score:', scoreErr);
      }

      await refreshProfile();
    } catch (err: any) {
      console.error('[Onboarding] Error:', err);
      Alert.alert('Onboarding Failed', err?.message || 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Top Bar */}
      <View style={styles.header}>
        <View style={styles.progressRow}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressBar,
                step >= s && styles.progressBarActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.headerTitles}>
          <Text style={styles.stepBadge}>Step {step} of 3</Text>
          <Text style={styles.title}>
            {step === 1 && 'Complete Your Profile'}
            {step === 2 && 'Pick Preferred Cities'}
            {step === 3 && 'Choose Your Interests'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1 && 'Personalize how you appear and discover relevant campus events.'}
            {step === 2 && (isAdmin ? 'Unlimited city selection (Admin mode).' : 'Choose up to 3 cities for curated events.')}
            {step === 3 && (isAdmin ? 'Unlimited categories (Admin mode).' : 'Select up to 6 event categories you love.')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: Basic & Academic Profile */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Alex Kumar"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. alex_curator"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Lowercase letters, numbers, and underscores only.</Text>
            </View>

            {/* User Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>I am a...</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[styles.typeOption, userType === 'student' && styles.typeOptionActive]}
                  onPress={() => setUserType('student')}
                >
                  <GraduationCap size={18} color={userType === 'student' ? '#FFF' : theme.colors.textPrimary} />
                  <Text style={[styles.typeOptionText, userType === 'student' && styles.typeOptionTextActive]}>
                    College Student
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeOption, userType === 'professional' && styles.typeOptionActive]}
                  onPress={() => setUserType('professional')}
                >
                  <Building size={18} color={userType === 'professional' ? '#FFF' : theme.colors.textPrimary} />
                  <Text style={[styles.typeOptionText, userType === 'professional' && styles.typeOptionTextActive]}>
                    Working Professional
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Student-specific fields */}
            {userType === 'student' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>College / University</Text>
                  <TextInput
                    style={styles.input}
                    value={collegeSearch}
                    onChangeText={(t) => {
                      setCollegeSearch(t);
                      setCollege(t);
                      setShowCollegeDropdown(true);
                    }}
                    onFocus={() => setShowCollegeDropdown(true)}
                    placeholder="Search or enter your college name..."
                    placeholderTextColor={theme.colors.textMuted}
                  />

                  {showCollegeDropdown && (
                    <View style={styles.dropdown}>
                      {isSearchingColleges ? (
                        <ActivityIndicator style={{ padding: 12 }} color={theme.colors.brand} />
                      ) : (
                        <>
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
                              <Text style={styles.dropdownItemText}>{col.name}</Text>
                            </TouchableOpacity>
                          ))}
                          {collegeSearch.trim().length > 2 && (
                            <TouchableOpacity
                              style={styles.dropdownAddBtn}
                              onPress={() => handleCreateCollege(collegeSearch)}
                            >
                              <Text style={styles.dropdownAddText}>+ Add "{collegeSearch}"</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                    <Text style={styles.label}>Branch</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                      {INDIAN_COLLEGE_BRANCHES.slice(0, 15).map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.smallChip, branch === b && styles.smallChipActive]}
                          onPress={() => setBranch(b)}
                        >
                          <Text style={[styles.smallChipText, branch === b && styles.smallChipTextActive]}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Grad Year</Text>
                    <TextInput
                      style={styles.input}
                      value={graduationYear}
                      onChangeText={setGraduationYear}
                      keyboardType="numeric"
                      maxLength={4}
                      placeholder="2026"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* STEP 2: Preferred Cities */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.countBadgeRow}>
              <MapPin size={16} color={theme.colors.brand} />
              <Text style={styles.countBadgeText}>
                Selected: {preferredCities.length} {isAdmin ? '(Unlimited)' : '/ 3 Max'}
              </Text>
            </View>

            <View style={styles.chipGrid}>
              {CITIES.map((city) => {
                const isSelected = preferredCities.includes(city);
                return (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityChip, isSelected && styles.cityChipActive]}
                    onPress={() => toggleCity(city)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>
                      {city}
                    </Text>
                    {isSelected && <CheckCircle2 size={14} color="#FFF" style={{ marginLeft: 4 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 3: Categories & Interests */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.countBadgeRow}>
              <Text style={styles.countBadgeText}>
                Selected: {selectedCategories.length} {isAdmin ? '(Unlimited)' : '/ 6 Max'}
              </Text>
            </View>

            <View style={styles.chipGrid}>
              {CATEGORIES_LIST.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                const meta = getCategoryMeta(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      isSelected && { backgroundColor: meta.accentColor, borderColor: meta.accentColor },
                    ]}
                    onPress={() => toggleCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                    {isSelected && <CheckCircle2 size={14} color="#FFF" style={{ marginLeft: 4 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep((s) => (s - 1) as any)}
            disabled={isSaving}
          >
            <ArrowLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, isSaving && styles.nextBtnDisabled]}
          onPress={handleNextStep}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.nextBtnContent}>
              <Text style={styles.nextBtnText}>
                {step === 3 ? 'Start Discovering' : 'Continue'}
              </Text>
              <ArrowRight size={18} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderLight,
  },
  progressBarActive: {
    backgroundColor: theme.colors.brand,
  },
  headerTitles: {},
  stepBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  stepContainer: {},
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  typeOptionTextActive: {
    color: '#FFF',
  },
  dropdown: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
    maxHeight: 180,
    ...theme.shadows.sm,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dropdownItemText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  dropdownAddBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.brandLight,
  },
  dropdownAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  row: {
    flexDirection: 'row',
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  smallChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  smallChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  smallChipTextActive: {
    color: '#FFF',
  },
  countBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brandLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: 6,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cityChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  cityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cityChipTextActive: {
    color: '#FFF',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.brand,
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
