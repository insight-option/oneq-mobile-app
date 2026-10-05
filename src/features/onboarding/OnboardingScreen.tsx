import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, I18nManager, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, RatingStars, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { brand } from '@/theme/tokens';
import { continueAsGuest, markOnboarded } from '@/features/shell/useBootstrap';

const { width: W } = Dimensions.get('window');

const FloatingCard = ({ children, rotate, offset, delay, style }: { children: React.ReactNode; rotate: string; offset: number; delay: number; style?: object }) => {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(-offset, { duration: 2200 + delay, easing: Easing.inOut(Easing.ease) }), withTiming(offset, { duration: 2200 + delay, easing: Easing.inOut(Easing.ease) })), -1, true);
  }, [y, offset, delay]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate }] }));
  return <Animated.View style={[styles.card, anim, style]}>{children}</Animated.View>;
};

export const OnboardingScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const slides = [1, 2, 3] as const;

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / W);
    setIndex(Math.max(0, Math.min(2, I18nManager.isRTL ? i : i)));
  }, []);

  const finish = useCallback(
    async (target: '/(auth)/welcome' | '/(auth)/email' | '/(customer)/(tabs)') => {
      await markOnboarded();
      if (target === '/(customer)/(tabs)') await continueAsGuest();
      router.replace(target as never);
    },
    [router],
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={[brand.maroonLight, brand.maroon, brand.maroonDeep]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.topRow, { paddingTop: insets.top + 12 }]}>
        <View style={styles.badge}>
          <Text variant="caption" weight="semibold" color={brand.cream}>
            {t('onboarding.badge')}
          </Text>
        </View>
        <Pressable onPress={() => finish('/(auth)/welcome')} hitSlop={10}>
          <Text variant="bodySm" weight="semibold" color="rgba(247,240,234,0.8)">
            {t('onboarding.skip')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.cluster}>
        <FloatingCard rotate="-6deg" offset={6} delay={0} style={{ top: 10, start: 24 }}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: '#E3EFE5' }]}>
              <Icon name="check" size={16} color="#2F6B40" strokeWidth={3} />
            </View>
            <View>
              <Text variant="bodySm" weight="bold" color={brand.maroonDeep}>
                {t('onboarding.card.session')}
              </Text>
              <Text variant="caption" muted>
                {t('onboarding.card.sessionMeta')}
              </Text>
            </View>
            <View style={styles.timePill}>
              <Text variant="caption" numeric weight="bold" color={brand.maroon}>
                6:00
              </Text>
            </View>
          </View>
        </FloatingCard>
        <FloatingCard rotate="4deg" offset={5} delay={300} style={{ top: 96, end: 20 }}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: brand.maroonTint }]}>
              <Text variant="bodySm" weight="bold" color={brand.maroon}>
                ج
              </Text>
            </View>
            <View>
              <Text variant="bodySm" weight="bold" color={brand.maroonDeep}>
                {t('onboarding.card.salon')}
              </Text>
              <RatingStars value={4.8} size={11} showValue />
            </View>
          </View>
        </FloatingCard>
        <FloatingCard rotate="-3deg" offset={7} delay={600} style={{ top: 182, start: 44, backgroundColor: '#C9843A' }}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Icon name="gift" size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text variant="bodySm" weight="bold" color="#FFFFFF">
                {t('onboarding.card.gift')}
              </Text>
              <Text variant="caption" numeric color="rgba(255,255,255,0.85)">
                {t('onboarding.card.giftAmount')}
              </Text>
            </View>
          </View>
        </FloatingCard>
      </View>

      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32} style={styles.pager}>
        {slides.map((n) => (
          <View key={n} style={styles.slide}>
            <Text variant="display" color={brand.cream} align="start" style={styles.title}>
              {t(`onboarding.slide${n}.title` as 'onboarding.slide1.title')}
            </Text>
            <Text variant="body" color="rgba(247,240,234,0.78)" align="start">
              {t(`onboarding.slide${n}.body` as 'onboarding.slide1.body')}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {slides.map((n, i) => (
            <View key={n} style={[styles.dot, i === index ? styles.dotActive : null]} />
          ))}
        </View>
        <Button label={t('onboarding.start')} variant="cream" size="lg" fullWidth rightIcon="arrow-left" onPress={() => (index < 2 ? scrollRef.current?.scrollTo({ x: (index + 1) * W, animated: true }) : finish('/(auth)/welcome'))} />
        <View style={styles.links}>
          <Pressable onPress={() => finish('/(auth)/email')} hitSlop={8}>
            <Text variant="bodySm" weight="semibold" color={brand.cream}>
              {t('onboarding.haveAccount')}
            </Text>
          </Pressable>
          <View style={styles.linkDot} />
          <Pressable onPress={() => finish('/(customer)/(tabs)')} hitSlop={8}>
            <Text variant="bodySm" weight="semibold" color="rgba(247,240,234,0.8)">
              {t('onboarding.browseGuest')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.maroon },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  badge: { paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cluster: { height: 280, marginTop: 10 },
  card: { position: 'absolute', backgroundColor: brand.cream, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8, minWidth: 220 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  timePill: { marginStart: 'auto', paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: brand.maroonTint, alignItems: 'center', justifyContent: 'center' },
  pager: { flexGrow: 0 },
  slide: { width: W, paddingHorizontal: 28, gap: 12, paddingTop: 10, minHeight: 180 },
  title: { fontSize: 32, lineHeight: 42 },
  footer: { paddingHorizontal: 24, gap: 16, marginTop: 'auto' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(247,240,234,0.4)' },
  dotActive: { width: 26, backgroundColor: brand.cream },
  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  linkDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(247,240,234,0.5)' },
});
