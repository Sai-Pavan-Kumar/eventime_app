import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Star, X, Sparkles, Send, CheckCircle2, MessageSquareHeart } from 'lucide-react-native';
import { theme } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { recordRatingAction, openStoreListing } from '../lib/rating-prompt';

export interface SmartRatingModalProps {
  visible: boolean;
  onClose: () => void;
}

const FEEDBACK_TAGS = [
  'Event Accuracy',
  'App Speed',
  'Missing Cities',
  'Design & UI',
  'Bug / Error',
  'Other',
];

export function SmartRatingModal({ visible, onClose }: SmartRatingModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [selectedTag, setSelectedTag] = useState<string>('Event Accuracy');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 5:
        return 'Exceptional! 🌟';
      case 4:
        return 'Really Great! ✨';
      case 3:
        return "It's Okay 👍";
      case 2:
        return 'Needs Work 🛠️';
      case 1:
        return 'Disappointed 😔';
      default:
        return 'Tap a star to rate';
    }
  };

  const handleStarPress = (starIndex: number) => {
    setRating(starIndex);
  };

  // 4 or 5 stars -> Redirect to Google Play Store
  const handleStoreReview = async () => {
    await recordRatingAction('rated_store', rating, undefined, undefined, user?.id);
    await openStoreListing();
    onClose();
  };

  // 1, 2, or 3 stars -> Submit private constructive feedback
  const handleInternalFeedbackSubmit = async () => {
    setIsSubmitting(true);
    try {
      await recordRatingAction('rated_internal', rating, feedbackText.trim(), selectedTag, user?.id);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setRating(0);
        setFeedbackText('');
        onClose();
      }, 1800);
    } catch (err) {
      console.error('[SmartRatingModal] Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSnooze = async () => {
    await recordRatingAction('snoozed', rating > 0 ? rating : undefined, undefined, undefined, user?.id);
    onClose();
  };

  const isPositive = rating >= 4;
  const isConstructive = rating > 0 && rating <= 3;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Card */}
          <View style={styles.card}>
            {/* Close / Dismiss Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={handleSnooze} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {/* State: Submitted Success */}
            {isSubmitted ? (
              <View style={styles.successState}>
                <View style={styles.successIconBg}>
                  <CheckCircle2 size={32} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Thank You!</Text>
                <Text style={styles.successSubtitle}>
                  Your feedback helps our product team build a better EvenTime for you.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Brand Badge */}
                <View style={styles.badgeContainer}>
                  <View style={styles.brandIconBg}>
                    <Sparkles size={20} color={theme.colors.brand} />
                  </View>
                </View>

                {/* Title & Description */}
                <Text style={styles.title}>Enjoying EvenTime?</Text>
                <Text style={styles.subtitle}>
                  How would you rate your experience discovering events?
                </Text>

                {/* Star Rating Row */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const isFilled = starIndex <= rating;
                    return (
                      <TouchableOpacity
                        key={starIndex}
                        style={styles.starBtn}
                        onPress={() => handleStarPress(starIndex)}
                        activeOpacity={0.7}
                      >
                        <Star
                          size={36}
                          color={isFilled ? '#F59E0B' : '#E2E8F0'}
                          fill={isFilled ? '#F59E0B' : 'transparent'}
                          strokeWidth={1.5}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Dynamic Label */}
                <Text
                  style={[
                    styles.ratingLabel,
                    rating > 0 && { color: rating >= 4 ? '#D97706' : '#64748B', fontWeight: '800' },
                  ]}
                >
                  {getRatingLabel(rating)}
                </Text>

                {/* Branch A: 4 or 5 Stars -> Store Review */}
                {isPositive && (
                  <View style={styles.positiveContainer}>
                    <Text style={styles.positiveNote}>
                      We are thrilled you love EvenTime! A quick review on Google Play helps students and organizers discover our platform.
                    </Text>

                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={handleStoreReview}
                      activeOpacity={0.85}
                    >
                      <Star size={16} color="#FFF" fill="#FFF" />
                      <Text style={styles.primaryActionText}>Rate on Google Play</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Branch B: 1, 2, or 3 Stars -> Internal Private Feedback */}
                {isConstructive && (
                  <View style={styles.constructiveContainer}>
                    <View style={styles.constructiveHeader}>
                      <MessageSquareHeart size={16} color={theme.colors.brand} />
                      <Text style={styles.constructiveTitle}>Help Us Improve</Text>
                    </View>
                    <Text style={styles.constructiveSubtitle}>
                      What could we do better? Your feedback goes straight to the founders.
                    </Text>

                    {/* Topic Tags */}
                    <View style={styles.tagGrid}>
                      {FEEDBACK_TAGS.map((tag) => {
                        const isSelected = selectedTag === tag;
                        return (
                          <TouchableOpacity
                            key={tag}
                            style={[styles.tagChip, isSelected && styles.tagChipActive]}
                            onPress={() => setSelectedTag(tag)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.tagChipText, isSelected && styles.tagChipTextActive]}>
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Feedback Input */}
                    <TextInput
                      style={styles.feedbackInput}
                      placeholder="Tell us what went wrong or how to improve..."
                      placeholderTextColor={theme.colors.textMuted}
                      multiline
                      numberOfLines={3}
                      value={feedbackText}
                      onChangeText={setFeedbackText}
                    />

                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={handleInternalFeedbackSubmit}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Send size={15} color="#FFF" />
                          <Text style={styles.primaryActionText}>Send Feedback</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Snooze / Remind Later Link */}
                <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze} activeOpacity={0.6}>
                  <Text style={styles.snoozeText}>Remind Me Later</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...theme.shadows.md,
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  brandIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  positiveContainer: {
    marginTop: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  positiveNote: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '500',
  },
  constructiveContainer: {
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  constructiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  constructiveTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  constructiveSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tagChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tagChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  feedbackInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
    height: 75,
    marginBottom: 14,
  },
  primaryActionBtn: {
    backgroundColor: theme.colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    ...theme.shadows.brand,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  snoozeBtn: {
    marginTop: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  snoozeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
