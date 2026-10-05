import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { toast } from '@/components/ui';
import { useCategories, useMe, useToggleFavorite } from '@/data/hooks';
import type { Company, CompanySort } from '@/domain/types';
import { useI18n, type TKey } from '@/i18n';
import { requireAuth } from '@/store/session';

export const SORT_OPTIONS: { value: CompanySort; key: TKey }[] = [
  { value: 'nearest', key: 'sort.nearest' },
  { value: 'openNow', key: 'sort.openNow' },
  { value: 'topRated', key: 'sort.topRated' },
  { value: 'cheapest', key: 'sort.cheapest' },
  { value: 'hasOffer', key: 'sort.hasOffer' },
  { value: 'mostBooked', key: 'sort.mostBooked' },
];

/** Shared handlers for company lists: open, book (gated), favourite (gated), subcategory label. */
export const useCompanyActions = () => {
  const router = useRouter();
  const { t, localized } = useI18n();
  const categories = useCategories();
  const me = useMe();
  const toggle = useToggleFavorite();

  const openCompany = useCallback((c: Company) => router.push(`/(customer)/company/${c.id}` as never), [router]);
  const book = useCallback(
    async (c: Company) => {
      if (!(await requireAuth('book'))) return;
      router.push(`/(customer)/booking/${c.id}` as never);
    },
    [router],
  );
  const favorite = useCallback(
    async (c: Company) => {
      if (!(await requireAuth('favorite'))) return;
      const added = await toggle.mutateAsync(c.id);
      toast.success(added ? t('company.favoriteAdded') : t('company.favoriteRemoved'));
    },
    [toggle, t],
  );
  const subcategoryLabel = useCallback(
    (c: Company) => {
      const cat = categories.data?.find((x) => x.id === c.categoryId);
      const sub = cat?.subcategories.find((s) => c.subcategoryIds.includes(s.id));
      return sub ? localized(sub.name) : cat ? localized(cat.name) : undefined;
    },
    [categories.data, localized],
  );
  return { openCompany, book, favorite, subcategoryLabel, favorites: me.data?.favorites ?? [], categories: categories.data ?? [] };
};
