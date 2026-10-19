import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text as RNText, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SplashScreen, usePathname, useRouter } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { appWidth } from '@/lib/layout';
import { useSessionStore } from '@/store/session';

/*
 * Launch sequence — the typographic "¹Q" mark from the brand film, refined:
 *  0.0s  blank oxblood field, identical to the native splash (app.json), which deepens into a softly lit vignette
 *  0.3s  an ivory Playfair "Q" comes into focus (fade + gentle de-zoom) with a warm bloom behind it
 *  1.1s  a gold superscript "1" settles in at its upper left while the Q glides over to centre the pair
 *  1.5s  a band of gold light passes through the Q (three nested windows give the band soft edges)
 *  1.9s  a gold hairline draws, then the letter-spaced name and the tagline rise in
 *  exit  the mark lifts and everything dissolves into the first screen
 */
const W = appWidth();
const H = Dimensions.get('window').height;
const MIN_MS = 3000;
const FIELD = '#371617'; // brand film background — also the native splash colour
const IVORY = '#F1E1DA';
const GOLD = '#E3B874';
const GOLD_SHEEN = '#F0C77E';
const QS = Math.round(Math.min(150, W * 0.36)); // Q font size
const QW = Math.round(QS * 0.86); // Q box width
const QH = Math.round(QS * 1.22);
const ONE_W = Math.round(QS * 0.3);
const GAP = -Math.round(QS * 0.03); // the Q's side bearing already separates the pair
const SHIFT = (ONE_W + GAP) / 2; // how far the Q glides to centre the "¹Q" pair
const MARK_W = ONE_W + GAP + QW;
const GLOW = QS * 3;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** One window of the moving gold band: the window travels right while its content counter-moves, so the gold Q stays put. */
const SheenBand = ({ center, width, opacity }: { center: SharedValue<number>; width: number; opacity: number }) => {
  const windowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: center.value - width / 2 }] }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -(center.value - width / 2) }] }));
  return (
    <Animated.View style={[styles.band, { width, opacity }, windowStyle]}>
      <Animated.View style={[styles.bandContent, contentStyle]}>
        <RNText style={[styles.q, { color: GOLD_SHEEN }]}>Q</RNText>
      </Animated.View>
    </Animated.View>
  );
};

const LoaderDot = ({ index, play }: { index: number; play: boolean }) => {
  const v = useSharedValue(0.2);
  useEffect(() => {
    if (!play) return;
    v.value = withDelay(2400 + index * 180, withRepeat(withSequence(withTiming(0.9, { duration: 560, easing: Easing.inOut(Easing.quad) }), withTiming(0.2, { duration: 560, easing: Easing.inOut(Easing.quad) })), -1, false));
  }, [play, v, index]);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[styles.loaderDot, style]} />;
};

const useFadeRise = (value: SharedValue<number>, distance: number, exit: SharedValue<number>) =>
  useAnimatedStyle(() => ({ opacity: value.value * (1 - exit.value), transform: [{ translateY: (1 - value.value) * distance - exit.value * 8 }] }));

export const BootScreen = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const status = useSessionStore((s) => s.status);
  const onboarded = useSessionStore((s) => s.onboarded);
  const session = useSessionStore((s) => s.session);
  const landingRoute = useSessionStore((s) => s.landingRoute);
  const [minElapsed, setMinElapsed] = useState(false);
  const navigated = useRef(false);

  const field = useSharedValue(0);
  const q = useSharedValue(0);
  const glow = useSharedValue(0);
  const shift = useSharedValue(1); // 1 = Q alone in the centre, 0 = "¹Q" pair centred
  const one = useSharedValue(0);
  const sheen = useSharedValue(-QW * 0.5);
  const rule = useSharedValue(0);
  const name = useSharedValue(0);
  const tagline = useSharedValue(0);
  const footer = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    if (reduceMotion) {
      [field, q, glow, one, rule, name, tagline, footer].forEach((v) => (v.value = withTiming(1, { duration: 300 })));
      shift.value = 0;
    } else {
      field.value = withTiming(1, { duration: 800, easing: ease });
      q.value = withDelay(300, withTiming(1, { duration: 950, easing: ease }));
      glow.value = withDelay(400, withSequence(withTiming(1, { duration: 1200, easing: ease }), withRepeat(withSequence(withTiming(0.6, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1, false)));
      shift.value = withDelay(1100, withTiming(0, { duration: 750, easing: ease }));
      one.value = withDelay(1150, withTiming(1, { duration: 800, easing: ease }));
      sheen.value = withDelay(1500, withTiming(QW * 1.5, { duration: 1050, easing: Easing.inOut(Easing.cubic) }));
      rule.value = withDelay(1900, withTiming(1, { duration: 650, easing: ease }));
      name.value = withDelay(2050, withTiming(1, { duration: 650, easing: ease }));
      tagline.value = withDelay(2250, withTiming(1, { duration: 650, easing: ease }));
      footer.value = withDelay(2400, withTiming(1, { duration: 600, easing: ease }));
    }
    const timer = setTimeout(() => setMinElapsed(true), reduceMotion ? 900 : MIN_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion, field, q, glow, shift, one, sheen, rule, name, tagline, footer]);

  useEffect(() => {
    // The root stack anchors this screen under every deep link (oneq.qa/privacy, notification routes…): only redirect
    // while it is the screen actually shown, otherwise it would replace the page that was opened.
    if (pathname !== '/') return;
    if (status !== 'ready' || !minElapsed || navigated.current) return;
    navigated.current = true;
    exit.value = withTiming(1, { duration: 450, easing: Easing.in(Easing.cubic) });
    const target = !onboarded ? '/onboarding' : session ? landingRoute() : '/(auth)/welcome';
    const id = setTimeout(() => router.replace(target as never), 470);
    return () => clearTimeout(id);
  }, [pathname, status, minElapsed, onboarded, session, landingRoute, router, exit]);

  const fieldStyle = useAnimatedStyle(() => ({ opacity: field.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.9 * (1 - exit.value), transform: [{ scale: 0.85 + glow.value * 0.15 }] }));
  const markStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value, transform: [{ translateX: -SHIFT * shift.value }, { scale: 1 + exit.value * 0.05 }] }));
  const qStyle = useAnimatedStyle(() => ({ opacity: q.value, transform: [{ translateY: (1 - q.value) * 8 }, { scale: 1.08 - q.value * 0.08 }] }));
  const oneStyle = useAnimatedStyle(() => ({ opacity: one.value, transform: [{ translateY: -(1 - one.value) * QS * 0.14 }] }));
  const ruleStyle = useAnimatedStyle(() => ({ width: 58 * rule.value, opacity: rule.value * (1 - exit.value) }));
  const nameStyle = useFadeRise(name, 10, exit);
  const taglineStyle = useFadeRise(tagline, 10, exit);
  const footerStyle = useAnimatedStyle(() => ({ opacity: footer.value * (1 - exit.value) }));

  return (
    <View style={styles.root}>
      {/* softly lit vignette over the flat splash colour */}
      <Animated.View style={[StyleSheet.absoluteFill, fieldStyle]} pointerEvents="none">
        <Svg width={W} height={H}>
          <Defs>
            <RadialGradient id="bootField" cx="50%" cy="42%" rx="80%" ry="60%">
              <Stop offset="0" stopColor="#4D1F20" />
              <Stop offset="0.5" stopColor={FIELD} />
              <Stop offset="1" stopColor="#1B0909" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={W} height={H} fill="url(#bootField)" />
        </Svg>
      </Animated.View>

      <View style={styles.center} pointerEvents="none">
        <View style={styles.markArea}>
          {/* warm bloom behind the mark */}
          <Animated.View style={[styles.glow, glowStyle]}>
            <Svg width={GLOW} height={GLOW}>
              <Defs>
                <RadialGradient id="bootGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0" stopColor={GOLD} stopOpacity="0.22" />
                  <Stop offset="0.5" stopColor={GOLD} stopOpacity="0.06" />
                  <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#bootGlow)" />
            </Svg>
          </Animated.View>

          {/* the "¹Q" mark — laid out left-to-right in every language */}
          <Animated.View style={[styles.mark, markStyle]}>
            <Animated.View style={[styles.oneWrap, oneStyle]}>
              <RNText style={styles.one}>1</RNText>
            </Animated.View>
            <Animated.View style={[styles.qBox, qStyle]}>
              <RNText style={styles.q}>Q</RNText>
              <SheenBand center={sheen} width={QW * 0.62} opacity={0.3} />
              <SheenBand center={sheen} width={QW * 0.36} opacity={0.55} />
              <SheenBand center={sheen} width={QW * 0.14} opacity={0.95} />
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.rule, ruleStyle]}>
          <LinearGradient colors={['rgba(227,184,116,0)', GOLD, 'rgba(227,184,116,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={nameStyle}>
          <RNText style={styles.name}>ONEQ</RNText>
        </Animated.View>
        <Animated.View style={[styles.taglineWrap, taglineStyle]}>
          <Text variant="bodySm" color="rgba(241,225,218,0.68)" align="center">
            {t('splash.tagline')}
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottom, footerStyle]} pointerEvents="none">
        <View style={styles.loader} accessibilityLabel={t('splash.loading')}>
          {[0, 1, 2].map((i) => (
            <LoaderDot key={i} index={i} play={!reduceMotion} />
          ))}
        </View>
        <Text variant="caption" numeric color="rgba(241,225,218,0.34)" align="center">
          {t('splash.footer')}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FIELD, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: H * 0.06 },
  markArea: { width: MARK_W, height: QH, direction: 'ltr' },
  glow: { position: 'absolute', left: (MARK_W - GLOW) / 2 + SHIFT, top: (QH - GLOW) / 2 },
  mark: { flexDirection: 'row', direction: 'ltr', alignItems: 'flex-start' },
  oneWrap: { width: ONE_W, marginRight: GAP, marginTop: -QS * 0.06, alignItems: 'flex-end' },
  one: { fontFamily: 'PlayfairDisplay-Regular', fontSize: Math.round(QS * 0.42), lineHeight: Math.round(QS * 0.56), color: GOLD, includeFontPadding: false },
  qBox: { width: QW, height: QH, overflow: 'hidden' },
  q: { width: QW, fontFamily: 'PlayfairDisplay-Regular', fontSize: QS, lineHeight: QH, color: IVORY, textAlign: 'center', includeFontPadding: false },
  band: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  bandContent: { position: 'absolute', top: 0, left: 0, width: QW, height: QH },
  rule: { height: 1, marginTop: 6, overflow: 'hidden' },
  name: { marginTop: 14, fontFamily: 'Outfit-Medium', fontSize: 12, letterSpacing: 7, color: 'rgba(241,225,218,0.78)', paddingStart: 7 },
  taglineWrap: { marginTop: 10, paddingHorizontal: 32 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: 38, gap: 16 },
  loader: { flexDirection: 'row', gap: 8, height: 8, alignItems: 'center' },
  loaderDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: GOLD },
});
