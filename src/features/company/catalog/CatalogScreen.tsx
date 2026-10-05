import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BottomSheet, Button, Card, DateStrip, EmptyState, FAB, Icon, Input, PriceTag, SegmentedControl, SkeletonList, Switch, Tag, Text, toast, type BottomSheetRef } from '@/components/ui';
import { useMyCompany, useOffers, useProducts, useServices, useSetProductOffer, useSetServiceOffer, useUpsertProduct, useUpsertService } from '@/data/hooks';
import type { Product, Service } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { CompanyHeader } from '../shell/CompanyShell';

type Segment = 'services' | 'products' | 'offers';
type OfferTarget = { type: 'service'; item: Service } | { type: 'product'; item: Product };

export const OfferSheet = ({ sheetRef, target, onDone }: { sheetRef: React.RefObject<BottomSheetRef | null>; target: OfferTarget | null; onDone: () => void }) => {
  const { t, localized, formatMoney } = useI18n();
  const { colors, spacing } = useTheme();
  const setServiceOffer = useSetServiceOffer();
  const setProductOffer = useSetProductOffer();
  const [price, setPrice] = useState('');
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const pending = setServiceOffer.isPending || setProductOffer.isPending;
  const current = target?.item.price ?? 0;

  const apply = async () => {
    const value = Number(price);
    if (!target || !Number.isFinite(value) || value <= 0 || value >= current) {
      toast.error(t('cw.catalog.offerInvalid'));
      return;
    }
    try {
      const offer = { offerPrice: value, endsAt: endsAt ? `${endsAt}T23:59:59.000Z` : null };
      if (target.type === 'service') await setServiceOffer.mutateAsync({ id: target.item.id, offer });
      else await setProductOffer.mutateAsync({ id: target.item.id, offer });
      toast.success(t('cw.catalog.offerPublished'));
      setPrice('');
      setEndsAt(null);
      onDone();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <BottomSheet ref={sheetRef} title={t('cw.catalog.setOffer')}>
      {target ? (
        <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
          <Text variant="title" weight="bold">
            {localized(target.item.name)}
          </Text>
          <View style={styles.row}>
            <Text variant="bodySm" muted>
              {t('cw.catalog.oldPrice')}
            </Text>
            <Text variant="bodySm" numeric weight="bold" style={{ textDecorationLine: 'line-through' }} color={colors.faint}>
              {formatMoney(current)}
            </Text>
          </View>
          <Input label={t('cw.catalog.offerPrice')} value={price} onChangeText={(v) => setPrice(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" numeric ltr leftIcon="tag" autoFocus />
          <Text variant="bodySm" weight="semibold">
            {t('cw.catalog.offerEnds')}
          </Text>
          <View style={{ marginHorizontal: -spacing.gutter }}>
            <DateStrip value={endsAt} onChange={setEndsAt} days={30} startOffset={1} />
          </View>
          <Text variant="caption" muted>
            {endsAt ? endsAt : t('cw.catalog.offerNoEnd')}
          </Text>
          <Button label={t('cw.catalog.setOffer')} size="lg" fullWidth leftIcon="tag" loading={pending} onPress={apply} />
        </View>
      ) : null}
    </BottomSheet>
  );
};

export const CatalogScreen = () => {
  const router = useRouter();
  const { t, localized, formatDuration } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const company = useMyCompany();
  const companyId = company.data?.id;
  const services = useServices(companyId);
  const products = useProducts(companyId);
  const offers = useOffers();
  const upsertService = useUpsertService();
  const upsertProduct = useUpsertProduct();
  const setServiceOffer = useSetServiceOffer();
  const setProductOffer = useSetProductOffer();
  const [segment, setSegment] = useState<Segment>('services');
  const offerSheet = useRef<BottomSheetRef>(null);
  const [target, setTarget] = useState<OfferTarget | null>(null);
  const companyOffers = useMemo(() => (offers.data ?? []).filter((o) => o.companyId === companyId), [offers.data, companyId]);

  const openOffer = (tg: OfferTarget) => {
    setTarget(tg);
    offerSheet.current?.open();
  };
  const removeOffer = async (tg: OfferTarget) => {
    try {
      if (tg.type === 'service') await setServiceOffer.mutateAsync({ id: tg.item.id, offer: null });
      else await setProductOffer.mutateAsync({ id: tg.item.id, offer: null });
      toast.success(t('cw.catalog.offerRemoved'));
    } catch {
      toast.error(t('common.error'));
    }
  };
  const toggleService = (s: Service, isActive: boolean) => upsertService.mutateAsync({ ...s, isActive }).catch(() => toast.error(t('common.error')));
  const toggleProduct = (p: Product, isActive: boolean) => upsertProduct.mutateAsync({ ...p, isActive }).catch(() => toast.error(t('common.error')));

  const header = (
    <View style={{ padding: spacing.gutter, gap: spacing.md }}>
      <View>
        <Text variant="h1">{t('cw.catalog.title')}</Text>
        <Text variant="bodySm" muted>
          {t('cw.catalog.subtitle')}
        </Text>
      </View>
      <SegmentedControl
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'services', label: t('cw.catalog.services'), count: services.data?.length },
          { value: 'products', label: t('cw.catalog.products'), count: products.data?.length },
          { value: 'offers', label: t('cw.catalog.offers'), count: companyOffers.length },
        ]}
      />
    </View>
  );

  const renderService = (s: Service) => (
    <Card padding={spacing.md} style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: colors.surfaceAlt, borderRadius: radii.sm }]}>{s.imageUrl ? <Image source={{ uri: s.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : <Icon name="sparkles" size={20} color={colors.faint} />}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.row}>
            <Text variant="title" weight="semibold" lines={1} style={{ flex: 1 }}>
              {localized(s.name)}
            </Text>
            {s.isOffer ? <Tag label={t('common.offer')} tone="offer" /> : null}
          </View>
          <Text variant="caption" muted>
            {formatDuration(s.durationMin)}
            {s.allowSubscription ? ` · ${t('booking.type.subscription')}` : ''}
            {s.requiresStaff ? ` · ${t('cw.service.form.requiresStaff')}` : ''}
          </Text>
        </View>
        <PriceTag price={s.price} offerPrice={s.offerPrice} align="end" />
      </View>
      <View style={[styles.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: spacing.sm }]}>
        <View style={styles.row}>
          <Switch value={s.isActive} onValueChange={(v) => void toggleService(s, v)} size="sm" />
          <Text variant="caption" muted>
            {t('cw.catalog.visible')}
          </Text>
        </View>
        <View style={styles.row}>
          <Button label={t('common.edit')} size="sm" variant="outline" leftIcon="pencil" onPress={() => router.push(`/(company)/service/${s.id}` as never)} />
          {s.isOffer ? <Button label={t('cw.catalog.removeOffer')} size="sm" variant="ghost" onPress={() => removeOffer({ type: 'service', item: s })} /> : <Button label={t('cw.catalog.setOffer')} size="sm" variant="soft" leftIcon="tag" onPress={() => openOffer({ type: 'service', item: s })} />}
        </View>
      </View>
    </Card>
  );

  const renderProduct = (p: Product) => (
    <Card padding={spacing.md} style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: colors.surfaceAlt, borderRadius: radii.sm }]}>{p.imageUrls[0] ? <Image source={{ uri: p.imageUrls[0] }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : <Icon name="package" size={20} color={colors.faint} />}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.row}>
            <Text variant="title" weight="semibold" lines={1} style={{ flex: 1 }}>
              {localized(p.name)}
            </Text>
            {p.isOffer ? <Tag label={t('common.offer')} tone="offer" /> : null}
          </View>
          <Text variant="caption" muted>
            {t('cw.product.form.stock')}: {p.stock ?? '—'} · {p.salesCount} {t('common.item')}
          </Text>
        </View>
        <PriceTag price={p.price} offerPrice={p.offerPrice} align="end" />
      </View>
      <View style={[styles.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: spacing.sm }]}>
        <View style={styles.row}>
          <Switch value={p.isActive} onValueChange={(v) => void toggleProduct(p, v)} size="sm" />
          <Text variant="caption" muted>
            {t('cw.catalog.visible')}
          </Text>
        </View>
        <View style={styles.row}>
          <Button label={t('common.edit')} size="sm" variant="outline" leftIcon="pencil" onPress={() => router.push(`/(company)/product/${p.id}` as never)} />
          {p.isOffer ? <Button label={t('cw.catalog.removeOffer')} size="sm" variant="ghost" onPress={() => removeOffer({ type: 'product', item: p })} /> : <Button label={t('cw.catalog.setOffer')} size="sm" variant="soft" leftIcon="tag" onPress={() => openOffer({ type: 'product', item: p })} />}
        </View>
      </View>
    </Card>
  );

  const data: (Service | Product)[] = segment === 'services' ? services.data ?? [] : segment === 'products' ? products.data ?? [] : [...(services.data ?? []).filter((s) => s.isOffer), ...(products.data ?? []).filter((p) => p.isOffer)];
  const isLoading = services.isLoading || products.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <CompanyHeader />
      <FlashList<Service | Product>
        data={data}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.md }}>{'durationMin' in item ? renderService(item) : renderProduct(item)}</View>}
        ListEmptyComponent={isLoading ? <SkeletonList rows={3} /> : <EmptyState icon={segment === 'offers' ? 'tag' : segment === 'products' ? 'package' : 'sparkles'} title={segment === 'services' ? t('cw.catalog.emptyServices') : segment === 'products' ? t('cw.catalog.emptyProducts') : t('cw.catalog.emptyOffers')} body={segment !== 'offers' ? t('cw.catalog.emptyBody') : undefined} actionLabel={segment === 'services' ? t('cw.catalog.addService') : segment === 'products' ? t('cw.catalog.addProduct') : undefined} onAction={() => router.push((segment === 'products' ? '/(company)/product/new' : '/(company)/service/new') as never)} />}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      />
      {segment !== 'offers' ? <FAB label={segment === 'services' ? t('cw.catalog.addService') : t('cw.catalog.addProduct')} bottomOffset={64} onPress={() => router.push((segment === 'products' ? '/(company)/product/new' : '/(company)/service/new') as never)} /> : null}
      <OfferSheet sheetRef={offerSheet} target={target} onDone={() => offerSheet.current?.close()} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 56, height: 56, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
