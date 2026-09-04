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
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import {
  ShieldCheck,
  Sparkles,
  Calendar,
  MapPin,
  Share2,
  ExternalLink,
  X,
  Trophy,
  CheckCircle2,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

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
  curatorUsername: string;
  onClose: () => void;
  onViewEvent?: (eventId?: string, slug?: string) => void;
}

// 18 micro-confetti particles for celebratory burst
const CONFETTI_PARTICLES = Array.from({ length: 18 }).map((_, i) => {
  const angle = (i / 18) * 2 * Math.PI + (Math.random() * 0.2 - 0.1);
  const distance = 80 + Math.random() * 70;
  const colors = ['#F59E0B', '#10B981', '#6366F1', '#38BDF8', '#EC4899', '#FFFFFF'];
  return {
    id: i,
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance * 0.85 - 40,
    size: 5 + Math.random() * 5,
    color: colors[i % colors.length],
    rotation: Math.random() * 360,
  };
});

export function CuratorCelebrationModal({
  visible,
  event,
  curatorUsername,
  onClose,
  onViewEvent,
}: CuratorCelebrationModalProps) {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  // Sanitize curator username: strictly no email addresses
  const cleanUsername = React.useMemo(() => {
    if (!curatorUsername) return 'curator';
    return curatorUsername
      .replace(/^@/, '')
      .split('@')[0]
      .trim();
  }, [curatorUsername]);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
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
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1200,
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
    const message = `🚀 Just published "${event.title}" on EvenTime!\n\n📅 ${event.dateString}\n📍 ${event.city || 'Online'}\n\nCheck out the schedule & register here:\n${eventUrl}`;
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
        {/* Confetti Particles Layer */}
        <View pointerEvents="none" style={styles.confettiContainer}>
          {CONFETTI_PARTICLES.map((p) => {
            const pX = confettiAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, p.dx],
            });
            const pY = confettiAnim.interpolate({
              inputRange: [0, 0.4, 1],
              outputRange: [0, p.dy, p.dy + 80],
            });
            const pOpacity = confettiAnim.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [1, 0.9, 0],
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
                    height: p.size * (p.id % 2 === 0 ? 1 : 1.6),
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

        {/* Main Apple-Grade Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Subtle Top Close Button */}
          <TouchableOpacity
            style={styles.closeIconButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* 1. Verified Host Pill (With Clean Username Only) */}
          <View style={styles.verifiedHostRow}>
            <View style={styles.verifiedHostPill}>
              <ShieldCheck size={14} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.verifiedHostLabel}>VERIFIED HOST</Text>
              <View style={styles.pillDot} />
              <Text style={styles.curatorUsernameText}>@{cleanUsername}</Text>
            </View>
          </View>

          {/* 2. Headline & Subtitle */}
          <View style={styles.headlineBlock}>
            <Text style={styles.headlineTitle}>
              {isLive ? 'Your Event is Live!' : 'Event Submitted!'}
            </Text>
            <Text style={styles.headlineSubtitle}>
              {isLive
                ? 'Broadcasted instantly to curious students across EvenTime.'
                : 'In priority review queue — going live on EvenTime shortly.'}
            </Text>
          </View>

          {/* 3. Gamification Reward Chip */}
          {isLive && (
            <View style={styles.rewardChip}>
              <Sparkles size={13} color="#F59E0B" />
              <Text style={styles.rewardChipText}>+100 ET Curator Score</Text>
              <Trophy size={13} color="#F59E0B" />
            </View>
          )}

          {/* 4. Event Preview Ticket */}
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
                  <Calendar size={22} color="#6C47FF" />
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
                  <Calendar size={12} color="#94A3B8" />
                  <Text style={styles.ticketMetaText} numberOfLines={1}>
                    {event.dateString}
                  </Text>
                </View>

                <View style={styles.ticketMetaItem}>
                  <MapPin size={12} color="#94A3B8" />
                  <Text style={styles.ticketMetaText} numberOfLines={1}>
                    {event.city || 'Online'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 5. Viral Sharing Actions */}
          <View style={styles.actionBlock}>
            {/* Primary Action: WhatsApp */}
            <TouchableOpacity
              style={styles.whatsAppBtn}
              onPress={handleWhatsAppShare}
              activeOpacity={0.85}
            >
              <View style={styles.whatsAppIconCircle}>
                <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.whatsAppBtnText}>Share to WhatsApp</Text>
            </TouchableOpacity>

            {/* Secondary Actions: System Share & View Event */}
            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleSystemShare}
                activeOpacity={0.8}
              >
                <Share2 size={15} color="#CBD5E1" />
                <Text style={styles.secondaryBtnText}>Share Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, styles.viewEventBtn]}
                onPress={handleView}
                activeOpacity={0.8}
              >
                <ExternalLink size={15} color="#60A5FA" />
                <Text style={[styles.secondaryBtnText, styles.viewEventText]}>
                  View Event
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 6. Dismiss Footnote */}
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
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confettiContainer: {
    position: 'absolute',
    width: 2,
    height: 2,
    top: '45%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  confettiPiece: {
    position: 'absolute',
  },
  cardContainer: {
    width: Math.min(width - 32, 400),
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  closeIconButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  verifiedHostRow: {
    marginBottom: 14,
  },
  verifiedHostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 100,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  verifiedHostLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
    color: '#10B981',
    letterSpacing: 0.6,
  },
  pillDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
  },
  curatorUsernameText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  headlineBlock: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headlineTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 6,
  },
  headlineSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  rewardChipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#F59E0B',
    letterSpacing: 0.2,
  },
  ticketPreview: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 20,
  },
  ticketLeft: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  ticketPoster: {
    width: '100%',
    height: '100%',
  },
  ticketFallbackArt: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(108, 71, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketRight: {
    flex: 1,
    justifyContent: 'center',
  },
  ticketCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  ticketCategoryText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 9,
    color: '#CBD5E1',
    letterSpacing: 0.5,
  },
  ticketTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#F8FAFC',
    lineHeight: 18,
    marginBottom: 6,
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
    fontSize: 11,
    color: '#94A3B8',
  },
  actionBlock: {
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  whatsAppBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#16A34A',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsAppIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#E2E8F0',
  },
  viewEventBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  viewEventText: {
    color: '#60A5FA',
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
