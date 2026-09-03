import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserPlus, ArrowRight, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';

const GUEST_PROMPT_KEY = 'EvenTime_guest_prompt_seen';

export function DelayedPromptModal() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only prompt guests who are not signed in
    if (user) return;

    let timer: NodeJS.Timeout | null = null;

    AsyncStorage.getItem(GUEST_PROMPT_KEY).then((seen) => {
      if (!seen) {
        // Show gentle prompt after 15 seconds of browsing
        timer = setTimeout(() => {
          setIsVisible(true);
        }, 15000);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  const handleDismiss = async () => {
    setIsVisible(false);
    try {
      await AsyncStorage.setItem(GUEST_PROMPT_KEY, 'true');
    } catch (e) {}
  };

  const handleSignIn = async () => {
    setIsVisible(false);
    try {
      await AsyncStorage.setItem(GUEST_PROMPT_KEY, 'true');
    } catch (e) {}
    navigation.navigate('Login');
  };

  if (user || !isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleDismiss}
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={1}
          onPress={() => {}}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} activeOpacity={0.7}>
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <UserPlus size={26} color="#6C47FF" />
          </View>

          <Text style={styles.title}>Unlock Full Access</Text>
          <Text style={styles.message}>
            Sign in to save events, host your own, and get tailored recommendations for your campus.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Sign In Now</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleDismiss} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Keep Exploring</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C47FF',
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  primaryBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#94A3B8',
  },
});
