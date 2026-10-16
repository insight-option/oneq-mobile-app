import React, { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { glyphShape, hasGlyphShape } from './glyphPaths';

/**
 * Premium glyphs: fine-line artwork (rounded strokes, like an engraved jeweller's mark) with NO background tile — a
 * warm oxblood-to-cocoa gradient line over a faint champagne wash inside the shape. Category / subcategory records keep
 * their lucide-style icon names (admin picker, seed data); glyphPaths.ts maps them to the artwork.
 */
export const hasPremiumGlyph = hasGlyphShape;

/**
 * brand: oxblood line + champagne wash, for light surfaces (default)
 * light: ivory line + warm-gold wash, for maroon surfaces (selected tile, gift card)
 * gold:  gold line + ivory wash, for accents on maroon
 */
export type GlyphTone = 'brand' | 'light' | 'gold';

const TONES: Record<GlyphTone, { main: [string, string]; layer: [string, string]; layerOpacity: number }> = {
  brand: { main: ['#7E2F27', '#3A1211'], layer: ['#F4DDB4', '#D8A964'], layerOpacity: 0.34 },
  light: { main: ['#FFF9F2', '#EBD7BE'], layer: ['#FCE6B8', '#E7B96E'], layerOpacity: 0.2 },
  gold: { main: ['#F7DDA6', '#C8893A'], layer: ['#FFFFFF', '#F6E7D2'], layerOpacity: 0.25 },
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
