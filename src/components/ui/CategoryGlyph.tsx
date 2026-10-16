import React, { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { glyphShape, hasGlyphShape } from './glyphPaths';

/**
 * Premium glyphs: two-layer (duotone) artwork drawn with gradient fills and NO background tile — a deep maroon
 * gradient for the outline and a champagne-gold gradient for the inner layer. Category / subcategory records keep their
 * lucide-style icon names (admin picker, seed data); glyphPaths.ts maps them to the artwork.
 */
export const hasPremiumGlyph = hasGlyphShape;

/**
 * brand: maroon outline + champagne-gold layer, for light surfaces (default)
 * light: ivory outline + warm-gold layer, for maroon surfaces (selected tile, gift card)
 * gold:  gold outline + ivory layer, for accents on maroon
 */
export type GlyphTone = 'brand' | 'light' | 'gold';

const TONES: Record<GlyphTone, { main: [string, string]; layer: [string, string]; layerOpacity: number }> = {
  brand: { main: ['#9A2549', '#4A0019'], layer: ['#F6DFB0', '#D6A256'], layerOpacity: 0.95 },
  light: { main: ['#FFFFFF', '#F2E2CC'], layer: ['#F8D894', '#C88A36'], layerOpacity: 0.9 },
  gold: { main: ['#FBE3AE', '#C8893A'], layer: ['#FFFFFF', '#F6E7D2'], layerOpacity: 0.35 },
};

export interface PremiumGlyphProps {
  name: string;
  size?: number;
  tone?: GlyphTone;
  style?: StyleProp<ViewStyle>;
}

export const PremiumGlyph = React.memo(function PremiumGlyph({ name, size = 40, tone = 'brand', style }: PremiumGlyphProps) {
  // gradient ids must be unique per instance: on web every <svg> shares one DOM id space
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const palette = TONES[tone];
  const shape = glyphShape(name);
  const mainId = `gm${uid}`;
  const layerId = `gl${uid}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" style={style}>
      <Defs>
        <LinearGradient id={mainId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={palette.main[0]} />
          <Stop offset="100%" stopColor={palette.main[1]} />
        </LinearGradient>
        <LinearGradient id={layerId} x1="10%" y1="0%" x2="90%" y2="100%">
          <Stop offset="0%" stopColor={palette.layer[0]} />
          <Stop offset="100%" stopColor={palette.layer[1]} />
        </LinearGradient>
      </Defs>
      <G fill={`url(#${layerId})`} opacity={palette.layerOpacity}>
        {shape.layer.map((d, i) => (
          <Path key={`l${i}`} d={d} />
        ))}
      </G>
      <G fill={`url(#${mainId})`}>
        {shape.main.map((d, i) => (
          <Path key={`m${i}`} d={d} />
        ))}
      </G>
    </Svg>
  );
});

export interface CategoryGlyphProps {
  name: string;
  /** kept for call-site compatibility: categories still store a colour, glyphs use the brand palette */
  color?: string;
  size?: number;
  /** ivory artwork for a selected (solid maroon) tile */
  selected?: boolean;
}

/** Category / subcategory icon without any background tile. */
export const CategoryGlyph = React.memo(function CategoryGlyph({ name, size = 44, selected }: CategoryGlyphProps) {
  return <PremiumGlyph name={name} size={size} tone={selected ? 'light' : 'brand'} />;
});
