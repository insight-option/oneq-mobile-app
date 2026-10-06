import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/lib/haptics';
import { CategoryGlyph, Icon, Text, type IconName } from '@/components/ui';

export interface CategoryTileProps {
  label: string;
  icon: IconName | string;
  color?: string;
  onPress: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'lg';
}

/** Link-1 category tile: white card, gradient duotone glyph, label. Selected variant is solid maroon ("الكل"). */
export const CategoryTile = React.memo(function CategoryTile({ label, icon, color, onPress, selected, style, size = 'md' }: CategoryTileProps) {
  const { colors, radii, shadows } = useTheme();
  const accent = color ?? colors.primary;
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: selected ? colors.primary : colors.surface, borderRadius: radii.card, borderColor: colors.line, minHeight: size === 'lg' ? 132 : 118, opacity: pressed ? 0.9 : 1 },
        selected ? null : shadows.card,
        style,
      ]}>
      <CategoryGlyph name={icon} color={accent} size={size === 'lg' ? 60 : 54} selected={selected} />
      <Text variant="bodySm" weight="semibold" align="center" color={selected ? '#FFFFFF' : colors.ink} lines={2}>
        {label}
      </Text>
    </Pressable>
  );
});

/** Two big audience tiles (رجال / نساء). */
export const AudienceTile = ({ label, icon, tone, onPress, selected }: { label: string; icon: IconName; tone: 'men' | 'women'; onPress: () => void; selected?: boolean }) => {
  const { colors, radii } = useTheme();
  const bg = tone === 'men' ? '#E8F2FF' : '#FDE8F3';
  const fg = tone === 'men' ? colors.primary : '#E84393';
  return (
    <Pressable onPress={onPress} style={[styles.audience, { backgroundColor: bg, borderRadius: radii.card, borderWidth: selected ? 2 : 0, borderColor: fg }]}>
      <Icon name={icon} size={44} color={fg} strokeWidth={2} />
      <Text variant="h3" color={fg}>
        {label}
      </Text>
    </Pressable>
  );
};

/** Dark hero-style tile with gradient overlay used for highlighted collections. */
export const HeroTile = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { radii } = useTheme();
  return <View style={[{ borderRadius: radii.media, overflow: 'hidden' }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  // the parent grid sets the width (CSS `flex: 1` would pull every tile of a wrapping row onto one line on web)
  tile: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 8, borderWidth: StyleSheet.hairlineWidth },
  audience: { flex: 1, height: 150, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
