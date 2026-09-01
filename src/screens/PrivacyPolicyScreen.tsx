import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ShieldCheck, Lock, FileText, Mail, Trash2 } from 'lucide-react-native';
import { theme } from '../config/theme';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.badgeText}>DPDP Act 2023 Compliant</Text>
          </View>

          <Text style={styles.title}>Privacy & Data Protection Policy</Text>
          <Text style={styles.updatedDate}>Last updated: June 30, 2026</Text>

          <View style={styles.divider} />

          {/* Section 1 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>1. Information We Collect</Text>
            <Text style={styles.paragraph}>
              When you create an account on EvenTime, we collect your email address, username, preferred cities, and event category interests. If you choose a student profile, we also collect your college and graduation year to provide personalized campus fests and hackathon updates.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>2. Purpose of Data Processing</Text>
            <Text style={styles.paragraph}>
              In strict accordance with the Digital Personal Data Protection (DPDP) Act, your data is processed solely for specified, lawful purposes:
            </Text>
            <Text style={styles.bulletPoint}>• Customizing your "For You" and "Around You" event feeds.</Text>
            <Text style={styles.bulletPoint}>• Secure authentication via Supabase encrypted session tokens.</Text>
            <Text style={styles.bulletPoint}>• Calculating your ET Score and Curator Leaderboard achievements.</Text>
          </View>

          {/* Section 3 */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>3. Data Security & Storage</Text>
            <Text style={styles.paragraph}>
              We never sell, rent, or monetize your personal information to third-party data brokers or advertisers. All database transactions are protected with Supabase Row Level Security (RLS) policies and industry-standard SSL encryption.
            </Text>
          </View>

          {/* Section 4: Data Principal Rights */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>4. Your Rights as a Data Principal</Text>
            <Text style={styles.paragraph}>
              Under the DPDP Act 2023, you have the right to:
            </Text>
            <Text style={styles.bulletPoint}>• Access and summary of all your personal data stored on EvenTime.</Text>
            <Text style={styles.bulletPoint}>• Correction, completion, and updating of your profile details.</Text>
            <Text style={styles.bulletPoint}>• Erasure and complete deletion of your account and personal data at any time via Settings.</Text>
          </View>

          {/* Section 5: Grievance Redressal */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>5. Grievance Redressal & Contact</Text>
            <Text style={styles.paragraph}>
              If you have any questions, privacy concerns, or data erasure requests, please contact our Data Grievance Officer:
            </Text>
            <View style={styles.contactBox}>
              <Mail size={16} color={theme.colors.brand} />
              <Text style={styles.contactEmail}>eventime.admin@gmail.com</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  updatedDate: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  bulletPoint: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginTop: 4,
    paddingLeft: 8,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  contactEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.brand,
  },
});
