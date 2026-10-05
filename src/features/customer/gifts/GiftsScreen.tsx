import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState, Icon, Screen, SegmentedControl, SkeletonList, Text } from '@/components/ui';
import { GiftCard } from '@/components/shared';
import { useReceivedGifts, useSentGifts } from '@/data/hooks';
import type { Gift } from '@/domain/types';
import { useI18n } from '@/i18n';
import { requireAuth, useIsSignedIn } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

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
      <LinearGradient colors={[brand.maroon, brand.maroonDeep, '#8A4A1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { borderRadius: radii.media }, shadows.elevated]}>
        <View style={styles.heroDecor} />
        <View style={styles.heroIcon}>
          <Icon name="gift" size={34} color={brand.goldBright} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="h2" color="#FFFFFF">
            {t('gifts.hero.title')}
          </Text>
          <Text variant="bodySm" color="rgba(255,255,255,0.8)">
            {t('gifts.hero.body')}
          </Text>
          <Button label={t('gifts.hero.cta')} variant="cream" size="sm" leftIcon="send" onPress={startSend} style={{ marginTop: 6 }} />
        </View>
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
  heroDecor: { position: 'absolute', top: -60, end: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
});
