import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Linking,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Share2,
  ExternalLink,
  X,
} from 'lucide-react-native';
import { theme } from '../config/theme';

const { width } = Dimensions.get('window');

export interface CelebrationEventData {
  id?: string;
  slug?: string;
  title: string;
  category: string;
  dateString: string;
  city: string;
  location?: string;
  posterUrl?: string | null;
  status: 'approved' | 'pending';
  isTrusted?: boolean;
}

interface CuratorCelebrationModalProps {
  visible: boolean;
  event: CelebrationEventData | null;
  curatorUsername?: string;
  onClose: () => void;
  onViewEvent?: (eventId?: string, slug?: string) => void;
}

// 16 refined micro-confetti particles for subtle celebratory burst
const CONFETTI_PARTICLES = Array.from({ length: 16 }).map((_, i) => {
  const angle = (i / 16) * 2 * Math.PI + (Math.random() * 0.2 - 0.1);
  const distance = 70 + Math.random() * 60;
  const colors = ['#6C47FF', '#10B981', '#38BDF8', '#F59E0B', '#A855F7', '#EC4899'];
  return {
    id: i,
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance * 0.85 - 30,
    size: 4 + Math.random() * 4,
    color: colors[i % colors.length],
    rotation: Math.random() * 360,
  };
});

export function CuratorCelebrationModal({
  visible,
  event,
  onClose,
  onViewEvent,
}: CuratorCelebrationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      confettiAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim, confettiAnim]);

  if (!event) return null;

  const isLive = event.status === 'approved';
  const eventUrl = `https://eventime.thesurfboard.in/events/${event.slug || event.id || ''}`;

  const handleWhatsAppShare = async () => {
    const message = `Check out "${event.title}" on EvenTime!\n\n📅 ${event.dateString}\n📍 ${event.city || 'Online'}\n\nView details & register here:\n${eventUrl}`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({
          title: event.title,
          message,
          url: eventUrl,
        });
      }
    } catch {
      await Share.share({
        title: event.title,
        message,
        url: eventUrl,
      });
    }
  };

  const handleSystemShare = async () => {
    try {
      await Share.share({
        title: event.title,
        message: `Check out "${event.title}" on EvenTime:\n${eventUrl}`,
        url: eventUrl,
      });
    } catch (e) {
      console.warn('[CelebrationModal] Share error', e);
    }
  };

  const handleView = () => {
    onClose();
    if (onViewEvent) {
      onViewEvent(event.id, event.slug);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Confetti Particles */}
        <View pointerEvents="none" style={styles.confettiContainer}>
          {CONFETTI_PARTICLES.map((p) => {
            const pX = confettiAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, p.dx],
            });
            const pY = confettiAnim.interpolate({
              inputRange: [0, 0.4, 1],
              outputRange: [0, p.dy, p.dy + 70],
            });
            const pOpacity = confettiAnim.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [1, 0.8, 0],
            });
            const pScale = confettiAnim.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0.5, 1.2, 0.6],
            });

            return (
              <Animated.View
                key={p.id}
                style={[
                  styles.confettiPiece,
                  {
                    width: p.size,
                    height: p.size * (p.id % 2 === 0 ? 1 : 1.5),
                    backgroundColor: p.color,
                    borderRadius: p.id % 3 === 0 ? 100 : 2,
                    transform: [
                      { translateX: pX },
                      { translateY: pY },
                      { scale: pScale },
                      { rotate: `${p.rotation}deg` },
                    ],
                    opacity: pOpacity,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Modal Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Close Button */}
          <TouchableOpacity
            style={styles.closeIconButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          {/* Clean Success Badge */}
          <View style={styles.successIconWrapper}>
            <CheckCircle2 size={26} color="#10B981" strokeWidth={2.4} />
          </View>

          {/* Headline & Subtitle */}
          <View style={styles.headlineBlock}>
            <Text style={styles.headlineTitle}>
              {isLive ? 'Your Event is Live!' : 'Event Submitted!'}
            </Text>
            <Text style={styles.headlineSubtitle}>
              {isLive
                ? 'Your event has been published and is now live on EvenTime.'
                : 'Your event was submitted and will be reviewed shortly.'}
            </Text>
          </View>

          {/* Event Preview Card */}
          <View style={styles.ticketPreview}>
            <View style={styles.ticketLeft}>
              {event.posterUrl ? (
                <Image
                  source={{ uri: event.posterUrl }}
                  style={styles.ticketPoster}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.ticketFallbackArt}>
                  <Calendar size={22} color={theme.colors.brand} />
                </View>
              )}
            </View>

            <View style={styles.ticketRight}>
              <View style={styles.ticketCategoryBadge}>
                <Text style={styles.ticketCategoryText}>
                  {event.category.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.ticketTitle} numberOfLines={2}>
                {event.title}
              </Text>

              <View style={styles.ticketMetaRow}>
                <View style={styles.ticketMetaItem}>
                  <Calendar size={12} color="#64748B" />
                  <Text style={styles.ticketMetaText} numberOfLines={1}>
                    {event.dateString}
                  </Text>
                </View>

                <View style={styles.ticketMetaItem}>
                  <MapPin size={12} color="#64748B" />
                  <Text style={styles.ticketMetaText} numberOfLines={1}>
                    {event.city || 'Online'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionBlock}>
            {/* Primary Action: WhatsApp */}
            <TouchableOpacity
              style={styles.whatsAppBtn}
              onPress={handleWhatsAppShare}
              activeOpacity={0.85}
            >
              <Text style={styles.whatsAppBtnText}>Share to WhatsApp</Text>
            </TouchableOpacity>

            {/* Secondary Actions: System Share & View Event */}
            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleSystemShare}
                activeOpacity={0.8}
              >
                <Share2 size={15} color="#475569" />
                <Text style={styles.secondaryBtnText}>Share Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, styles.viewEventBtn]}
                onPress={handleView}
                activeOpacity={0.8}
              >
                <ExternalLink size={15} color={theme.colors.brand} />
                <Text style={[styles.secondaryBtnText, styles.viewEventText]}>
                  View Event
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dismiss Action */}
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissBtnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confettiContainer: {
    position: 'absolute',
    width: 2,
    height: 2,
    top: '40%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  confettiPiece: {
    position: 'absolute',
  },
  cardContainer: {
    width: Math.min(width - 32, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  closeIconButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  successIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headlineBlock: {
    alignItems: 'center',
    marginBottom: 18,
  },
  headlineTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  headlineSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  ticketPreview: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 18,
  },
  ticketLeft: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  ticketPoster: {
    width: '100%',
    height: '100%',
  },
  ticketFallbackArt: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketRight: {
    flex: 1,
    justifyContent: 'center',
  },
  ticketCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF0FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  ticketCategoryText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10,
    color: theme.colors.brand,
    letterSpacing: 0.5,
  },
  ticketTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 19,
    marginBottom: 5,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ticketMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#64748B',
  },
  actionBlock: {
    width: '100%',
    gap: 10,
    marginBottom: 10,
  },
  whatsAppBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#22C55E',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  whatsAppBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#0F172A',
  },
  viewEventBtn: {
    backgroundColor: '#EEF0FF',
    borderColor: '#C7D2FE',
  },
  viewEventText: {
    color: theme.colors.brand,
  },
  dismissBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  dismissBtnText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#64748B',
  },
});
