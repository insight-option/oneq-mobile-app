import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

export interface GiftVoucherProps {
  senderName: string;
  itemLabel: string;
  companyLabel?: string | null;
  amountLabel?: string | null;
  message?: string | null;
  kind: 'POINTS' | 'SERVICE' | 'PRODUCT';
  code?: string;
}

/** Premium gift voucher card (maroon → gold) used in the send preview, gift details and the gifts hub. */
export const GiftVoucher = ({ senderName, itemLabel, companyLabel, amountLabel, message, kind, code }: GiftVoucherProps) => {
  const { radii, shadows } = useTheme();
  const { t } = useI18n();
  return (
    <LinearGradient colors={[brand.maroonLight, brand.maroon, '#8A4A1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radii.media, padding: 20, overflow: 'hidden' }, shadows.elevated]}>
      <View style={styles.decorA} />
      <View style={styles.decorB} />
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <Icon name={kind === 'POINTS' ? 'coins' : kind === 'PRODUCT' ? 'package' : 'sparkles'} size={22} color={brand.goldBright} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="rgba(255,255,255,0.75)">
            {t('gifts.voucher')}
          </Text>
          <Text variant="bodySm" weight="semibold" color="#FFFFFF">
            {t('gifts.send.from', { name: senderName })}
          </Text>
        </View>
        <Icon name="gift" size={28} color="rgba(255,255,255,0.35)" />
      </View>
      <View style={{ marginTop: 18, gap: 4 }}>
        <Text variant="h2" color="#FFFFFF" lines={2}>
          {itemLabel}
        </Text>
        {companyLabel ? (
          <Text variant="bodySm" color="rgba(255,255,255,0.8)">
            {companyLabel}
          </Text>
        ) : null}
        {amountLabel ? (
          <Text variant="h3" numeric color={brand.goldBright}>
            {amountLabel}
          </Text>
        ) : null}
      </View>
      {message ? (
        <View style={styles.message}>
          <Text variant="bodySm" color="rgba(255,255,255,0.92)" style={{ fontStyle: 'italic' }}>
            “{message}”
          </Text>
        </View>
      ) : null}
      {code ? (
        <View style={styles.codeRow}>
          <Icon name="ticket" size={14} color="rgba(255,255,255,0.7)" />
          <Text variant="caption" numeric color="rgba(255,255,255,0.7)">
            {code}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  decorA: { position: 'absolute', top: -70, end: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' },
  decorB: { position: 'absolute', bottom: -90, start: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(242,178,92,0.14)' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  message: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.18)' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
});
