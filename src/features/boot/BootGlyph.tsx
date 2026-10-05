import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** The boot glyph from the reference splash: thin ring, a "Q" whose tail turns into a check mark. */
export const BootGlyph = ({ size = 112, color = '#F7F0EA' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="46" stroke={color} strokeWidth="2.2" fill="none" opacity={0.9} />
    <Circle cx="45" cy="50" r="19" stroke={color} strokeWidth="4" fill="none" />
    <Path d="M57 63 L65 71 L84 44" stroke={color} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
