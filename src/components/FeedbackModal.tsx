import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { MessageSquare, X, Bug, Lightbulb, MessageCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';

export interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'feature'>('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please enter your feedback or suggestion.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('platform_feedback').insert({
        user_id: user?.id || null,
        type: feedbackType,
        message: message.trim(),
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert(
        'Feedback Received',
        'Thank you for helping us make EvenTime better! Our product team reviews every message.'
      );
      setMessage('');
      setFeedbackType('general');
      onClose();
    } catch (err: any) {
      console.error('[FeedbackModal] Error:', err);
      Alert.alert('Error', err?.message || 'Could not submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FEEDBACK_TYPES = [
    { id: 'general', label: 'General', icon: MessageCircle },
    { id: 'bug', label: 'Bug', icon: Bug },
    { id: 'feature', label: 'Feature', icon: Lightbulb },
  ] as const;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconCircle}>
                    <MessageSquare size={18} color={theme.colors.brand} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Share Feedback</Text>
                    <Text style={styles.modalSubtitle}>Direct line to the product makers</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* iOS Segmented Control */}
              <View style={styles.segmentedContainer}>
                {FEEDBACK_TYPES.map((t) => {
                  const isSelected = feedbackType === t.id;
                  const Icon = t.icon;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                      onPress={() => setFeedbackType(t.id)}
                      activeOpacity={0.8}
                    >
                      <Icon
                        size={14}
                        color={isSelected ? theme.colors.brand : '#64748B'}
                      />
                      <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Message Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    feedbackType === 'bug'
                      ? 'Describe what happened and steps to reproduce...'
                      : feedbackType === 'feature'
                      ? 'What feature would make EvenTime indispensable for you?'
                      : 'Share your thoughts, suggestions, or comments...'
                  }
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  value={message}
                  onChangeText={setMessage}
                  maxLength={1000}
                />
                <View style={styles.charCountRow}>
                  <Text style={styles.charCountText}>{message.length}/1000</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.submitText}>Submit Feedback</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  keyboardAvoid: {
    width: '100%',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  modalSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 12,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 5,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  segmentTextActive: {
    fontFamily: 'Switzer-Bold',
    color: theme.colors.brand,
  },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  textInput: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    height: 110,
    lineHeight: 20,
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  charCountText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 10,
    color: '#94A3B8',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
    color: '#64748B',
  },
  submitBtn: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: theme.colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
    fontSize: 14,
  },
});
