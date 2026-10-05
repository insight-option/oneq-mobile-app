import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import type { Company } from '@/domain/types';
import { useI18n } from '@/i18n';
import { isOpenNow } from '@/lib/time';
import { haptic } from '@/lib/haptics';
import { Button, Icon, IconButton, PriceTag, RatingPill, Tag, Text } from '@/components/ui';

export interface CompanyCardProps {
  company: Company;
  subcategoryLabel?: string;
  onPress: (company: Company) => void;
  onBook?: (company: Company) => void;
  onToggleFavorite?: (company: Company) => void;
  isFavorite?: boolean;
  /** horizontal list variant uses a fixed width */
  width?: number;
  style?: StyleProp<ViewStyle>;
  showDistance?: boolean;
}

const BLUR = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

/** Link-1 company card: image with tag chips + open pill, name + rating, subcategory chip, area + staff, price + CTA. */
export const CompanyCard = React.memo(function CompanyCard({ company, subcategoryLabel, onPress, onBook, onToggleFavorite, isFavorite, width, style, showDistance }: CompanyCardProps) {
  const { colors, radii, shadows, spacing } = useTheme();
  const { t, localized, areaName, formatDistance } = useI18n();
  const open = useMemo(() => isOpenNow(company.openingHours), [company.openingHours]);
  const cover = company.coverUrl ?? company.galleryUrls[0] ?? null;
  const tags = company.tags.slice(0, 3);
  const staffLabel =
    company.categoryId === 'cat_clinics' ? t('company.doctorsCount', { count: company.staffCount }) : company.categoryId === 'cat_gyms' ? t('company.trainersCount', { count: company.staffCount }) : t('company.employeesCount', { count: company.staffCount });

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(company);
      }}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderRadius: radii.card, width, opacity: pressed ? 0.96 : 1 }, shadows.card, style]}>
      <View style={[styles.cover, { backgroundColor: colors.surfaceAlt }]}>
        {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" recyclingKey={company.id} placeholder={{ blurhash: BLUR }} placeholderContentFit="cover" /> : null}
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <Tag
              key={tag}
              label={tag === 'featured' ? t('tag.featured') : tag === 'studentDiscount' ? t('tag.studentDiscount') : tag === 'specialOffer' ? t('tag.specialOffer') : tag === 'insurance' ? t('tag.insurance') : tag === 'premium' ? t('tag.premium') : t('tag.new')}
              tone={tag === 'featured' ? 'featured' : tag === 'studentDiscount' ? 'student' : tag === 'specialOffer' ? 'offer' : tag === 'insurance' ? 'insurance' : tag === 'premium' ? 'dark' : 'primary'}
              icon={tag === 'featured' ? 'sparkles' : tag === 'specialOffer' ? 'tag' : tag === 'insurance' ? 'shield' : undefined}
            />
          ))}
        </View>
        <View style={styles.coverBottom}>
          <Tag label={open ? t('common.open') : t('common.closed')} tone={open ? 'open' : 'closed'} icon={undefined} />
          <Tag label={company.serviceMode === 'HOME' ? t('company.serviceMode.HOME') : company.serviceMode === 'BOTH' ? t('company.serviceMode.BOTH') : t('company.serviceMode.ONSITE')} tone="light" icon={company.serviceMode === 'ONSITE' ? 'building-2' : 'house'} />
        </View>
        {onToggleFavorite ? (
          <IconButton name="heart" variant="glass" size={36} iconSize={18} color={isFavorite ? '#FF6B8A' : '#FFFFFF'} onPress={() => onToggleFavorite(company)} style={styles.heart} accessibilityLabel="favorite" />
        ) : null}
      </View>
      <View style={{ padding: spacing.md, gap: 6 }}>
        <View style={styles.titleRow}>
          <Text variant="title" weight="bold" style={{ flex: 1 }} lines={1}>
            {localized(company.name)}
          </Text>
          <RatingPill value={company.ratingAvg} count={company.ratingCount} />
        </View>
        {subcategoryLabel ? <Tag label={subcategoryLabel} tone="primary" appearance="tint" /> : null}
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Icon name="map-pin" size={14} color={colors.muted} />
            <Text variant="caption" muted>
              {showDistance && typeof company.distanceKm === 'number' ? `${formatDistance(company.distanceKm)} · ${areaName(company.area)}` : areaName(company.area)}
            </Text>
          </View>
          {company.staffCount > 0 ? (
            <View style={styles.meta}>
              <Icon name="users" size={14} color={colors.muted} />
              <Text variant="caption" muted>
                {staffLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.priceRow, { borderTopColor: colors.line }]}>
          {typeof company.priceFrom === 'number' ? <PriceTag price={company.priceFrom} prefix={t('company.priceFrom')} /> : <View />}
          {onBook ? <Button label={t('home.bookNow')} size="sm" variant="soft" onPress={() => onBook(company)} /> : null}
        </View>
      </View>
    </Pressable>
  );
});

/** Compact row for lists (map sheet, nearest). */
export const CompanyListRow = React.memo(function CompanyListRow({ company, onPress, subcategoryLabel, selected }: { company: Company; onPress: (c: Company) => void; subcategoryLabel?: string; selected?: boolean }) {
  const { colors, radii, spacing } = useTheme();
  const { t, localized, areaName, formatDistance } = useI18n();
  const open = isOpenNow(company.openingHours);
  const cover = company.logoUrl ?? company.coverUrl ?? company.galleryUrls[0] ?? null;
  return (
    <Pressable onPress={() => onPress(company)} style={({ pressed }) => [styles.row, { backgroundColor: selected ? colors.tint : pressed ? colors.surfaceAlt : colors.surface, borderRadius: radii.md, padding: spacing.sm, gap: spacing.md }]}>
      <View style={[styles.thumb, { borderRadius: radii.sm, backgroundColor: colors.surfaceAlt }]}>
        {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={company.id} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" weight="semibold" lines={1}>
          {localized(company.name)}
        </Text>
        <Text variant="caption" muted lines={1}>
          {[subcategoryLabel, typeof company.distanceKm === 'number' ? formatDistance(company.distanceKm) : null, areaName(company.area)].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.meta}>
          <RatingPill value={company.ratingAvg} />
          <Tag label={open ? t('common.open') : t('common.closed')} tone={open ? 'open' : 'closed'} appearance="tint" />
        </View>
      </View>
      <Icon name="chevron-left" size={18} color={colors.faint} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  cover: { height: 150, width: '100%' },
  tagsRow: { position: 'absolute', top: 10, start: 10, end: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  coverBottom: { position: 'absolute', bottom: 10, start: 10, end: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heart: { position: 'absolute', top: 10, end: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 64, height: 64, overflow: 'hidden' },
});
