import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { brand } from '@/theme/tokens';

export default function NotFound() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <View style={styles.root}>
      <Image source={require('../../assets/brand/wordmark-maroon.png')} style={styles.wordmark} contentFit="contain" />
      <Text variant="display" numeric color="#E3C3CE" style={styles.code}>
        404
      </Text>
      <Text variant="h2" align="center">
        {t('notFound.title')}
      </Text>
      <Text variant="bodySm" muted align="center">
        {t('notFound.body')}
      </Text>
      <Button label={t('notFound.home')} leftIcon="arrow-left" onPress={() => router.replace('/')} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.cream, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  wordmark: { width: 110, height: 36, marginBottom: 20 },
  code: { fontSize: 64, lineHeight: 72 },
});
