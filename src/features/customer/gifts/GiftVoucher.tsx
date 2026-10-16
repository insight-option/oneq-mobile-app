import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { PremiumGlyph, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export interface GiftVoucherProps {
  senderName: string;
  itemLabel: string;
  companyLabel?: string | null;
  amountLabel?: string | null;
  message?: string | null;
  kind: 'POINTS' | 'SERVICE' | 'PRODUCT';
  code?: string;
  recipientName?: string | null;
  /** icon name of the gifted item's category — drawn without any background */
  categoryIcon?: string | null;
  /** play the unwrap entrance (card rises in, then a sheen of light passes) */
  reveal?: boolean;
}

const RADIUS = 26;
const FOIL = ['#F7E2B4', '#C38A3D', '#F3D79C', '#9E6527'] as const;
const GOLD = '#E9C27A';
const GOLD_SOFT = '#F7E2B4';
const RIBBON_END = 46; // ribbon distance from the card's end edge
const RIBBON_W = 13;

/** Satin bow drawn on the ribbon: two loops, two tails and a knot, gold gradient. */
const Bow = () => (
  <Svg width={74} height={58} viewBox="0 0 74 58">
    <Defs>
      <SvgLinearGradient id="giftBow" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0" stopColor="#FBE7BC" />
        <Stop offset="0.5" stopColor="#D9A24F" />
        <Stop offset="1" stopColor="#A86C2A" />
      </SvgLinearGradient>
    </Defs>
    <G fill="url(#giftBow)">
      <Path d="M37 24 C27 6 6 4 6 16 C6 28 25 29 37 24 Z" />
      <Path d="M37 24 C47 6 68 4 68 16 C68 28 49 29 37 24 Z" />
      <Path d="M33 27 L22 54 L29 50 L32 57 L38 29 Z" />
      <Path d="M41 27 L52 54 L45 50 L42 57 L36 29 Z" />
    </G>
    <Path d="M37 24 C29 13 14 10 12 16" stroke="#FFF4DA" strokeOpacity={0.55} strokeWidth={1.2} fill="none" />
    <Path d="M37 24 C45 13 60 10 62 16" stroke="#FFF4DA" strokeOpacity={0.55} strokeWidth={1.2} fill="none" />
    <Circle cx={37} cy={24.5} r={6.2} fill="#C48A3B" />
    <Circle cx={36} cy={23.2} r={2.4} fill="#FCE9C2" opacity={0.7} />
  </Svg>
);

/** Fine guilloché arcs engraved across the top of the card. */
const Engraving = () => (
  <Svg width={220} height={170} viewBox="0 0 220 170" style={styles.engraving} pointerEvents="none">
    {Array.from({ length: 9 }, (_, i) => (
      <Circle key={i} cx={110} cy={6} r={40 + i * 17} stroke={GOLD} strokeOpacity={0.1 - i * 0.008} strokeWidth={0.9} fill="none" />
    ))}
  </Svg>
);

/** Premium gift card (maroon with gold foil edge, satin ribbon + bow, tear-off stub) — send preview, success and gift details. */
export const GiftVoucher = ({ senderName, itemLabel, companyLabel, amountLabel, message, kind, code, recipientName, categoryIcon, reveal = true }: GiftVoucherProps) => {
  const { colors, shadows } = useTheme();
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const animate = reveal && !reduceMotion;
  const enter = useSharedValue(animate ? 0 : 1);
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    enter.value = withSpring(1, { damping: 16, stiffness: 120, mass: 0.9 });
    sheen.value = withDelay(380, withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.cubic) }));
  }, [animate, enter, sheen]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 1.4),
    transform: [{ perspective: 900 }, { translateY: (1 - enter.value) * 26 }, { rotateX: `${(1 - enter.value) * 14}deg` }, { scale: 0.95 + enter.value * 0.05 }],
  }));
  const sheenStyle = useAnimatedStyle(() => ({ opacity: sheen.value > 0 && sheen.value < 1 ? 1 : 0, transform: [{ translateX: -260 + sheen.value * 760 }, { rotate: '18deg' }] }));

  const glyph = kind === 'POINTS' ? 'coins' : categoryIcon || (kind === 'PRODUCT' ? 'package' : 'sparkles');

  return (
    <Animated.View style={[shadows.elevated, { borderRadius: RADIUS }, enterStyle]}>
      <LinearGradient colors={FOIL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.foil}>
        <LinearGradient colors={['#84213F', '#5A0020', '#2E0010']} locations={[0, 0.55, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.card}>
          <Engraving />

          {/* main card: the satin ribbon wraps this part only, the stub below tears off */}
          <View>
            <LinearGradient colors={['#B57A32', '#F2D394', '#C99245', '#8F5A22']} locations={[0, 0.35, 0.7, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.ribbon} />
            <View style={styles.bow} pointerEvents="none">
              <Bow />
            </View>

            <View style={styles.body}>
              <View style={styles.headRow}>
                <Text variant="caption" weight="bold" color={GOLD} style={styles.eyebrow}>
                  {t('gifts.voucher')}
                </Text>
                <Image source={require('../../../../assets/brand/wordmark-cream.png')} style={styles.wordmark} contentFit="contain" />
              </View>

              <PremiumGlyph name={glyph} size={54} tone="light" />

              <View style={{ gap: 4 }}>
                <Text variant="h2" color="#FFF8EE" lines={2}>
                  {itemLabel}
                </Text>
                {companyLabel ? (
                  <Text variant="bodySm" color="rgba(255,248,238,0.72)" lines={1}>
                    {companyLabel}
                  </Text>
                ) : null}
              </View>

              {amountLabel ? (
                <View style={{ gap: 2 }}>
                  <Text variant="caption" color="rgba(247,226,180,0.75)">
                    {t('gifts.card.value')}
                  </Text>
                  <Text variant="h2" numeric color={GOLD_SOFT}>
                    {amountLabel}
                  </Text>
                </View>
              ) : null}

              {message ? (
                <View style={styles.message}>
                  <Text variant="h1" color={GOLD} style={styles.quoteMark}>
                    “
                  </Text>
                  <Text variant="bodySm" color="rgba(255,248,238,0.92)" style={{ flex: 1 }}>
                    {message}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* perforation: notches cut in the page colour + dashed gold line */}
          <View style={styles.perforation}>
            <View style={[styles.notch, styles.notchStart, { backgroundColor: colors.canvas }]} />
            <View style={styles.dashes}>
              {Array.from({ length: 22 }, (_, i) => (
                <View key={i} style={styles.dash} />
              ))}
            </View>
            <View style={[styles.notch, styles.notchEnd, { backgroundColor: colors.canvas }]} />
          </View>

          <View style={styles.stub}>
            <View style={styles.stubCol}>
              <Text variant="caption" color="rgba(247,226,180,0.7)">
                {t('gifts.card.from')}
              </Text>
              <Text variant="bodySm" weight="semibold" color="#FFF8EE" lines={1}>
                {senderName}
              </Text>
            </View>
            {code ? (
              <View style={[styles.stubCol, styles.stubEnd]}>
                <Text variant="caption" color="rgba(247,226,180,0.7)">
                  {t('gifts.card.code')}
                </Text>
                <Text variant="bodySm" weight="bold" numeric color={GOLD_SOFT} style={styles.code}>
                  {code}
                </Text>
              </View>
            ) : recipientName ? (
              <View style={[styles.stubCol, styles.stubEnd]}>
                <Text variant="caption" color="rgba(247,226,180,0.7)">
                  {t('gifts.card.to')}
                </Text>
                <Text variant="bodySm" weight="semibold" color="#FFF8EE" lines={1}>
                  {recipientName}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sheenClip} pointerEvents="none">
            <Animated.View style={[styles.sheen, sheenStyle]}>
              <LinearGradient colors={['rgba(255,236,200,0)', 'rgba(255,236,200,0.22)', 'rgba(255,236,200,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        </LinearGradient>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  foil: { borderRadius: RADIUS, padding: 1.6 },
  card: { borderRadius: RADIUS - 1.6, overflow: 'hidden' },
  engraving: { position: 'absolute', top: 0, start: 0 },
  ribbon: { position: 'absolute', top: 0, bottom: 0, end: RIBBON_END, width: RIBBON_W, opacity: 0.95 },
  bow: { position: 'absolute', top: 18, end: RIBBON_END + RIBBON_W / 2 - 37 },
  body: { paddingTop: 20, paddingBottom: 18, paddingStart: 22, paddingEnd: RIBBON_END + 40, gap: 14 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { letterSpacing: 1.6, textTransform: 'uppercase' },
  wordmark: { width: 52, height: 16, opacity: 0.85 },
  message: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingTop: 2 },
  quoteMark: { lineHeight: 36, marginTop: -4 },
  perforation: { height: 22, flexDirection: 'row', alignItems: 'center' },
  notch: { width: 22, height: 22, borderRadius: 11, position: 'absolute' },
  notchStart: { start: -11 },
  notchEnd: { end: -11 },
  dashes: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20 },
  dash: { width: 6, height: 1.2, backgroundColor: 'rgba(233,194,122,0.45)', borderRadius: 1 },
  stub: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 22, paddingTop: 6, paddingBottom: 18 },
  stubCol: { flex: 1, gap: 2 },
  stubEnd: { alignItems: 'flex-end' },
  code: { letterSpacing: 2 },
  sheenClip: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  sheen: { position: 'absolute', top: -80, bottom: -80, width: 120, start: 0 },
});
