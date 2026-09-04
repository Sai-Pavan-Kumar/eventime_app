import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';

export interface EventReportModalProps {
  visible: boolean;
  eventId: string;
  curatorId?: string | null;
  eventTitle?: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Broken Link',
  'Incorrect Location',
  'Fake/Spam Event',
  'Wrong Date/Time',
] as const;

export const EventReportModal: React.FC<EventReportModalProps> = ({
  visible,
  eventId,
  curatorId,
  eventTitle,
  onClose,
}) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReported, setIsReported] = useState(false);

  const resetState = () => {
    setSelectedReason('');
    setAdditionalDetails('');
    setIsSubmitting(false);
    setIsReported(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to report an event.');
      return;
    }

    if (!selectedReason) {
      Alert.alert('Select a Reason', 'Please select a reason for reporting this event.');
      return;
    }

    // Security Check 1: Prevent Self-Reporting (Matching Website Security Fix 1)
    if (curatorId && user.id === curatorId) {
      Alert.alert('Action Not Allowed', 'You cannot report your own event.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Security Check 2: Rate Limiting (Max 5 active/pending reports per user, matching Website Security Fix 2)
      const { count: pendingCount, error: countError } = await supabase
        .from('event_reports')
        .select('*', { count: 'exact', head: true })
        .eq('reporter_id', user.id)
        .eq('status', 'pending');

      if (countError) {
        console.error('[EventReportModal] Rate limit check error:', countError);
      } else if (pendingCount && pendingCount >= 5) {
        Alert.alert(
          'Report Limit Reached',
          'You have reached the maximum limit of 5 pending reports. Please wait for our moderation team to review them.'
        );
        setIsSubmitting(false);
        return;
      }

      // Check if user already submitted a pending report for this specific event
      const { data: existingReport } = await supabase
        .from('event_reports')
        .select('id')
        .eq('event_id', eventId)
        .eq('reporter_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingReport) {
        Alert.alert(
          'Already Reported',
          'You have already submitted a report for this event. Our team is currently reviewing it.'
        );
        setIsSubmitting(false);
        return;
      }

      // Format reason matching website schema: Primary Reason + optional details
      const finalReason = additionalDetails.trim()
        ? `${selectedReason}: ${additionalDetails.trim()}`
        : selectedReason;

      const { error: insertError } = await supabase.from('event_reports').insert({
        event_id: eventId,
        reporter_id: user.id,
        curator_id: curatorId || null,
        reason: finalReason,
        status: 'pending',
      });

      if (insertError) throw insertError;

      // Show success screen matching website
      setIsReported(true);
    } catch (err: any) {
      console.error('[EventReportModal] Submission error:', err);
      Alert.alert('Submission Failed', err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.iconCircle}>
              {isReported ? (
                <CheckCircle2 size={24} color="#10B981" />
              ) : (
                <AlertTriangle size={24} color="#EF4444" />
              )}
            </View>

            <Text style={styles.title}>
              {isReported ? 'Report Submitted' : 'Report Event'}
            </Text>
            <Text style={styles.subtitle}>
              {isReported
                ? 'Our admin team will review this listing shortly.'
                : 'Help us keep the EvenTime community accurate and safe.'}
            </Text>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {isReported ? (
              <View style={styles.successContent}>
                <Text style={styles.successNote}>
                  Thank you for helping maintain community quality. If any guidelines were violated, the listing will be corrected or removed.
                </Text>
                <TouchableOpacity style={styles.closeActionBtn} onPress={handleClose} activeOpacity={0.8}>
                  <Text style={styles.closeActionBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formContent}>
                <Text style={styles.sectionLabel}>Select the issue you noticed:</Text>

                {REPORT_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                      onPress={() => setSelectedReason(reason)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Additional Details (Optional) */}
                <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
                  Additional details (optional):
                </Text>
                <TextInput
                  style={styles.detailsInput}
                  placeholder="Provide any specific context for moderators..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={additionalDetails}
                  onChangeText={setAdditionalDetails}
                  maxLength={300}
                />

                {/* Submit Action Button */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!selectedReason || isSubmitting) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formContent: {
    paddingBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#EF4444',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  reasonTextSelected: {
    color: '#991B1B',
    fontWeight: '700',
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 18,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#F87171',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  successNote: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  closeActionBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
