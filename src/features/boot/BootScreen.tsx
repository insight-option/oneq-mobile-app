import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SplashScreen, useRouter } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { appWidth } from '@/lib/layout';
import { useSessionStore } from '@/store/session';
import { brand } from '@/theme/tokens';

/*
 * Launch sequence. Frame 0 is identical to the native splash (cream 1Q monogram, 160 pt, centred on #5A0020) so the
 * hand-off is invisible; then: the maroon deepens into a lit radial field → a gold comet draws one orbit around the
 * emblem while a soft halo breathes behind it → a sheen of light passes across the monogram → the emblem settles
 * upward and the wordmark, a gold hairline and the tagline rise in → gold dust drifts for the rest of the stay →
 * everything lifts and fades into the first screen.
 */
const W = appWidth();
const H = Dimensions.get('window').height;
const MIN_MS = 2300;
const EMBLEM = 160; // native splash imageWidth (app.json)
const ORBIT = 216;
const STAGE = ORBIT * 1.5;
const GOLD = '#E7BE73';
const GOLD_SOFT = '#F6DFAE';
const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** Deterministic pseudo-random in [0, 1) so the dust field is identical on every launch. */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const Dust = ({ index, play }: { index: number; play: boolean }) => {
  const t = useSharedValue(0);
  const left = rand(index, 1) * W;
  const top = H * (0.16 + rand(index, 2) * 0.7);
  const size = 1.6 + rand(index, 3) * 2.6;
  const drift = 26 + rand(index, 4) * 46;
  const duration = 3200 + rand(index, 5) * 2600;
  useEffect(() => {
    if (!play) return;
    t.value = withDelay(500 + rand(index, 6) * 1400, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, false));
  }, [play, t, index, duration]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.sin(t.value * Math.PI) * 0.85,
    transform: [{ translateY: -t.value * drift }, { scale: 0.6 + Math.sin(t.value * Math.PI) * 0.6 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.dust, { left, top, width: size, height: size, borderRadius: size / 2 }, style]} />;
};

const LoaderDot = ({ index, play }: { index: number; play: boolean }) => {
  const v = useSharedValue(0.25);
  useEffect(() => {
    if (!play) return;
    v.value = withDelay(1500 + index * 180, withRepeat(withSequence(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }), withTiming(0.25, { duration: 520, easing: Easing.inOut(Easing.quad) })), -1, false));
  }, [play, v, index]);
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.75 + v.value * 0.35 }] }));
  return <Animated.View style={[styles.loaderDot, style]} />;
};

const useFadeRise = (value: SharedValue<number>, distance: number) => useAnimatedStyle(() => ({ opacity: value.value, transform: [{ translateY: (1 - value.value) * distance }] }));

export const BootScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const status = useSessionStore((s) => s.status);
  const onboarded = useSessionStore((s) => s.onboarded);
  const session = useSessionStore((s) => s.session);
  const landingRoute = useSessionStore((s) => s.landingRoute);
  const [minElapsed, setMinElapsed] = useState(false);
  const navigated = useRef(false);

  const field = useSharedValue(0); // lit radial field over the flat splash maroon
  const orbit = useSharedValue(0); // comet sweep, one turn
  const orbitIn = useSharedValue(0);
  const halo = useSharedValue(0);
  const sheen = useSharedValue(0);
  const settle = useSharedValue(0); // emblem rises and scales down to make room for the text
  const word = useSharedValue(0);
  const rule = useSharedValue(0);
  const tagline = useSharedValue(0);
  const footer = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    if (reduceMotion) {
      [field, orbit, orbitIn, halo, settle, word, rule, tagline, footer].forEach((v) => (v.value = withTiming(1, { duration: 300 })));
    } else {
      field.value = withTiming(1, { duration: 900, easing: ease });
      orbitIn.value = withDelay(150, withTiming(1, { duration: 700, easing: ease }));
      orbit.value = withDelay(150, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }));
      halo.value = withDelay(200, withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), withTiming(0.55, { duration: 1400, easing: Easing.inOut(Easing.sin) })), -1, false));
      sheen.value = withDelay(650, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }));
      settle.value = withDelay(700, withTiming(1, { duration: 900, easing: ease }));
      word.value = withDelay(1000, withTiming(1, { duration: 800, easing: ease }));
      rule.value = withDelay(1250, withTiming(1, { duration: 700, easing: ease }));
      tagline.value = withDelay(1400, withTiming(1, { duration: 750, easing: ease }));
      footer.value = withDelay(1700, withTiming(1, { duration: 600, easing: ease }));
    }
    const timer = setTimeout(() => setMinElapsed(true), reduceMotion ? 900 : MIN_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion, field, orbit, orbitIn, halo, sheen, settle, word, rule, tagline, footer]);

  useEffect(() => {
    if (status !== 'ready' || !minElapsed || navigated.current) return;
    navigated.current = true;
    exit.value = withTiming(1, { duration: 380, easing: Easing.in(Easing.cubic) });
    const target = !onboarded ? '/onboarding' : session ? landingRoute() : '/(auth)/welcome';
    const id = setTimeout(() => router.replace(target as never), 400);
    return () => clearTimeout(id);
  }, [status, minElapsed, onboarded, session, landingRoute, router, exit]);

  const fieldStyle = useAnimatedStyle(() => ({ opacity: field.value }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value * 0.9 * (1 - exit.value), transform: [{ scale: 0.9 + halo.value * 0.14 }] }));
  const orbitStyle = useAnimatedStyle(() => ({ opacity: orbitIn.value * (1 - orbit.value * 0.65) * (1 - exit.value), transform: [{ rotate: `${-90 + orbit.value * 360}deg` }, { scale: 0.94 + orbitIn.value * 0.06 }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: orbit.value * 0.6 * (1 - exit.value) }));
  const emblemStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value, transform: [{ translateY: -settle.value * 44 }, { scale: 1 - settle.value * 0.2 + exit.value * 0.06 }] }));
  const sheenStyle = useAnimatedStyle(() => ({ opacity: sheen.value > 0 && sheen.value < 1 ? 1 : 0, transform: [{ translateX: -EMBLEM + sheen.value * EMBLEM * 2 }, { rotate: '20deg' }] }));
  const wordStyle = useFadeRise(word, 16);
  const ruleStyle = useAnimatedStyle(() => ({ width: 72 * rule.value, opacity: rule.value }));
  const taglineStyle = useFadeRise(tagline, 12);
  const footerStyle = useAnimatedStyle(() => ({ opacity: footer.value * (1 - exit.value) }));
  const textBlockStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value, transform: [{ translateY: -exit.value * 10 }] }));

  const dust = useMemo(() => Array.from({ length: 16 }, (_, i) => i), []);

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, fieldStyle]} pointerEvents="none">
        <Svg width={W} height={H}>
          <Defs>
            <RadialGradient id="bootField" cx="50%" cy="44%" rx="78%" ry="58%">
              <Stop offset="0" stopColor="#8A2448" />
              <Stop offset="0.45" stopColor={brand.maroon} />
              <Stop offset="1" stopColor="#1C000A" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={W} height={H} fill="url(#bootField)" />
        </Svg>
      </Animated.View>

      {dust.map((i) => (
        <Dust key={i} index={i} play={!reduceMotion} />
      ))}

      <View style={styles.center} pointerEvents="none">
        <Animated.View style={[styles.stage, emblemStyle]}>
          {/* breathing gold halo behind the emblem */}
          <Animated.View style={[styles.layer, haloStyle]}>
            <Svg width={STAGE} height={STAGE}>
              <Defs>
                <RadialGradient id="bootHalo" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0" stopColor={GOLD} stopOpacity="0.32" />
                  <Stop offset="0.55" stopColor={GOLD} stopOpacity="0.08" />
                  <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={STAGE / 2} cy={STAGE / 2} r={STAGE / 2} fill="url(#bootHalo)" />
            </Svg>
          </Animated.View>

          {/* fine ring that remains once the comet has passed */}
          <Animated.View style={[styles.layer, ringStyle]}>
            <Svg width={ORBIT} height={ORBIT}>
              <Circle cx={ORBIT / 2} cy={ORBIT / 2} r={ORBIT / 2 - 2} stroke={GOLD_SOFT} strokeOpacity={0.45} strokeWidth={0.8} fill="none" />
            </Svg>
          </Animated.View>

          {/* comet: a gold arc fading along its length with a bright head, rotated once around the emblem */}
          <Animated.View style={[styles.layer, orbitStyle]}>
            <Svg width={ORBIT} height={ORBIT}>
              <Defs>
                <SvgLinearGradient id="bootComet" x1="0%" y1="100%" x2="100%" y2="50%">
                  <Stop offset="0" stopColor={GOLD} stopOpacity="0" />
                  <Stop offset="1" stopColor={GOLD_SOFT} stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <Circle cx={ORBIT / 2} cy={ORBIT / 2} r={ORBIT / 2 - 2} stroke="url(#bootComet)" strokeWidth={1.6} strokeLinecap="round" fill="none" strokeDasharray={`${Math.PI * (ORBIT - 4) * 0.3} ${Math.PI * (ORBIT - 4)}`} />
              <Circle cx={ORBIT - 2} cy={ORBIT / 2} r={2.6} fill={GOLD_SOFT} />
            </Svg>
          </Animated.View>

          {/* the monogram exactly as on the native splash, with a light sheen passing across it */}
          <View style={styles.emblem}>
            <Image source={require('../../../assets/splash-icon.png')} style={styles.emblemImage} contentFit="contain" />
            <View style={styles.sheenClip}>
              <Animated.View style={[styles.sheen, sheenStyle]}>
                <LinearGradient colors={['rgba(255,240,210,0)', 'rgba(255,240,210,0.28)', 'rgba(255,240,210,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* placed under the screen centre so the emblem starts exactly where the native splash drew it */}
      <Animated.View style={[styles.textBlock, textBlockStyle]} pointerEvents="none">
        <Animated.View style={wordStyle}>
          <Image source={require('../../../assets/brand/wordmark-cream.png')} style={styles.wordmark} contentFit="contain" />
        </Animated.View>
        <Animated.View style={[styles.rule, ruleStyle]}>
          <LinearGradient colors={['rgba(231,190,115,0)', GOLD, 'rgba(231,190,115,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.taglineWrap, taglineStyle]}>
          <Text variant="h3" color={brand.cream} align="center" style={styles.tagline}>
            {t('splash.tagline')}
          </Text>
          <Text variant="bodySm" color="rgba(247,240,234,0.66)" align="center">
            {t('splash.subtitle')}
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.bottom, footerStyle]} pointerEvents="none">
        <View style={styles.loader} accessibilityLabel={t('splash.loading')}>
          {[0, 1, 2].map((i) => (
            <LoaderDot key={i} index={i} play={!reduceMotion} />
          ))}
        </View>
        <Text variant="caption" numeric color="rgba(247,240,234,0.42)" align="center">
          {t('splash.footer')}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.maroon, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  emblem: { width: EMBLEM, height: EMBLEM, alignItems: 'center', justifyContent: 'center' },
  emblemImage: { width: EMBLEM, height: EMBLEM },
  sheenClip: { ...StyleSheet.absoluteFill, borderRadius: EMBLEM / 2, overflow: 'hidden' },
  sheen: { position: 'absolute', top: -EMBLEM * 0.25, bottom: -EMBLEM * 0.25, width: EMBLEM * 0.42, left: EMBLEM / 2 - EMBLEM * 0.21 },
  textBlock: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: 60, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  wordmark: { width: 150, height: 46 },
  rule: { height: 1, overflow: 'hidden' },
  taglineWrap: { alignItems: 'center', gap: 6 },
  tagline: { letterSpacing: 0.5 },
  dust: { position: 'absolute', backgroundColor: GOLD_SOFT, shadowColor: GOLD, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: 38, gap: 18 },
  loader: { flexDirection: 'row', gap: 8, height: 10, alignItems: 'center' },
  loaderDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },
});
