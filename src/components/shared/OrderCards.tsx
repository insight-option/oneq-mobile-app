import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import type { Booking, BookingStatus, Gift, Subscription } from '@/domain/types';
import { useI18n, daysUntil } from '@/i18n';
import { Avatar, Button, Icon, ProgressBar, RingProgress, StatusPill, Tag, Text } from '@/components/ui';

const STATUS_FLOW: BookingStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

export const BookingTimeline = ({ status }: { status: BookingStatus }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  if (status === 'CANCELLED') return null;
  const idx = STATUS_FLOW.indexOf(status);
  return (
    <View style={styles.timeline}>
      {STATUS_FLOW.map((s, i) => {
        const done = i <= idx;
        return (
          <View key={s} style={styles.timelineStep}>
            <View style={styles.timelineRow}>
              <View style={[styles.dot, { backgroundColor: done ? colors.primary : colors.surfaceAlt, borderColor: done ? colors.primary : colors.lineStrong }]}>{done ? <Icon name="check" size={10} color="#FFFFFF" strokeWidth={3} /> : null}</View>
              {i < STATUS_FLOW.length - 1 ? <View style={[styles.line, { backgroundColor: i < idx ? colors.primary : colors.line }]} /> : null}
            </View>
            <Text variant="caption" color={done ? colors.ink : colors.faint} align="center" lines={1} style={{ fontSize: 10 }}>
              {t(`status.${s}` as 'status.PENDING')}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export interface BookingCardProps {
  booking: Booking;
  onPress?: (b: Booking) => void;
  onCancel?: (b: Booking) => void;
  onRate?: (b: Booking) => void;
  onRebook?: (b: Booking) => void;
  compact?: boolean;
}

export const BookingCard = React.memo(function BookingCard({ booking, onPress, onCancel, onRate, onRebook, compact }: BookingCardProps) {
  const { colors, radii, shadows, spacing } = useTheme();
  const { t, localized, formatDate, formatTime, formatMoney } = useI18n();
  const item = booking.serviceName ?? booking.productName ?? null;
  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const canRate = booking.status === 'COMPLETED' && !booking.companyRated;
  return (
    <Pressable onPress={onPress ? () => onPress(booking) : undefined} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, opacity: pressed ? 0.95 : 1 }, shadows.card]}>
      <View style={styles.rowBetween}>
        <View style={styles.companyRow}>
          <Avatar uri={booking.companyLogoUrl} name={localized(booking.companyName)} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="title" weight="semibold" lines={1}>
              {localized(booking.companyName)}
            </Text>
            <Text variant="caption" muted lines={1}>
              {item ? localized(item) : t(`cw.bookings.kind.${booking.kind}` as 'cw.bookings.kind.SERVICE')}
              {booking.staffName ? ` · ${localized(booking.staffName)}` : ''}
            </Text>
          </View>
        </View>
        <StatusPill status={booking.status} label={t(`status.${booking.status}` as 'status.PENDING')} />
      </View>
      <View style={[styles.metaRow, { marginTop: spacing.md }]}>
        <View style={styles.meta}>
          <Icon name="calendar" size={14} color={colors.muted} />
          <Text variant="caption" muted>
            {formatDate(booking.date)} · {formatTime(booking.time)}
          </Text>
        </View>
        <View style={styles.meta}>
          <Icon name={booking.mode === 'HOME' ? 'house' : 'building-2'} size={14} color={colors.muted} />
          <Text variant="caption" muted>
            {booking.mode === 'HOME' ? t('company.serviceMode.HOME') : t('company.serviceMode.ONSITE')}
          </Text>
        </View>
        {booking.isGift ? <Tag label={t('booking.giftTo')} tone="gold" appearance="tint" icon="gift" /> : null}
      </View>
      {!compact ? <BookingTimeline status={booking.status} /> : null}
      <View style={[styles.rowBetween, { marginTop: spacing.md }]}>
        <View>
          <Text variant="caption" muted>
            {t('common.total')}
          </Text>
          <Text variant="numeric" numeric weight="bold" color={colors.primary}>
            {formatMoney(booking.total)}
          </Text>
        </View>
        <View style={styles.actions}>
          {canCancel && onCancel ? <Button label={t('orders.cancel')} size="sm" variant="ghost" onPress={() => onCancel(booking)} /> : null}
          {canRate && onRate ? <Button label={t('orders.rate')} size="sm" variant="primary" leftIcon="star" onPress={() => onRate(booking)} /> : null}
          {booking.status === 'COMPLETED' && booking.companyRated ? <Tag label={t('orders.rated')} tone="success" appearance="tint" icon="check" /> : null}
          {(booking.status === 'COMPLETED' || booking.status === 'CANCELLED') && onRebook ? <Button label={t('orders.rebook')} size="sm" variant="soft" onPress={() => onRebook(booking)} /> : null}
        </View>
      </View>
    </Pressable>
  );
});

export const useSubscriptionProgress = (sub: Subscription) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    const totalDays = Math.max(1, dayjs(sub.endDate).diff(dayjs(sub.startDate), 'day'));
    const left = daysUntil(sub.endDate);
    const passed = Math.min(totalDays, Math.max(0, totalDays - left));
    return { totalDays, left, passed, ratio: passed / totalDays, sessionRatio: sub.totalSessions ? sub.usedSessions / sub.totalSessions : 0 };
  }, [sub]);
};

export const SubscriptionCard = React.memo(function SubscriptionCard({ sub, onPress }: { sub: Subscription; onPress?: (s: Subscription) => void }) {
  const { radii, shadows, spacing } = useTheme();
  const { t, localized, formatDate } = useI18n();
  const p = useSubscriptionProgress(sub);
  const expired = sub.status !== 'ACTIVE';
  return (
    <Pressable onPress={onPress ? () => onPress(sub) : undefined} style={({ pressed }) => [{ opacity: pressed ? 0.95 : expired ? 0.8 : 1 }]}>
      <LinearGradient colors={expired ? ['#6F625D', '#4A403C'] : [brand.maroonLight, brand.maroon, brand.maroonDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radii.card, padding: spacing.xl, overflow: 'hidden' }, shadows.elevated]}>
        <View style={styles.decor} />
        <View style={styles.subTop}>
          <RingProgress value={expired ? 1 : 1 - p.ratio} size={104} stroke={9}>
            <Text variant="numericLg" numeric color="#FFFFFF" style={{ fontSize: 30, lineHeight: 36 }}>
              {p.left}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.8)">
              {t('sub.daysLeft')}
            </Text>
          </RingProgress>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="caption" color="rgba(255,255,255,0.75)">
              {localized(sub.companyName)}
            </Text>
            <Text variant="h3" color="#FFFFFF" lines={2}>
              {localized(sub.serviceName)}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.85)">
              {localized(sub.planName)} · {t('sub.perWeek', { n: sub.sessionsPerWeek })}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.75)">
              {t('sub.validUntil', { date: formatDate(sub.endDate, 'long') })}
            </Text>
            <StatusPill status={sub.status} label={t(`subStatus.${sub.status}` as 'subStatus.ACTIVE')} />
          </View>
        </View>
        <View style={{ marginTop: spacing.lg, gap: 6 }}>
          <ProgressBar value={p.sessionRatio} color={brand.goldBright} track="rgba(255,255,255,0.18)" />
          <View style={styles.rowBetween}>
            <Text variant="caption" color="rgba(255,255,255,0.8)">
              {t('sub.sessions', { used: sub.usedSessions, total: sub.totalSessions })}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.8)">
              {t('sub.daysPassed', { passed: p.passed, total: p.totalDays })}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

export const GiftCard = React.memo(function GiftCard({ gift, direction, onPress }: { gift: Gift; direction: 'received' | 'sent'; onPress?: (g: Gift) => void }) {
  const { colors, radii, shadows, spacing } = useTheme();
  const { t, localized, formatRelative, formatMoney } = useI18n();
  const icon = gift.kind === 'POINTS' ? 'coins' : gift.kind === 'SERVICE' ? 'sparkles' : 'package';
  const who = direction === 'received' ? t('gifts.from', { name: gift.senderName }) : t('gifts.to', { name: gift.recipientName || gift.recipientPhone });
  const what = gift.kind === 'POINTS' ? t('gift.whatsapp.pointsItem', { points: gift.points ?? 0 }) : gift.itemName ? localized(gift.itemName) : '';
  return (
    <Pressable onPress={onPress ? () => onPress(gift) : undefined} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, opacity: pressed ? 0.95 : 1 }, shadows.card]}>
      <View style={styles.companyRow}>
        <View style={[styles.giftIcon, { backgroundColor: colors.goldTint }]}>
          <Icon name={icon} size={22} color={colors.gold} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" weight="semibold" lines={1}>
            {what}
          </Text>
          <Text variant="caption" muted lines={1}>
            {who}
            {gift.companyName ? ` · ${localized(gift.companyName)}` : ''}
          </Text>
          <Text variant="caption" color={colors.faint}>
            {formatRelative(gift.createdAt)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <StatusPill status={gift.status} label={t(`giftStatus.${gift.status}` as 'giftStatus.PENDING')} />
          {typeof gift.amount === 'number' && gift.kind !== 'POINTS' ? (
            <Text variant="bodySm" numeric weight="bold" color={colors.primary}>
              {formatMoney(gift.amount)}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {},
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  timeline: { flexDirection: 'row', marginTop: 14 },
  timelineStep: { flex: 1, alignItems: 'center', gap: 6 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginStart: '50%', transform: [{ translateX: -9 }] },
  line: { flex: 1, height: 2 },
  decor: { position: 'absolute', top: -60, start: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' },
  subTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  giftIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
