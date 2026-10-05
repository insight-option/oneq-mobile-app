import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { Card } from './Card';
import { IconBubble } from './basics';
import { Icon, type IconName } from './icons';
import { Sparkline } from './charts';
import { Text } from './Text';

export const DeltaPill = ({ value, label, onDark }: { value: number; label?: string; onDark?: boolean }) => {
  const { colors } = useTheme();
  const up = value >= 0;
  const fg = onDark ? '#CFE8D6' : up ? colors.success : colors.danger;
  const bg = onDark ? 'rgba(255,255,255,0.14)' : up ? colors.successTint : colors.dangerTint;
  return (
    <View style={styles.deltaRow}>
      <View style={[styles.delta, { backgroundColor: bg }]}>
        <Icon name={up ? 'trending-up' : 'trending-down'} size={13} color={fg} />
        <Text variant="caption" numeric weight="bold" color={fg}>
          {up ? '+' : ''}
          {value}%
        </Text>
      </View>
      {label ? (
        <Text variant="caption" color={onDark ? 'rgba(255,255,255,0.7)' : colors.muted}>
          {label}
        </Text>
      ) : null}
    </View>
  );
};

export interface KpiCardProps {
  label: string;
  value: string;
  icon: IconName;
  delta?: number;
  deltaLabel?: string;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const KpiCard = React.memo(function KpiCard({ label, value, icon, delta, deltaLabel, suffix, style, onPress }: KpiCardProps) {
  const { spacing } = useTheme();
  return (
    <Card style={[{ flex: 1, gap: spacing.md }, style]} onPress={onPress}>
      <View style={styles.kpiTop}>
        <Text variant="bodySm" muted style={{ flex: 1 }} lines={2}>
          {label}
        </Text>
        <IconBubble name={icon} size={40} />
      </View>
      <View style={styles.valueRow}>
        <Text variant="numericLg" numeric>
          {value}
        </Text>
        {suffix ? (
          <Text variant="caption" muted>
            {suffix}
          </Text>
        ) : null}
      </View>
      {typeof delta === 'number' ? <DeltaPill value={delta} label={deltaLabel} /> : null}
    </Card>
  );
});

export interface HeroStatCardProps {
  label: string;
  value: string;
  suffix?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: IconName;
  series?: number[];
  style?: StyleProp<ViewStyle>;
}

/** Dark maroon gradient stat card with sparkline (link-2 revenue hero). */
export const HeroStatCard = React.memo(function HeroStatCard({ label, value, suffix, delta, deltaLabel, icon = 'wallet', series, style }: HeroStatCardProps) {
  const { radii, spacing, shadows } = useTheme();
  return (
    <LinearGradient colors={[brand.maroonDark, brand.maroon, brand.maroonDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radii.card, padding: spacing.xl, overflow: 'hidden' }, shadows.elevated, style]}>
      <View style={styles.decor} />
      <View style={styles.heroTop}>
        <View style={styles.heroIcon}>
          <Icon name={icon} size={20} color="#FFFFFF" />
        </View>
        <Text variant="bodySm" color="rgba(255,255,255,0.8)" style={{ flex: 1 }}>
          {label}
        </Text>
      </View>
      <View style={[styles.valueRow, { marginTop: spacing.lg }]}>
        <Text variant="display" numeric color="#FFFFFF" style={{ fontSize: 40, lineHeight: 48 }}>
          {value}
        </Text>
        {suffix ? (
          <Text variant="bodySm" color="rgba(255,255,255,0.75)">
            {suffix}
          </Text>
        ) : null}
      </View>
      <View style={[styles.heroBottom, { marginTop: spacing.md }]}>
        {typeof delta === 'number' ? <DeltaPill value={delta} label={deltaLabel} onDark /> : <View />}
        {/* a flat series (e.g. all zeros on a fresh platform) would draw as a bare line along the bottom edge */}
        {series && series.length > 1 && series.some((v) => v !== series[0]) ? (
          <View style={{ width: 110 }}>
            <Sparkline data={series} height={40} width={110} color="rgba(255,255,255,0.9)" />
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: 12 },
  kpiTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  decor: { position: 'absolute', top: -70, end: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  heroBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
});
