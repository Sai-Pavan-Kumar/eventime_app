import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { theme } from '../config/theme';
import { haptic } from '../lib/haptics';

export default function AboutEvenTimeScreen() {
  const navigation = useNavigation();

  const handleOpenSurfboard = () => {
    haptic.light();
    Linking.openURL('https://thesurfboard.in').catch((err) => {
      console.warn('Failed to open URL:', err);
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            haptic.light();
            navigation.goBack();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About EvenTime</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.title}>EvenTime</Text>
          <Text style={styles.subtitle}>The dictionary for events.</Text>

          <View style={styles.divider} />

          {/* Section: The Problem */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>The Problem</Text>
            <Text style={styles.paragraph}>
              Networking matters. Whether you are discovering a hackathon, meeting peers, or seeking collaborators, being in the right room changes everything.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 10 }]}>
              Today, finding those rooms is fragmented. Organizers list events across different ticketing platforms like Lu.ma or Meetup, while others share links through private groups. More often than not, you only learn an event took place after seeing photos posted on social media.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 10 }]}>
              Juggling multiple platforms just to know what is happening this weekend shouldn't be your job.
            </Text>
          </View>

          {/* Section: One Single Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>One Single Timeline</Text>
            <Text style={styles.paragraph}>
              EvenTime brings events from across the internet into one place.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 10 }]}>
              Instead of searching multiple websites, you browse one feed. EvenTime is community-driven: anyone who knows about an upcoming event can publish it. There are no complicated barriers—everyone who publishes an event is a Curator helping their city stay connected.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 10 }]}>
              Attendees find the events they want. Organizers get the reach they need.
            </Text>
          </View>

          {/* Section: Beyond Notice Boards */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Beyond Notice Boards</Text>
            <Text style={styles.paragraph}>
              College events and fests have historically lived on physical canteen boards and cafeteria walls. If you didn't walk past that board, you missed the announcement.
            </Text>
            <Text style={[styles.paragraph, { marginTop: 10 }]}>
              EvenTime moves that offline communication onto the timeline:
            </Text>
            <Text style={[styles.bulletItem, { marginTop: 8 }]}>
              • <Text style={styles.boldSpan}>Exclusive College Events:</Text> Fests and workshops restricted to your college appear in Your Campus. Students can toggle between All Events and Eligible for Me to instantly view events matching their branch and graduation year with zero card clutter.
            </Text>
            <Text style={[styles.bulletItem, { marginTop: 6 }]}>
              • <Text style={styles.boldSpan}>Open College Events:</Text> Inter-college fests, hackathons, and cultural nights open to outside attendees appear city-wide in Around You.
            </Text>
            <Text style={[styles.bulletItem, { marginTop: 6 }]}>
              • <Text style={styles.boldSpan}>Seamless Publishing:</Text> When onboarded students post a college fest or event, their registered college is automatically pre-filled, making hosting effortless.
            </Text>
          </View>

          {/* Section: How Feeds Work */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>How Feeds Work</Text>
            <Text style={styles.paragraph}>
              Every user chooses up to 3 cities and 6 categories from a collection of over 30 categories and 30 cities across India:
            </Text>
            <Text style={[styles.bulletItem, { marginTop: 8 }]}>
              • <Text style={styles.boldSpan}>For You:</Text> Events in your selected cities that match your favorite categories.
            </Text>
            <Text style={[styles.bulletItem, { marginTop: 6 }]}>
              • <Text style={styles.boldSpan}>Around You:</Text> Everything else happening across your chosen cities, helping you explore beyond your usual preferences.
            </Text>
            <Text style={[styles.bulletItem, { marginTop: 6 }]}>
              • <Text style={styles.boldSpan}>Your Campus:</Text> Internal events and fests exclusive to your college, with instant switching between All Events and Eligible for Me.
            </Text>
          </View>

          {/* Section: Thoughtful Details */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Thoughtful Details</Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.boldSpan}>24-Hour Reminders:</Text> Get an automatic notification one day before your saved event begins so you never miss out.
            </Text>
            <Text style={[styles.bulletItem, { marginTop: 6 }]}>
              • <Text style={styles.boldSpan}>Add to Calendar:</Text> Sync any event to your device's native calendar in a single tap.
            </Text>
            <Text style={[styles.bulletItem, { marginTop: 6 }]}>
              • <Text style={styles.boldSpan}>Save for Later:</Text> Bookmark events you are considering to your profile.
            </Text>
            <Text style={[styles.bulletItem, { marginTop: 6 }]}>
              • <Text style={styles.boldSpan}>Community Interest:</Text> See how many attendees are interested in an event to gauge momentum before you go.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Single Clean Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Built for humans, by{' '}
              <Text style={styles.footerLink} onPress={handleOpenSurfboard}>
                The SurfBoard
              </Text>
              .
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
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
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  bulletItem: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  boldSpan: {
    fontFamily: 'Switzer-Bold',
    color: '#0F172A',
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  footerText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  footerLink: {
    fontFamily: 'Switzer-Bold',
    color: '#6C47FF',
    textDecorationLine: 'underline',
  },
});
