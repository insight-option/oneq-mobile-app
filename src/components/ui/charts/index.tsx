/**
 * Lightweight SVG charts (no chart library): Sparkline, AreaChart, BarChart, DistributionBar.
 * All accept { label, value }[] and size themselves to the parent width via onLayout.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import type { TrendPoint } from '@/domain/types';
import { formatNumber } from '@/i18n/format';
import { Text } from '../Text';

const useWidth = () => {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));
  return { w, onLayout };
};

const smoothPath = (pts: { x: number; y: number }[]): string => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

export const Sparkline = ({ data, height = 44, color, width: fixedWidth, fill = true }: { data: number[]; height?: number; color?: string; width?: number; fill?: boolean }) => {
  const { colors } = useTheme();
  const { w, onLayout } = useWidth();
  const width = fixedWidth ?? w;
  const c = color ?? colors.onPrimary;
  const pts = useMemo(() => {
    if (!width || data.length < 2) return [];
    const max = Math.max(...data);
    const min = Math.min(...data);
    const span = max - min || 1;
    return data.map((v, i) => ({ x: (i / (data.length - 1)) * width, y: 4 + (1 - (v - min) / span) * (height - 8) }));
  }, [data, width, height]);
  const d = smoothPath(pts);
  return (
    <View onLayout={fixedWidth ? undefined : onLayout} style={{ height, width: fixedWidth ?? '100%' }}>
      {pts.length ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c} stopOpacity={0.35} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {fill ? <Path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill="url(#spark)" /> : null}
          <Path d={d} stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
};

export interface AreaChartProps {
  data: TrendPoint[];
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  /** number of x labels to show (evenly spaced) */
  xLabels?: number;
  compactValues?: boolean;
}

export const AreaChart = ({ data, height = 200, color, style, xLabels = 4, compactValues = true }: AreaChartProps) => {
  const { colors } = useTheme();
  const { w, onLayout } = useWidth();
  const c = color ?? colors.primary;
  const padL = 40;
  const padB = 24;
  const padT = 10;
  const innerW = Math.max(0, w - padL - 8);
  const innerH = height - padB - padT;
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = useMemo(() => {
    const p = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / p) * p;
  }, [max]);
  const pts = useMemo(() => (w ? data.map((d, i) => ({ x: padL + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2), y: padT + (1 - d.value / niceMax) * innerH })) : []), [data, w, innerW, innerH, niceMax]);
  const d = smoothPath(pts);
  const ticks = [0, 0.5, 1];
  const labelEvery = Math.max(1, Math.round(data.length / xLabels));
  return (
    <View onLayout={onLayout} style={[{ height, width: '100%' }, style]}>
      {w > 0 && pts.length ? (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c} stopOpacity={0.28} />
              <Stop offset="1" stopColor={c} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {ticks.map((t) => {
            const y = padT + (1 - t) * innerH;
            return (
              <React.Fragment key={t}>
                <Line x1={padL} x2={w - 8} y1={y} y2={y} stroke={colors.line} strokeWidth={1} />
                <SvgText x={padL - 8} y={y + 4} fontSize={11} fill={colors.faint} textAnchor="end" fontFamily={fonts.latin.medium}>
                  {formatNumber(niceMax * t, { compact: compactValues })}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Path d={`${d} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`} fill="url(#area)" />
          <Path d={d} stroke={c} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((p, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <SvgText key={p.label + i} x={pts[i].x} y={height - 6} fontSize={11} fill={colors.muted} textAnchor="middle" fontFamily={fonts.arabic.medium}>
                {p.label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      ) : null}
    </View>
  );
};

export interface BarChartProps {
  data: TrendPoint[];
  height?: number;
  color?: string;
  highlightLast?: boolean;
  style?: StyleProp<ViewStyle>;
  labelEvery?: number;
}

export const BarChart = ({ data, height = 180, color, highlightLast = true, style, labelEvery }: BarChartProps) => {
  const { colors } = useTheme();
  const { w, onLayout } = useWidth();
  const c = color ?? colors.primary;
  const padB = 22;
  const innerH = height - padB - 8;
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 6;
  const barW = data.length ? Math.max(4, (w - gap * (data.length - 1)) / data.length) : 0;
  const every = labelEvery ?? Math.max(1, Math.ceil(data.length / 7));
  return (
    <View onLayout={onLayout} style={[{ height, width: '100%' }, style]}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          {data.map((d, i) => {
            const h = (d.value / max) * innerH;
            const x = i * (barW + gap);
            const last = i === data.length - 1;
            return (
              <React.Fragment key={d.label + i}>
                <Rect x={x} y={8 + innerH - h} width={barW} height={Math.max(2, h)} rx={Math.min(6, barW / 2)} fill={last && highlightLast ? c : colors.tintStrong} />
              </React.Fragment>
            );
          })}
        </Svg>
      ) : null}
      {w > 0
        ? data.map((d, i) => {
            const last = i === data.length - 1;
            if (!(i % every === 0 || last)) return null;
            // RN Text (not SVG text) so Arabic letters keep their shaping on Android
            return (
              <Text key={`label-${d.label}-${i}`} variant="caption" color={colors.muted} align="center" lines={1} style={{ position: 'absolute', bottom: 0, left: i * (barW + gap) - gap, width: barW + gap * 2, fontSize: 10 }}>
                {d.label}
              </Text>
            );
          })
        : null}
    </View>
  );
};

export interface DistributionItem {
  label: string;
  value: number;
  color?: string;
}

/** Stacked horizontal bar + legend rows with count and percentage (link-2 subscriptions distribution). */
export const DistributionBar = ({ items, style }: { items: DistributionItem[]; style?: StyleProp<ViewStyle> }) => {
  const { colors, radii } = useTheme();
  const total = Math.max(1, items.reduce((s, i) => s + i.value, 0));
  const ramp = [colors.primaryDeep, colors.primary, '#8E4B63', '#C79AAA', '#E3C3CE'];
  return (
    <View style={[{ gap: 14 }, style]}>
      <View style={[styles.stack, { borderRadius: radii.pill }]}>
        {items.map((it, i) => (
          <View key={it.label} style={{ flex: Math.max(0.0001, it.value / total), backgroundColor: it.color ?? ramp[i % ramp.length], marginEnd: i < items.length - 1 ? 2 : 0 }} />
        ))}
      </View>
      <View style={{ gap: 10 }}>
        {items.map((it, i) => (
          <View key={it.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: it.color ?? ramp[i % ramp.length] }]} />
            <Text variant="bodySm" style={{ flex: 1 }}>
              {it.label}
            </Text>
            <Text variant="bodySm" numeric weight="bold">
              {formatNumber(it.value)}
            </Text>
            <Text variant="bodySm" numeric muted style={{ width: 44, textAlign: 'right' }}>
              {Math.round((it.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', height: 12, overflow: 'hidden' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
});
