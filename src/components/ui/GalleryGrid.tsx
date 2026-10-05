import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './icons';
import { Text } from './Text';

export interface GalleryGridProps {
  urls: string[];
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  onMove?: (from: number, to: number) => void;
  addLabel?: string;
  columns?: number;
  max?: number;
}

/** Image grid with add tile (dashed), delete and reorder arrows (link-2 media page). */
export const GalleryGrid = ({ urls, onAdd, onRemove, onMove, addLabel, columns = 2, max = 12 }: GalleryGridProps) => {
  const { colors, radii } = useTheme();
  const canAdd = Boolean(onAdd) && urls.length < max;
  return (
    <View style={styles.grid}>
      {urls.map((uri, i) => (
        <View key={`${uri}-${i}`} style={[styles.tile, { width: `${100 / columns - 2}%`, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }]}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={uri} />
          <View style={[styles.index, { backgroundColor: 'rgba(21,16,16,0.6)' }]}>
            <Text variant="caption" numeric color="#FFFFFF" weight="bold">
              {i + 1}
            </Text>
          </View>
          <View style={styles.actions}>
            {onRemove ? (
              <Pressable onPress={() => onRemove(i)} style={styles.action}>
                <Icon name="trash-2" size={16} color={colors.danger} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }} />
            {onMove ? (
              <>
                <Pressable disabled={i === 0} onPress={() => onMove(i, i - 1)} style={[styles.action, { opacity: i === 0 ? 0.4 : 1 }]}>
                  <Icon name="chevron-right" size={16} color={colors.ink} />
                </Pressable>
                <Pressable disabled={i === urls.length - 1} onPress={() => onMove(i, i + 1)} style={[styles.action, { opacity: i === urls.length - 1 ? 0.4 : 1 }]}>
                  <Icon name="chevron-left" size={16} color={colors.ink} />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      ))}
      {canAdd ? (
        <Pressable onPress={onAdd} style={[styles.tile, styles.addTile, { width: `${100 / columns - 2}%`, borderRadius: radii.md, borderColor: colors.lineStrong }]}>
          <Icon name="image-plus" size={28} color={colors.muted} />
          {addLabel ? (
            <Text variant="bodySm" muted>
              {addLabel}
            </Text>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { aspectRatio: 1, overflow: 'hidden' },
  index: { position: 'absolute', top: 8, end: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { position: 'absolute', bottom: 8, start: 8, end: 8, flexDirection: 'row', gap: 6 },
  action: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  addTile: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
