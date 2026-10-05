import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { hashString } from '@/lib/ids';
import { initials } from '@/lib/text';
import { Text } from './Text';

const TINTS = ['#F3E6E6', '#F7E8DC', '#E3EFE5', '#E3EAF0', '#FBE8ED', '#F1E7DD'];
const INKS = ['#5A0020', '#9A4516', '#2F6B40', '#2F4F6B', '#B4552E', '#45001A'];

export interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  /** dark variant (maroon background, cream initials) like the owner logo in the reference */
  dark?: boolean;
  rounded?: 'circle' | 'squircle';
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
}

export const Avatar = React.memo(function Avatar({ uri, name = '', size = 44, dark, rounded = 'circle', style, bordered }: AvatarProps) {
  const { colors } = useTheme();
  const radius = rounded === 'circle' ? size / 2 : size * 0.28;
  const idx = hashString(name) % TINTS.length;
  const bg = dark ? colors.primaryDeep : TINTS[idx];
  const fg = dark ? brand.goldBright : INKS[idx];
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, backgroundColor: bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, bordered ? { borderWidth: 2, borderColor: colors.surface } : null, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} cachePolicy="memory-disk" recyclingKey={uri} />
      ) : (
        <Text variant={size >= 56 ? 'h2' : size >= 40 ? 'title' : 'caption'} weight="bold" color={fg} style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}>
          {initials(name) || '•'}
        </Text>
      )}
    </View>
  );
});
