import React, { useCallback, useEffect, useRef, useState } from 'react';
import { I18nManager, Platform, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useAppWidth } from '@/lib/layout';
import { useTheme } from '@/theme/ThemeProvider';

export interface CarouselProps<T> {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  height: number;
  autoPlayMs?: number;
  /** horizontal padding inside each page; pages are full window width so native paging stays aligned in RTL */
  gutter?: number;
  showDots?: boolean;
  dotsLight?: boolean;
}

/**
 * Android reports horizontal scroll offsets from the physical left edge even in RTL layouts (page 0 sits at the
 * far right), while iOS mirrors the scroll view so offsets are logical. This maps logical page <-> physical page.
 */
const PHYSICAL_RTL_OFFSETS = Platform.OS === 'android';

/** Paged hero carousel. Renders every slide (no virtualization: a handful of slides) so RTL paging never leaves gaps. */
export function Carousel<T>({ data, renderItem, keyExtractor, height, autoPlayMs = 4200, gutter = 16, showDots = true, dotsLight }: CarouselProps<T>) {
  const { colors } = useTheme();
  const width = useAppWidth();
  const ref = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const paused = useRef(false);
  const count = data.length;
  const toPhysical = useCallback((i: number) => (PHYSICAL_RTL_OFFSETS && I18nManager.isRTL ? count - 1 - i : i), [count]);

  useEffect(() => {
    if (!autoPlayMs || count < 2) return;
    const id = setInterval(() => {
      if (paused.current) return;
      const next = (indexRef.current + 1) % count;
      ref.current?.scrollTo({ x: toPhysical(next) * width, animated: true });
    }, autoPlayMs);
    return () => clearInterval(id);
  }, [autoPlayMs, count, width, toPhysical]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!width) return;
      const physical = Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
      const logical = toPhysical(physical);
      if (logical !== indexRef.current) {
        indexRef.current = logical;
        setIndex(logical);
      }
    },
    [width, count, toPhysical],
  );

  return (
    <View>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onTouchStart={() => {
          paused.current = true;
        }}
        onTouchEnd={() => {
          paused.current = false;
        }}
        onMomentumScrollEnd={() => {
          paused.current = false;
        }}>
        {data.map((item, i) => (
          <View key={keyExtractor(item, i)} style={{ width, height, paddingHorizontal: gutter }}>
            {renderItem({ item, index: i })}
          </View>
        ))}
      </ScrollView>
      {showDots && count > 1 ? (
        <View style={styles.dots}>
          {data.map((_, i) => (
            <View key={i} style={{ width: i === index ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? (dotsLight ? '#FFFFFF' : colors.primary) : dotsLight ? 'rgba(255,255,255,0.4)' : colors.lineStrong }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 } });
