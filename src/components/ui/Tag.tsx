import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { BookingStatus, GiftStatus, SubscriptionStatus } from '@/domain/types';
import { Icon, type IconName } from './icons';
import { Text } from './Text';

export type TagTone = 'featured' | 'student' | 'offer' | 'insurance' | 'open' | 'closed' | 'home' | 'onsite' | 'neutral' | 'primary' | 'gold' | 'success' | 'danger' | 'info' | 'dark' | 'light';

export interface TagProps {
  label: string;
  tone?: TagTone;
  icon?: IconName;
  size?: 'sm' | 'md';
  /** solid (filled) or tint (soft background) */
  appearance?: 'solid' | 'tint';
  style?: StyleProp<ViewStyle>;
}

export const Tag = React.memo(function Tag({ label, tone = 'neutral', icon, size = 'sm', appearance = 'solid', style }: TagProps) {
  const { colors, radii } = useTheme();
  const solid: Record<TagTone, { bg: string; fg: string }> = {
    featured: { bg: colors.tagFeatured, fg: '#FFFFFF' },
    student: { bg: colors.tagStudent, fg: '#FFFFFF' },
    offer: { bg: colors.tagOffer, fg: '#FFFFFF' },
    insurance: { bg: colors.tagInsurance, fg: '#FFFFFF' },
    open: { bg: colors.tagOpen, fg: '#FFFFFF' },
    closed: { bg: colors.tagClosed, fg: '#FFFFFF' },
    home: { bg: colors.tagHome, fg: '#FFFFFF' },
    onsite: { bg: colors.tagOnsite, fg: '#FFFFFF' },
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    primary: { bg: colors.primary, fg: colors.onPrimary },
    gold: { bg: colors.gold, fg: '#FFFFFF' },
    success: { bg: colors.success, fg: '#FFFFFF' },
    danger: { bg: colors.danger, fg: '#FFFFFF' },
    info: { bg: colors.info, fg: '#FFFFFF' },
    dark: { bg: 'rgba(21,16,16,0.72)', fg: '#FFFFFF' },
    light: { bg: 'rgba(255,255,255,0.9)', fg: colors.ink },
  };
  const tint: Record<TagTone, { bg: string; fg: string }> = {
    ...solid,
    featured: { bg: colors.surfaceAlt, fg: colors.ink },
    offer: { bg: '#FFF0EB', fg: colors.tagOffer },
    insurance: { bg: colors.successTint, fg: colors.success },
    open: { bg: colors.successTint, fg: colors.success },
    closed: { bg: colors.dangerTint, fg: colors.danger },
    home: { bg: colors.infoTint, fg: colors.tagHome },
    onsite: { bg: colors.tint, fg: colors.primary },
    primary: { bg: colors.tint, fg: colors.primary },
    gold: { bg: colors.goldTint, fg: colors.gold },
    success: { bg: colors.successTint, fg: colors.success },
    danger: { bg: colors.dangerTint, fg: colors.danger },
    info: { bg: colors.infoTint, fg: colors.info },
    student: { bg: '#F3E8FF', fg: colors.tagStudent },
  };
  const c = (appearance === 'solid' ? solid : tint)[tone];
  return (
    <View style={[styles.base, { backgroundColor: c.bg, borderRadius: radii.pill, height: size === 'sm' ? 24 : 30, paddingHorizontal: size === 'sm' ? 9 : 12 }, style]}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 12 : 14} color={c.fg} /> : null}
      <Text variant={size === 'sm' ? 'caption' : 'bodySm'} weight="semibold" color={c.fg} lines={1}>
        {label}
      </Text>
    </View>
  );
});

const bookingTone: Record<BookingStatus, TagTone> = { PENDING: 'gold', CONFIRMED: 'primary', IN_PROGRESS: 'info', COMPLETED: 'success', CANCELLED: 'danger' };
const subTone: Record<SubscriptionStatus, TagTone> = { ACTIVE: 'success', EXPIRED: 'neutral', CANCELLED: 'danger', PAUSED: 'gold' };
const giftTone: Record<GiftStatus, TagTone> = { PENDING: 'gold', DELIVERED: 'primary', CLAIMED: 'success', WHATSAPP_SENT: 'info', EXPIRED: 'neutral', CANCELLED: 'danger' };

export interface StatusPillProps {
  label: string;
  status: BookingStatus | SubscriptionStatus | GiftStatus | 'active' | 'inactive' | 'pending';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/** Soft pill with a leading dot (link-2 status style). */
export const StatusPill = React.memo(function StatusPill({ label, status, size = 'sm', style }: StatusPillProps) {
  const { colors, radii } = useTheme();
  const tone: TagTone =
    status === 'active' ? 'success' : status === 'inactive' ? 'neutral' : status === 'pending' ? 'gold' : (bookingTone as Record<string, TagTone>)[status] ?? (subTone as Record<string, TagTone>)[status] ?? (giftTone as Record<string, TagTone>)[status] ?? 'neutral';
  const map: Record<TagTone, { bg: string; fg: string }> = {
    success: { bg: colors.successTint, fg: colors.success },
    danger: { bg: colors.dangerTint, fg: colors.danger },
    gold: { bg: colors.goldTint, fg: colors.gold },
    primary: { bg: colors.tint, fg: colors.primary },
    info: { bg: colors.infoTint, fg: colors.info },
    neutral: { bg: colors.surfaceAlt, fg: colors.muted },
    featured: { bg: colors.surfaceAlt, fg: colors.ink },
    student: { bg: colors.surfaceAlt, fg: colors.ink },
    offer: { bg: colors.surfaceAlt, fg: colors.ink },
    insurance: { bg: colors.surfaceAlt, fg: colors.ink },
    open: { bg: colors.successTint, fg: colors.success },
    closed: { bg: colors.dangerTint, fg: colors.danger },
    home: { bg: colors.infoTint, fg: colors.info },
    onsite: { bg: colors.tint, fg: colors.primary },
    dark: { bg: colors.ink, fg: '#fff' },
    light: { bg: '#fff', fg: colors.ink },
  };
  const c = map[tone];
  return (
    <View style={[styles.base, { backgroundColor: c.bg, borderRadius: radii.pill, height: size === 'sm' ? 24 : 30, paddingHorizontal: size === 'sm' ? 10 : 12 }, style]}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text variant={size === 'sm' ? 'caption' : 'bodySm'} weight="semibold" color={c.fg} lines={1}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
