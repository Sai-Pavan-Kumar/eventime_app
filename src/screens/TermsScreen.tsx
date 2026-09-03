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
import { ArrowLeft, FileText, CheckCircle2, ShieldAlert } from 'lucide-react-native';
import { theme } from '../config/theme';

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <FileText size={16} color={theme.colors.brand} />
            <Text style={styles.badgeText}>EvenTime Terms</Text>
          </View>

          <Text style={styles.title}>Terms of Service & Guidelines</Text>
          <Text style={styles.updatedDate}>Last updated: June 30, 2026</Text>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By creating an account or accessing EvenTime, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the application.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>2. Curator Community Guidelines</Text>
            <Text style={styles.paragraph}>
              EvenTime is a curated directory powered by community organizers. Curators must only post genuine, accurate, and non-misleading event listings. Spam, scams, or posting duplicate events to artificially inflate ET Scores will result in immediate moderation and score resets.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>3. Content Ownership & Verification</Text>
            <Text style={styles.paragraph}>
              Event posters, brand logos, and external ticket links belong to their respective organizers and creators. EvenTime does not host ticket payments directly unless specified.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>4. Account Termination</Text>
            <Text style={styles.paragraph}>
              Users have the right to terminate their account and erase their data at any time from the app settings. EvenTime reserves the right to suspend accounts violating community safety standards.
            </Text>
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
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
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
    backgroundColor: '#EDE9FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: theme.colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  updatedDate: {
    fontFamily: 'Switzer-Regular',
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
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
});
