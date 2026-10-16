import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState, PremiumGlyph, Screen, SegmentedControl, SkeletonList, Text } from '@/components/ui';
import { GiftCard } from '@/components/shared';
import { useReceivedGifts, useSentGifts } from '@/data/hooks';
import type { Gift } from '@/domain/types';
import { useI18n } from '@/i18n';
import { requireAuth, useIsSignedIn } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

const GOLD_FOIL = ['#F7E2B4', '#C38A3D', '#F3D79C', '#9E6527'] as const;

export const GiftsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { colors, spacing, radii, shadows } = useTheme();
  const signedIn = useIsSignedIn();
  const received = useReceivedGifts();
  const sent = useSentGifts();
  const [segment, setSegment] = useState<'received' | 'sent'>('received');
  const data = segment === 'received' ? received.data ?? [] : sent.data ?? [];
  const query = segment === 'received' ? received : sent;

  const startSend = async () => {
    if (!(await requireAuth('gift'))) return;
    router.push('/(customer)/gift/send' as never);
  };

  const header = (
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: spacing.gutter, gap: spacing.lg, paddingBottom: spacing.md }}>
      <Text variant="h1">{t('gifts.title')}</Text>
      {/* gold foil edge around the maroon hero, gift glyph drawn without any background */}
      <LinearGradient colors={GOLD_FOIL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radii.media, padding: 1.5 }, shadows.elevated]}>
        <LinearGradient colors={['#84213F', brand.maroon, '#2E0010']} locations={[0, 0.55, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.hero, { borderRadius: radii.media - 1.5 }]}>
          <View style={styles.heroDecor} />
          <PremiumGlyph name="gift" size={68} tone="light" />
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="h2" color="#FFFFFF">
              {t('gifts.hero.title')}
            </Text>
            <Text variant="bodySm" color="rgba(255,255,255,0.8)">
              {t('gifts.hero.body')}
            </Text>
            <Button label={t('gifts.hero.cta')} variant="cream" size="sm" leftIcon="send" onPress={startSend} style={{ marginTop: 6, alignSelf: 'flex-start' }} />
          </View>
        </LinearGradient>
      </LinearGradient>
      <SegmentedControl
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'received', label: t('gifts.received'), count: received.data?.length },
          { value: 'sent', label: t('gifts.sent'), count: sent.data?.length },
        ]}
      />
    </View>
  );

  return (
    <Screen mode="fixed" edges={[]} background={colors.canvas}>
      <FlashList<Gift>
        data={signedIn ? data : []}
        keyExtractor={(g) => g.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.md }}>
            <GiftCard gift={item} direction={segment} onPress={(g) => router.push(`/(customer)/gift/${g.id}` as never)} />
          </View>
        )}
        ListEmptyComponent={
          !signedIn ? (
            <EmptyState icon="log-in" title={t('auth.gate.gift')} body={t('orders.guestBody')} actionLabel={t('common.signIn')} onAction={() => void requireAuth('gift')} />
          ) : query.isLoading ? (
            <SkeletonList rows={3} />
          ) : (
            <EmptyState icon="gift" title={t('gifts.empty')} body={segment === 'received' ? t('gifts.emptyReceivedBody') : t('gifts.emptySentBody')} actionLabel={t('gifts.hero.cta')} onAction={startSend} />
          )
        }
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        onRefresh={() => query.refetch()}
        refreshing={query.isRefetching}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, overflow: 'hidden' },
  heroDecor: { position: 'absolute', top: -70, end: -50, width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(233,194,122,0.2)' },
});
