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
} from 'react-native';
import { MessageSquare, X, Bug, Lightbulb, Sparkles } from 'lucide-react-native';
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

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MessageSquare size={20} color={theme.colors.brand} />
              <Text style={styles.modalTitle}>Share Feedback</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Have an idea, found a bug, or want a feature? Tell us below:
          </Text>

          {/* Type Selector */}
          <View style={styles.typeRow}>
            {[
              { id: 'general', label: 'General', icon: Sparkles },
              { id: 'bug', label: 'Bug Report', icon: Bug },
              { id: 'feature', label: 'Feature Idea', icon: Lightbulb },
            ].map((t) => {
              const isSelected = feedbackType === t.id;
              const Icon = t.icon;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                  onPress={() => setFeedbackType(t.id as any)}
                >
                  <Icon size={14} color={isSelected ? '#6C47FF' : '#64748B'} />
                  <Text style={[styles.typeText, isSelected && styles.typeTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            placeholder="Type your message here..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={message}
            onChangeText={setMessage}
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeBtnActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  typeTextActive: {
    color: '#6C47FF',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    height: 110,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
