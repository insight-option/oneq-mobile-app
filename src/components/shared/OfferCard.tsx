import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import type { Company, Offer } from '@/domain/types';
import { useI18n } from '@/i18n';
import { Avatar, Button, PriceTag, RatingPill, Tag, Text } from '@/components/ui';

export interface HeroSlide {
  id: string;
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  badge: string;
  badgeTone: 'offer' | 'gold' | 'primary';
  companyName: string;
  companyLogo?: string | null;
  companyId: string;
  oldPrice?: number;
  newPrice?: number;
  rating?: number;
}

export const heroFromOffer = (o: Offer, localized: (t: Offer['title']) => string, badge: string): HeroSlide => ({
  id: `offer-${o.id}`,
  imageUrl: o.imageUrl,
  title: localized(o.title),
  badge,
  badgeTone: 'offer',
  companyName: localized(o.companyName),
  companyLogo: o.companyLogoUrl,
  companyId: o.companyId,
  oldPrice: o.oldPrice,
  newPrice: o.newPrice,
});

export const heroFromCompany = (c: Company, localized: (t: Company['name']) => string, badge: string, tone: 'gold' | 'primary'): HeroSlide => ({
  id: `company-${c.id}`,
  imageUrl: c.coverUrl ?? c.galleryUrls[0],
  title: localized(c.name),
  subtitle: c.tagline ? localized(c.tagline) : undefined,
  badge,
  badgeTone: tone,
  companyName: localized(c.name),
  companyLogo: c.logoUrl,
  companyId: c.id,
  rating: c.ratingAvg,
});

/** Full-width hero slide for the home carousel. */
export const HeroSlideCard = React.memo(function HeroSlideCard({ slide, onPress, ctaLabel }: { slide: HeroSlide; onPress: () => void; ctaLabel: string }) {
  const { radii, colors } = useTheme();
  const { formatMoney, t } = useI18n();
  return (
    <Pressable onPress={onPress} style={[styles.hero, { borderRadius: radii.media, backgroundColor: colors.primaryDeep }]}>
      {slide.imageUrl ? <Image source={{ uri: slide.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" recyclingKey={slide.id} /> : null}
      <LinearGradient colors={['rgba(42,0,15,0.05)', 'rgba(42,0,15,0.55)', 'rgba(42,0,15,0.92)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.heroTop}>
        <Tag label={slide.badge} tone={slide.badgeTone} icon={slide.badgeTone === 'offer' ? 'tag' : slide.badgeTone === 'gold' ? 'crown' : 'sparkles'} />
        {typeof slide.rating === 'number' ? <RatingPill value={slide.rating} light /> : null}
      </View>
      <View style={styles.heroBody}>
        <View style={styles.companyRow}>
          <Avatar uri={slide.companyLogo} name={slide.companyName} size={28} bordered />
          <Text variant="caption" color="rgba(255,255,255,0.85)" lines={1}>
            {slide.companyName}
          </Text>
        </View>
        <Text variant="h2" color="#FFFFFF" lines={2}>
          {slide.title}
        </Text>
        {slide.subtitle ? (
          <Text variant="bodySm" color="rgba(255,255,255,0.8)" lines={1}>
            {slide.subtitle}
          </Text>
        ) : null}
        <View style={styles.heroBottom}>
          {typeof slide.newPrice === 'number' && typeof slide.oldPrice === 'number' ? (
            <View style={styles.priceRow}>
              <Text variant="h3" numeric color="#FFFFFF">
                {formatMoney(slide.newPrice)}
              </Text>
              <Text variant="caption" numeric color="rgba(255,255,255,0.7)" style={styles.strike}>
                {formatMoney(slide.oldPrice)}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.7)">
                {t('home.hero.insteadOf')}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <Button label={ctaLabel} variant="cream" size="sm" onPress={onPress} rightIcon="arrow-left" />
        </View>
      </View>
    </Pressable>
  );
});

/** Horizontal offer row card (company page / home offers row). */
export const OfferRowCard = React.memo(function OfferRowCard({ offer, onPress, width = 260 }: { offer: Offer; onPress: () => void; width?: number }) {
  const { colors, radii, shadows } = useTheme();
  const { localized, t } = useI18n();
  return (
    <Pressable onPress={onPress} style={[styles.offerCard, { width, backgroundColor: colors.surface, borderRadius: radii.card }, shadows.card]}>
      <View style={[styles.offerImage, { backgroundColor: colors.surfaceAlt }]}>
        {offer.imageUrl ? <Image source={{ uri: offer.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={offer.id} /> : null}
        <Tag label={`${Math.round((1 - offer.newPrice / offer.oldPrice) * 100)}% ${t('common.discount')}`} tone="offer" style={styles.offerBadge} />
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <Text variant="title" weight="semibold" lines={1}>
          {localized(offer.title)}
        </Text>
        <Text variant="caption" muted lines={1}>
          {localized(offer.companyName)}
        </Text>
        <PriceTag price={offer.oldPrice} offerPrice={offer.newPrice} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hero: { flex: 1, overflow: 'hidden', justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  heroBody: { padding: 16, gap: 6 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
  offerCard: { overflow: 'hidden' },
  offerImage: { height: 120, width: '100%' },
  offerBadge: { position: 'absolute', top: 10, start: 10 },
});
