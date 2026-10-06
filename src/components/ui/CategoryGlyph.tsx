import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { IconProps as PhosphorProps } from 'phosphor-react-native';
import { BabyIcon } from 'phosphor-react-native/src/icons/Baby';
import { BarbellIcon } from 'phosphor-react-native/src/icons/Barbell';
import { BathtubIcon } from 'phosphor-react-native/src/icons/Bathtub';
import { BroomIcon } from 'phosphor-react-native/src/icons/Broom';
import { BuildingsIcon } from 'phosphor-react-native/src/icons/Buildings';
import { CarIcon } from 'phosphor-react-native/src/icons/Car';
import { DiamondIcon } from 'phosphor-react-native/src/icons/Diamond';
import { DropIcon } from 'phosphor-react-native/src/icons/Drop';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { FirstAidIcon } from 'phosphor-react-native/src/icons/FirstAid';
import { FlowerIcon } from 'phosphor-react-native/src/icons/Flower';
import { HairDryerIcon } from 'phosphor-react-native/src/icons/HairDryer';
import { HammerIcon } from 'phosphor-react-native/src/icons/Hammer';
import { HeartbeatIcon } from 'phosphor-react-native/src/icons/Heartbeat';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { LeafIcon } from 'phosphor-react-native/src/icons/Leaf';
import { PaintBrushIcon } from 'phosphor-react-native/src/icons/PaintBrush';
import { PillIcon } from 'phosphor-react-native/src/icons/Pill';
import { ScissorsIcon } from 'phosphor-react-native/src/icons/Scissors';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { StethoscopeIcon } from 'phosphor-react-native/src/icons/Stethoscope';
import { SyringeIcon } from 'phosphor-react-native/src/icons/Syringe';
import { ToothIcon } from 'phosphor-react-native/src/icons/Tooth';
import { WrenchIcon } from 'phosphor-react-native/src/icons/Wrench';
import { Icon, isIconName, type IconName } from './icons';

/**
 * Category / subcategory glyph: a gradient rounded-square tile with a two-tone (duotone) Phosphor icon, falling back
 * to the regular lucide outline for names without a duotone counterpart. Icons are imported one by one on purpose —
 * the package index would pull every icon into the bundle.
 */
const DUOTONE: Record<string, React.FC<PhosphorProps>> = {
  stethoscope: StethoscopeIcon,
  'heart-pulse': HeartbeatIcon,
  activity: HeartbeatIcon,
  dumbbell: BarbellIcon,
  scissors: ScissorsIcon,
  house: HouseIcon,
  'building-2': BuildingsIcon,
  store: BuildingsIcon,
  sparkles: SparkleIcon,
  brush: PaintBrushIcon,
  paintbrush: PaintBrushIcon,
  gem: DiamondIcon,
  eye: EyeIcon,
  'flower-2': FlowerIcon,
  bath: BathtubIcon,
  droplets: DropIcon,
  waves: DropIcon,
  baby: BabyIcon,
  car: CarIcon,
  wrench: WrenchIcon,
  hammer: HammerIcon,
  trees: LeafIcon,
  syringe: SyringeIcon,
  pill: PillIcon,
  smile: ToothIcon,
  wind: HairDryerIcon,
  shield: FirstAidIcon,
  broom: BroomIcon,
};

/** Mix a hex colour with white (0 = colour, 1 = white) for the light end of the gradient. */
const lighten = (hex: string, amount: number): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 0xff) + (255 - ((n >> shift) & 0xff)) * amount);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
};

export interface CategoryGlyphProps {
  name: IconName | string;
  color: string;
  size?: number;
  /** inverted (translucent white) look on a solid maroon tile */
  selected?: boolean;
}

export const CategoryGlyph = React.memo(function CategoryGlyph({ name, color, size = 54, selected }: CategoryGlyphProps) {
  const Duo = DUOTONE[name];
  const iconSize = Math.round(size * 0.52);
  const gradient: [string, string] = selected ? ['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.12)'] : [lighten(color, 0.22), color];
  return (
    <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size * 0.34) }]}>
      {Duo ? <Duo size={iconSize} color="#FFFFFF" weight="duotone" duotoneColor="#FFFFFF" duotoneOpacity={0.38} /> : <Icon name={isIconName(name) ? name : 'sparkles'} size={iconSize} color="#FFFFFF" strokeWidth={2} />}
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
