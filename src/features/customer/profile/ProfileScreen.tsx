import React, { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, BottomSheet, Button, Card, ConfirmContent, ListRow, Text, type BottomSheetRef, type IconName } from '@/components/ui';
import { LoyaltyCard } from '@/components/shared';
import { repo } from '@/data';
import { useLoyalty, useMe, useMyBookings } from '@/data/hooks';
import { useI18n } from '@/i18n';
import { formatPhone } from '@/lib/phone';
import { queryClient } from '@/lib/query';
import { requireAuth, useSession, useSessionStore } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

export const ProfileScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, formatNumber } = useI18n();
  const { colors, spacing, radii, shadows } = useTheme();
  const session = useSession();
  const me = useMe();
  const loyalty = useLoyalty();
  const bookings = useMyBookings();
  const logoutRef = useRef<BottomSheetRef>(null);
  const signedIn = Boolean(session);

  const menu: { icon: IconName; label: string; route?: string; onPress?: () => void; gated?: boolean }[] = [
    { icon: 'user', label: t('profile.menu.profile'), route: '/(customer)/edit-profile', gated: true },
    { icon: 'calendar-check', label: t('profile.menu.orders'), route: '/(customer)/(tabs)/orders' },
    { icon: 'heart', label: t('profile.menu.favorites'), route: '/(customer)/favorites', gated: true },
    { icon: 'bell', label: t('profile.menu.notifications'), route: '/(customer)/notifications' },
    { icon: 'coins', label: t('profile.menu.points'), route: '/(customer)/loyalty', gated: true },
    { icon: 'map-pin', label: t('profile.menu.addresses'), route: '/(customer)/addresses', gated: true },
    { icon: 'languages', label: t('profile.menu.language'), route: '/(customer)/language' },
    { icon: 'settings', label: t('profile.menu.settings'), route: '/(customer)/settings' },
    { icon: 'circle-help', label: t('profile.menu.help'), route: '/(customer)/help' },
    { icon: 'shield-check', label: t('profile.menu.privacy'), route: '/(customer)/privacy' },
  ];

  const signOut = async () => {
    logoutRef.current?.close();
    await repo.auth.signOut();
    useSessionStore.getState().setSession(null);
    queryClient.clear();
    router.replace('/(auth)/welcome' as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={[brand.maroonLight, brand.maroon, brand.maroonDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 24, borderBottomStartRadius: radii.sheet, borderBottomEndRadius: radii.sheet }]}>
          <Avatar uri={me.data?.avatarUrl} name={session?.name ?? 'G'} size={88} bordered />
          <Text variant="h1" color="#FFFFFF" align="center">
            {session?.name ?? t('profile.guest')}
          </Text>
          <Text variant="bodySm" color="rgba(255,255,255,0.78)" align="center">
            {signedIn ? [session?.phone ? formatPhone(session.phone) : null, session?.email].filter(Boolean).join(' · ') : t('profile.guestMode')}
          </Text>
          {!signedIn ? <Button label={t('profile.signIn')} variant="glass" size="sm" onPress={() => router.push('/(auth)/welcome' as never)} style={{ marginTop: 4 }} /> : null}
        </LinearGradient>
        <View style={{ paddingHorizontal: spacing.gutter, marginTop: -26, gap: spacing.lg }}>
          <Card style={styles.stats} shadow="elevated">
            {[
              { label: t('profile.stats.bookings'), value: bookings.data?.length ?? 0 },
              { label: t('profile.stats.favorites'), value: me.data?.favorites.length ?? 0 },
              { label: t('profile.stats.reviews'), value: bookings.data?.filter((b) => b.companyRated).length ?? 0 },
            ].map((s, i) => (
              <View key={s.label} style={[styles.stat, i > 0 ? { borderStartWidth: StyleSheet.hairlineWidth, borderStartColor: colors.line } : null]}>
                <Text variant="h2" numeric>
                  {formatNumber(s.value)}
                </Text>
                <Text variant="caption" muted>
                  {s.label}
                </Text>
              </View>
            ))}
          </Card>
          {signedIn && loyalty.data ? <LoyaltyCard account={loyalty.data} compact onPress={() => router.push('/(customer)/loyalty' as never)} /> : null}
          <Card padding={0} style={shadows.card}>
            {menu.map((item, i) => (
              <ListRow
                key={item.label}
                icon={item.icon}
                title={item.label}
                divider={i < menu.length - 1}
                onPress={async () => {
                  if (item.gated && !(await requireAuth('generic'))) return;
                  if (item.route) router.push(item.route as never);
                }}
              />
            ))}
            {signedIn ? <ListRow icon="log-out" title={t('profile.menu.logout')} danger chevron={false} onPress={() => logoutRef.current?.open()} /> : null}
          </Card>
        </View>
      </ScrollView>
      <BottomSheet ref={logoutRef}>
        <ConfirmContent title={t('profile.logoutConfirm')} body={t('profile.logoutBody')} confirmLabel={t('profile.menu.logout')} cancelLabel={t('common.cancel')} danger onConfirm={signOut} onCancel={() => logoutRef.current?.close()} />
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 8, paddingBottom: 48, paddingHorizontal: 16 },
  stats: { flexDirection: 'row', paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
});
