import React, { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { Button, Card, Icon, Text } from '@/components/ui';
import { useBooking } from '@/data/hooks';
import { useI18n } from '@/i18n';
import { useBookingDraft } from '@/store/bookingDraft';
import { useTheme } from '@/theme/ThemeProvider';

export const BookingSuccessScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, localized, formatDate, formatTime, formatMoney } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const result = useBookingDraft((s) => s.lastResult);
  const booking = useBooking(id);
  const b = booking.data ?? result?.booking ?? null;
  const scale = useSharedValue(0.4);
  const fade = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 160 });
    fade.value = withDelay(250, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [scale, fade]);
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const body = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: (1 - fade.value) * 16 }] }));
  const whatsappUrl = result?.whatsappUrl ?? null;
  const title = result?.gift ? t('booking.success.giftTitle') : result?.subscription ? t('booking.success.subTitle') : t('booking.success.title');

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top + 40, paddingHorizontal: spacing.xxl, paddingBottom: insets.bottom + 24 }}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Animated.View style={[styles.badge, { backgroundColor: colors.successTint }, badge]}>
          <View style={[styles.badgeInner, { backgroundColor: colors.success }]}>
            <Icon name="check" size={44} color="#FFFFFF" strokeWidth={3} />
          </View>
        </Animated.View>
        <Text variant="h1" align="center">
          {title}
        </Text>
        {b?.paymentMethod === 'CASH' ? (
          <Text variant="bodySm" muted align="center">
            {t('booking.success.cashNote')}
          </Text>
        ) : null}
      </View>
      <Animated.View style={[{ marginTop: spacing.xxl, gap: spacing.md, flex: 1 }, body]}>
        {b ? (
          <Card style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <Text variant="caption" muted>
                {t('booking.success.code')}
              </Text>
              <Text variant="title" numeric weight="bold" color={colors.primary}>
                {b.code}
              </Text>
            </View>
            {[
              [t('sub.company'), localized(b.companyName)],
              [t('booking.service'), b.serviceName ? localized(b.serviceName) : b.productName ? localized(b.productName) : ''],
              [t('common.date'), `${formatDate(b.date)} · ${formatTime(b.time)}`],
              [t('booking.paymentMethod'), t(`paymentMethod.${b.paymentMethod}` as 'paymentMethod.CARD')],
              [t('common.total'), formatMoney(b.total)],
            ].map(([label, value]) => (
              <View key={label} style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 8 }]}>
                <Text variant="bodySm" muted>
                  {label}
                </Text>
                <Text variant="bodySm" weight="semibold" align="end" style={{ flex: 1 }}>
                  {value}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
        {whatsappUrl ? (
          <Card background={colors.goldTint} style={{ gap: spacing.sm }} shadow="none">
            <View style={styles.row}>
              <Icon name="message-circle-more" size={22} color={colors.gold} />
              <Text variant="title" weight="bold" color={colors.gold} style={{ flex: 1 }}>
                {t('booking.success.whatsappTitle')}
              </Text>
            </View>
            <Text variant="bodySm" muted>
              {t('booking.success.whatsappBody')}
            </Text>
            <Button label={t('booking.success.openWhatsapp')} leftIcon="send" variant="secondary" onPress={() => Linking.openURL(whatsappUrl).catch(() => undefined)} />
          </Card>
        ) : null}
        <View style={{ flex: 1 }} />
        <Button label={t('booking.success.viewOrder')} size="lg" fullWidth onPress={() => router.replace(result?.subscription ? (`/(customer)/subscription/${result.subscription.id}` as never) : (`/(customer)/order/${b?.id ?? id}` as never))} />
        <Button label={t('booking.success.home')} variant="ghost" fullWidth onPress={() => router.replace('/(customer)/(tabs)' as never)} />
      </Animated.View>
      <View style={[styles.confetti, { borderRadius: radii.pill }]} pointerEvents="none" />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center' },
  badgeInner: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  confetti: { position: 'absolute', top: -120, end: -80, width: 260, height: 260, backgroundColor: 'rgba(90,0,32,0.05)' },
});
