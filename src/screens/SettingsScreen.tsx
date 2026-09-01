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
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, CheckCircle2, Save, MapPin, User, Building, GraduationCap, Lock } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CITIES } from '../lib/constants/cities';
import { CATEGORIES_LIST, getCategoryMeta } from '../lib/category-config';
import { INDIAN_COLLEGE_BRANCHES } from '../lib/constants/branches';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, profile, isAdmin, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [userType, setUserType] = useState<'student' | 'professional'>((profile?.user_type as any) || 'student');
  const [college, setCollege] = useState(profile?.college || '');
  const [branch, setBranch] = useState(profile?.branch || 'CSE');
  const [graduationYear, setGraduationYear] = useState(profile?.graduation_year || '2026');

  const [preferredCities, setPreferredCities] = useState<string[]>(profile?.preferred_cities || []);
  const [goals, setGoals] = useState<string[]>(profile?.goals || []);
  const [isSaving, setIsSaving] = useState(false);

  const toggleCity = (city: string) => {
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

  const handleSave = async () => {
    if (!user) return;
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      Alert.alert('Validation Error', 'Username is required.');
      return;
    }

    setIsSaving(true);
    try {
      // Check username uniqueness if changed
      if (cleanUsername !== profile?.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (existing && existing.id !== user.id) {
          Alert.alert('Username Taken', 'This username is already in use by another curator.');
          setIsSaving(false);
          return;
        }
      }

      const payload = {
        full_name: fullName.trim() || null,
        username: cleanUsername,
        user_type: userType,
        college: userType === 'student' ? college.trim() || null : null,
        branch: userType === 'student' ? branch : null,
        graduation_year: userType === 'student' ? graduationYear : null,
        preferred_cities: preferredCities.slice(0, 3),
        goals: goals.slice(0, 6),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) throw error;

      await refreshProfile();
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
              // Delete personal relational data
              await Promise.all([
                supabase.from('saved_events').delete().eq('user_id', user.id),
                supabase.from('interested_events').delete().eq('user_id', user.id),
                supabase.from('profiles').delete().eq('id', user.id),
              ]);

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
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Academic / Occupation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Occupation & Education</Text>

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
              <View style={styles.inputGroup}>
                <Text style={styles.label}>College Name</Text>
                <TextInput
                  style={styles.input}
                  value={college}
                  onChangeText={setCollege}
                  placeholder="e.g. IIT Hyderabad"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Graduation Year</Text>
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
            </>
          )}
        </View>

        {/* Preferred Cities */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Preferred Cities</Text>
            <Text style={styles.limitBadge}>
              {preferredCities.length} {isAdmin ? '(Unlimited)' : '/ 3 Max'}
            </Text>
          </View>

          <View style={styles.chipGrid}>
            {CITIES.map((c) => {
              const isSelected = preferredCities.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => toggleCity(c)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{c}</Text>
                  {isSelected && <CheckCircle2 size={13} color="#FFF" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category Interests */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Category Interests</Text>
            <Text style={styles.limitBadge}>
              {goals.length} {isAdmin ? '(Unlimited)' : '/ 6 Max'}
            </Text>
          </View>

          <View style={styles.chipGrid}>
            {CATEGORIES_LIST.map((cat) => {
              const isSelected = goals.includes(cat);
              const meta = getCategoryMeta(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: meta.accentColor, borderColor: meta.accentColor },
                  ]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cat}</Text>
                  {isSelected && <CheckCircle2 size={13} color="#FFF" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              );
            })}
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
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  saveHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveHeaderText: {
    fontSize: 15,
    fontWeight: '800',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  missingBannerList: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    marginTop: 4,
    lineHeight: 18,
  },
  limitBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brand,
    backgroundColor: theme.colors.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
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
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  smallChipTextActive: {
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
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700',
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
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  legalArrow: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  deleteAccountBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 16,
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger,
  },
});
