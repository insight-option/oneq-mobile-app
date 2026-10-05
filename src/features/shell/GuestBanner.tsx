import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { requireAuth, useIsSignedIn } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';

/** Thin tinted strip shown to guests on customer screens. */
export const GuestBanner = ({ inset = 16 }: { inset?: number }) => {
  const signedIn = useIsSignedIn();
  const { t } = useI18n();
  const { colors, radii } = useTheme();
  if (signedIn) return null;
  return (
    <Pressable onPress={() => void requireAuth('generic')} style={[styles.banner, { backgroundColor: colors.tint, borderRadius: radii.md, marginHorizontal: inset }]}>
      <Icon name="user-round" size={18} color={colors.primary} />
      <Text variant="caption" weight="semibold" color={colors.primary} style={{ flex: 1 }} lines={2}>
        {t('home.guestBanner')}
      </Text>
      <View style={[styles.cta, { backgroundColor: colors.primary }]}>
        <Text variant="caption" weight="bold" color={colors.onPrimary}>
          {t('home.guestBannerCta')}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  cta: { paddingHorizontal: 10, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
