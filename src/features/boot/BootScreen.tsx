import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SplashScreen, useRouter } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useSessionStore } from '@/store/session';
import { brand } from '@/theme/tokens';
import { BootGlyph } from './BootGlyph';

const { width: W, height: H } = Dimensions.get('window');
const MIN_MS = 1400;

const Ring = ({ size, delay, opacity }: { size: number; delay: number; opacity: number }) => {
  const scale = useSharedValue(0.92);
  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(withSequence(withTiming(1.06, { duration: 2600, easing: Easing.inOut(Easing.ease) }), withTiming(0.92, { duration: 2600, easing: Easing.inOut(Easing.ease) })), -1, false));
  }, [delay, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size, borderRadius: size / 2, opacity }, style]} />;
};

export const BootScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const status = useSessionStore((s) => s.status);
  const onboarded = useSessionStore((s) => s.onboarded);
  const session = useSessionStore((s) => s.session);
  const landingRoute = useSessionStore((s) => s.landingRoute);
  const [minElapsed, setMinElapsed] = useState(false);
  const navigated = useRef(false);

  const glyph = useSharedValue(0);
  const text = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    glyph.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    text.value = withDelay(350, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    progress.value = withTiming(0.85, { duration: 1600, easing: Easing.out(Easing.quad) });
    const timer = setTimeout(() => setMinElapsed(true), MIN_MS);
    return () => clearTimeout(timer);
  }, [glyph, text, progress]);

  useEffect(() => {
    if (status !== 'ready' || !minElapsed || navigated.current) return;
    navigated.current = true;
    progress.value = withTiming(1, { duration: 250 });
    const target = !onboarded ? '/onboarding' : session ? landingRoute() : '/(auth)/welcome';
    const id = setTimeout(() => router.replace(target as never), 260);
    return () => clearTimeout(id);
  }, [status, minElapsed, onboarded, session, landingRoute, router, progress]);

  const glyphStyle = useAnimatedStyle(() => ({ opacity: glyph.value, transform: [{ scale: 0.88 + glyph.value * 0.12 }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: (1 - text.value) * 12 }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={styles.root}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="42%" rx="70%" ry="55%">
            <Stop offset="0" stopColor={brand.maroonLight} />
            <Stop offset="0.55" stopColor={brand.maroon} />
            <Stop offset="1" stopColor={brand.maroonDeep} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill="url(#bg)" />
      </Svg>
      <View style={styles.center}>
        <Ring size={W * 0.72} delay={0} opacity={0.14} />
        <Ring size={W * 1.0} delay={400} opacity={0.09} />
        <Ring size={W * 1.3} delay={800} opacity={0.05} />
        <Animated.View style={[styles.glyphWrap, glyphStyle]}>
          <BootGlyph size={118} />
        </Animated.View>
        <Animated.View style={[styles.textWrap, textStyle]}>
          <Image source={require('../../../assets/brand/wordmark-cream.png')} style={styles.wordmark} contentFit="contain" />
          <Text variant="h2" color={brand.cream} align="center" style={styles.tagline}>
            {t('splash.tagline')}
          </Text>
          <Text variant="bodySm" color="rgba(247,240,234,0.72)" align="center">
            {t('splash.subtitle')}
          </Text>
        </Animated.View>
      </View>
      <View style={styles.bottom}>
        <View style={styles.loader}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, barStyle]} />
          </View>
          <Text variant="caption" color="rgba(247,240,234,0.75)" align="center">
            {t('splash.loading')}
          </Text>
        </View>
        <Text variant="caption" numeric color="rgba(247,240,234,0.45)" align="center">
          {t('splash.footer')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.maroon },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1.2, borderColor: '#F7F0EA' },
  glyphWrap: { alignItems: 'center', justifyContent: 'center' },
  textWrap: { alignItems: 'center', marginTop: 26, gap: 10, paddingHorizontal: 32 },
  wordmark: { width: 132, height: 40, marginBottom: 4 },
  tagline: { marginTop: 2 },
  bottom: { alignItems: 'center', paddingBottom: 36, gap: 22 },
  loader: { alignItems: 'center', gap: 10, width: 160 },
  track: { width: 160, height: 4, borderRadius: 2, backgroundColor: 'rgba(247,240,234,0.18)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: brand.cream },
});
