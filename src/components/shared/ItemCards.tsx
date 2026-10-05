import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import type { Product, Service, Staff, Weekday } from '@/domain/types';
import { useI18n } from '@/i18n';
import { Avatar, Button, Icon, PriceTag, RatingPill, Tag, Text } from '@/components/ui';

/** Service row: image thumb, name, duration, PriceTag, CTA/select state. */
export const ServiceRow = React.memo(function ServiceRow({ service, onPress, selected, ctaLabel, compact }: { service: Service; onPress?: (s: Service) => void; selected?: boolean; ctaLabel?: string; compact?: boolean }) {
  const { colors, radii, shadows } = useTheme();
  const { localized, t, formatDuration } = useI18n();
  return (
    <Pressable
      onPress={onPress ? () => onPress(service) : undefined}
      style={({ pressed }) => [styles.serviceRow, { backgroundColor: selected ? colors.tint : colors.surface, borderRadius: radii.md, borderColor: selected ? colors.primary : colors.line, borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth, opacity: pressed ? 0.92 : 1 }, shadows.card]}>
      <View style={[styles.serviceThumb, { backgroundColor: colors.surfaceAlt, borderRadius: radii.sm }]}>
        {service.imageUrl ? <Image source={{ uri: service.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={service.id} /> : <Icon name="sparkles" size={20} color={colors.faint} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.rowBetween}>
          <Text variant="title" weight="semibold" lines={1} style={{ flex: 1 }}>
            {localized(service.name)}
          </Text>
          {service.isOffer ? <Tag label={t('common.offer')} tone="offer" /> : null}
        </View>
        {!compact ? (
          <Text variant="caption" muted lines={2}>
            {localized(service.description)}
          </Text>
        ) : null}
        <View style={styles.rowBetween}>
          <View style={styles.meta}>
            <Icon name="clock" size={13} color={colors.muted} />
            <Text variant="caption" muted>
              {formatDuration(service.durationMin)}
            </Text>
            {service.allowSubscription ? <Tag label={t('booking.type.subscription')} tone="primary" appearance="tint" /> : null}
          </View>
          <PriceTag price={service.price} offerPrice={service.offerPrice} size="sm" align="end" />
        </View>
      </View>
      {ctaLabel && onPress ? <Button label={ctaLabel} size="sm" variant="soft" onPress={() => onPress(service)} /> : selected ? <Icon name="circle-check" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
});

export const ProductCard = React.memo(function ProductCard({ product, onPress, width, selected }: { product: Product; onPress?: (p: Product) => void; width?: number; selected?: boolean }) {
  const { colors, radii, shadows } = useTheme();
  const { localized, t } = useI18n();
  return (
    <Pressable onPress={onPress ? () => onPress(product) : undefined} style={({ pressed }) => [styles.product, { width, backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: selected ? 1.5 : 0, borderColor: colors.primary, opacity: pressed ? 0.92 : 1 }, shadows.card]}>
      <View style={[styles.productImage, { backgroundColor: colors.surfaceAlt }]}>
        {product.imageUrls[0] ? <Image source={{ uri: product.imageUrls[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={product.id} /> : <Icon name="package" size={28} color={colors.faint} />}
        {product.isOffer ? <Tag label={t('common.offer')} tone="offer" style={styles.badge} /> : null}
      </View>
      <View style={{ padding: 10, gap: 4 }}>
        <Text variant="bodySm" weight="semibold" lines={2}>
          {localized(product.name)}
        </Text>
        <PriceTag price={product.price} offerPrice={product.offerPrice} size="sm" />
      </View>
    </Pressable>
  );
});

export const StaffCard = React.memo(function StaffCard({ staff, onPress, width = 150, selected, compact }: { staff: Staff; onPress?: (s: Staff) => void; width?: number; selected?: boolean; compact?: boolean }) {
  const { colors, radii, shadows } = useTheme();
  const { localized, t } = useI18n();
  const today = new Date().getDay() as Weekday;
  const availableToday = staff.isAvailable && staff.availability[today]?.available;
  return (
    <Pressable onPress={onPress ? () => onPress(staff) : undefined} style={({ pressed }) => [styles.staff, { width, backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: selected ? 1.5 : 0, borderColor: colors.primary, opacity: pressed ? 0.92 : 1 }, shadows.card]}>
      <Avatar uri={staff.photoUrl} name={localized(staff.name)} size={compact ? 56 : 72} />
      <Text variant="title" weight="semibold" align="center" lines={1}>
        {localized(staff.name)}
      </Text>
      <Text variant="caption" muted align="center" lines={1}>
        {t(`staffTitle.${staff.title}` as 'staffTitle.doctor')} · {t('staff.experience', { years: staff.experienceYears })}
      </Text>
      <RatingPill value={staff.ratingAvg} count={staff.ratingCount} />
      <Tag label={availableToday ? t('staff.availableToday') : t('staff.unavailableToday')} tone={availableToday ? 'open' : 'neutral'} appearance="tint" />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  serviceThumb: { width: 64, height: 64, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  product: { overflow: 'hidden' },
  productImage: { aspectRatio: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 8, start: 8 },
  staff: { alignItems: 'center', gap: 6, padding: 12 },
});
