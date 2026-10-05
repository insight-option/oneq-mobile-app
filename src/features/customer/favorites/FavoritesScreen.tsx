import React from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { EmptyState, Header, Screen, SkeletonCard } from '@/components/ui';
import { CompanyCard } from '@/components/shared';
import { useFavorites } from '@/data/hooks';
import type { Company } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { useCompanyActions } from '../catalog/useCatalogHelpers';

export const FavoritesScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const favorites = useFavorites();
  const actions = useCompanyActions();
  return (
    <Screen mode="fixed" edges={[]} background={colors.canvas}>
      <Header title={t('favorites.title')} variant="maroon" compact />
      <FlashList<Company>
        data={favorites.data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.lg }}>
            <CompanyCard company={item} subcategoryLabel={actions.subcategoryLabel(item)} onPress={actions.openCompany} onBook={actions.book} onToggleFavorite={actions.favorite} isFavorite />
          </View>
        )}
        ListEmptyComponent={favorites.isLoading ? <View style={{ padding: spacing.gutter }}><SkeletonCard /></View> : <EmptyState icon="heart" title={t('favorites.empty')} body={t('favorites.emptyBody')} actionLabel={t('orders.browse')} onAction={() => router.replace('/(customer)/(tabs)' as never)} />}
        contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        onRefresh={() => favorites.refetch()}
        refreshing={favorites.isRefetching}
      />
    </Screen>
  );
};
