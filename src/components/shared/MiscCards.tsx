import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import type { AppNotification, LoyaltyAccount, LoyaltyTier, Review } from '@/domain/types';
import { useI18n } from '@/i18n';
import { Avatar, Icon, IconBubble, ProgressBar, RatingStars, Text, type IconName } from '@/components/ui';

export const TIER_THRESHOLDS: Record<LoyaltyTier, number> = { BRONZE: 0, SILVER: 500, GOLD: 1500, PLATINUM: 4000 };
export const tierColor = (tier: LoyaltyTier) => (tier === 'PLATINUM' ? '#8E9AAF' : tier === 'GOLD' ? brand.goldBright : tier === 'SILVER' ? '#C9CED6' : '#C07A4F');

export const LoyaltyCard = React.memo(function LoyaltyCard({ account, compact, onPress }: { account: LoyaltyAccount; compact?: boolean; onPress?: () => void }) {
  const { radii, shadows, spacing } = useTheme();
  const { t, formatNumber } = useI18n();
  const next = account.nextTierAt;
  const current = TIER_THRESHOLDS[account.tier];
  const ratio = next ? Math.min(1, (account.lifetimePoints - current) / Math.max(1, next - current)) : 1;
  const nextTier: LoyaltyTier | null = account.tier === 'BRONZE' ? 'SILVER' : account.tier === 'SILVER' ? 'GOLD' : account.tier === 'GOLD' ? 'PLATINUM' : null;
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <LinearGradient colors={[brand.maroon, brand.maroonDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radii.card, padding: compact ? spacing.lg : spacing.xl, overflow: 'hidden' }, shadows.elevated]}>
        <View style={styles.decor} />
        <View style={styles.rowBetween}>
          <View>
            <Text variant="caption" color="rgba(255,255,255,0.75)">
              {t('loyalty.balance')}
            </Text>
            <View style={styles.valueRow}>
              <Text variant="display" numeric color="#FFFFFF" style={{ fontSize: compact ? 30 : 38, lineHeight: compact ? 36 : 46 }}>
                {formatNumber(account.points)}
              </Text>
              <Text variant="bodySm" color="rgba(255,255,255,0.8)">
                {t('loyalty.points')}
              </Text>
            </View>
          </View>
          <View style={[styles.tier, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
            <Icon name="crown" size={16} color={tierColor(account.tier)} />
            <Text variant="caption" weight="bold" color="#FFFFFF">
              {t(`tier.${account.tier}` as 'tier.GOLD')}
            </Text>
          </View>
        </View>
        {!compact ? (
          <View style={{ marginTop: spacing.lg, gap: 6 }}>
            <ProgressBar value={ratio} color={brand.goldBright} track="rgba(255,255,255,0.18)" />
            <Text variant="caption" color="rgba(255,255,255,0.8)">
              {next && nextTier ? t('loyalty.nextTier', { points: formatNumber(Math.max(0, next - account.lifetimePoints)), tier: t(`tier.${nextTier}` as 'tier.GOLD') }) : t('loyalty.maxTier')}
            </Text>
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
});

const notifIcon: Record<AppNotification['type'], IconName> = {
  OFFER: 'tag',
  NEW_SERVICE: 'sparkles',
  NEW_PRODUCT: 'package',
  CATALOG_UPDATED: 'refresh-cw',
  BOOKING: 'calendar-check',
  GIFT: 'gift',
  POINTS: 'coins',
  SUBSCRIPTION: 'repeat',
  REVIEW: 'star',
  COMPANY: 'store',
  SYSTEM: 'bell',
};

export const NotificationRow = React.memo(function NotificationRow({ item, onPress }: { item: AppNotification; onPress: (n: AppNotification) => void }) {
  const { colors, spacing, radii } = useTheme();
  const { localized, formatRelative } = useI18n();
  return (
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.notif, { backgroundColor: item.read ? colors.surface : colors.tint, borderRadius: radii.md, padding: spacing.md, opacity: pressed ? 0.9 : 1 }]}>
      <IconBubble name={notifIcon[item.type]} size={44} background={item.read ? colors.surfaceAlt : colors.surface} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySm" weight={item.read ? 'medium' : 'bold'} lines={2}>
          {localized(item.title)}
        </Text>
        <Text variant="caption" muted lines={2}>
          {localized(item.body)}
        </Text>
        <Text variant="caption" color={colors.faint}>
          {formatRelative(item.createdAt)}
        </Text>
      </View>
      {!item.read ? <View style={[styles.unread, { backgroundColor: colors.primary }]} /> : null}
    </Pressable>
  );
});

export const ReviewCard = React.memo(function ReviewCard({ review, onReply, replyLabel, yourReplyLabel }: { review: Review; onReply?: (r: Review) => void; replyLabel?: string; yourReplyLabel?: string }) {
  const { colors, spacing } = useTheme();
  const { formatRelative } = useI18n();
  return (
    <View style={[styles.review, { borderBottomColor: colors.line, paddingVertical: spacing.md }]}>
      <View style={styles.rowBetween}>
        <View style={styles.rowStart}>
          <Avatar name={review.customerName} size={40} />
          <View>
            <Text variant="title" weight="semibold">
              {review.customerName}
            </Text>
            <RatingStars value={review.rating} size={13} />
          </View>
        </View>
        <Text variant="caption" color={colors.faint}>
          {formatRelative(review.createdAt)}
        </Text>
      </View>
      {review.comment ? (
        <Text variant="bodySm" style={{ marginTop: 8 }}>
          {review.comment}
        </Text>
      ) : null}
      {review.reply ? (
        <View style={[styles.reply, { backgroundColor: colors.surfaceAlt, borderStartColor: colors.primary }]}>
          <Text variant="caption" weight="bold" color={colors.primary}>
            {yourReplyLabel}
          </Text>
          <Text variant="bodySm">{review.reply.text}</Text>
        </View>
      ) : onReply && replyLabel ? (
        <Pressable onPress={() => onReply(review)} style={styles.replyBtn}>
          <Icon name="message-circle-more" size={16} color={colors.primary} />
          <Text variant="bodySm" weight="semibold" color={colors.primary}>
            {replyLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

export const RatingSummary = ({ avg, count, distribution, basedOnLabel }: { avg: number; count: number; distribution: Record<1 | 2 | 3 | 4 | 5, number>; basedOnLabel: string }) => {
  const { colors } = useTheme();
  const total = Math.max(1, count);
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.rowStart}>
        <Text variant="display" numeric style={{ fontSize: 48, lineHeight: 56 }}>
          {avg.toFixed(1)}
        </Text>
        <View style={{ gap: 4 }}>
          <RatingStars value={avg} size={18} />
          <Text variant="caption" muted>
            {basedOnLabel}
          </Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {([5, 4, 3, 2, 1] as const).map((star) => (
          <View key={star} style={styles.rowStart}>
            <Text variant="caption" numeric muted style={{ width: 14 }}>
              {star}
            </Text>
            <View style={{ flex: 1 }}>
              <ProgressBar value={(distribution[star] ?? 0) / total} height={8} color={colors.gold} />
            </View>
            <Text variant="caption" numeric weight="semibold" style={{ width: 32, textAlign: 'right' }}>
              {distribution[star] ?? 0}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowStart: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 16 },
  decor: { position: 'absolute', top: -80, end: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.06)' },
  notif: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unread: { width: 8, height: 8, borderRadius: 4 },
  review: { borderBottomWidth: StyleSheet.hairlineWidth },
  reply: { marginTop: 10, padding: 10, borderRadius: 10, borderStartWidth: 3, gap: 2 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-end' },
});
