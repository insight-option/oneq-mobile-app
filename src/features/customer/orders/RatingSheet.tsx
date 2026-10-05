import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, BottomSheet, Button, RatingStars, Text, TextArea, toast, type BottomSheetRef } from '@/components/ui';
import { useRateBooking } from '@/data/hooks';
import type { Booking } from '@/domain/types';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

export interface RatingSheetRef {
  open: (booking: Booking) => void;
}

/** Rate the company (and the staff member when one served the booking). */
export const RatingSheet = forwardRef<RatingSheetRef>(function RatingSheet(_, ref) {
  const sheet = useRef<BottomSheetRef>(null);
  const { t, localized } = useI18n();
  const { spacing, colors } = useTheme();
  const rate = useRateBooking();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [companyRating, setCompanyRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [staffRating, setStaffRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState('');

  useImperativeHandle(ref, () => ({
    open: (b) => {
      setBooking(b);
      setCompanyRating(5);
      setStaffRating(5);
      setComment('');
      sheet.current?.open();
    },
  }));

  const submit = async () => {
    if (!booking) return;
    try {
      await rate.mutateAsync({ bookingId: booking.id, companyRating, companyComment: comment.trim() || undefined, staffRating: booking.staffId ? staffRating : undefined });
      haptic.success();
      toast.success(t('rating.thanks'));
      sheet.current?.close();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <BottomSheet ref={sheet} title={t('rating.title')}>
      {booking ? (
        <View style={{ gap: spacing.lg, paddingBottom: spacing.sm }}>
          <View style={styles.block}>
            <Avatar uri={booking.companyLogoUrl} name={localized(booking.companyName)} size={56} rounded="squircle" />
            <Text variant="title" weight="semibold" align="center">
              {t('rating.company', { name: localized(booking.companyName) })}
            </Text>
            <RatingStars value={companyRating} size={34} onChange={setCompanyRating} gap={8} />
          </View>
          {booking.staffId && booking.staffName ? (
            <View style={[styles.block, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: spacing.md }]}>
              <Text variant="title" weight="semibold" align="center">
                {t('rating.staffMember', { name: localized(booking.staffName) })}
              </Text>
              <RatingStars value={staffRating} size={30} onChange={setStaffRating} gap={8} />
            </View>
          ) : null}
          <TextArea label={t('rating.comment')} placeholder={t('rating.commentPlaceholder')} value={comment} onChangeText={setComment} />
          <Button label={t('rating.submit')} size="lg" fullWidth loading={rate.isPending} onPress={submit} />
        </View>
      ) : null}
    </BottomSheet>
  );
});

const styles = StyleSheet.create({ block: { alignItems: 'center', gap: 10 } });
