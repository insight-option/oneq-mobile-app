import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import Head from 'expo-router/head';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Header, Screen, SegmentedControl, Text } from '@/components/ui';
import { useLocaleStore } from '@/store/locale';
import { useTheme } from '@/theme/ThemeProvider';
import { LAST_UPDATED, LEGAL, LEGAL_CONTACT, type LegalKind } from './content';

type DocLang = 'ar' | 'en';

/**
 * Public legal page (oneq.qa/privacy, oneq.qa/terms) — reachable without signing in, also opened from the app.
 * The document language follows the app language unless `?lang=en|ar` is given, and can be switched on the page
 * without changing the app language. Each document is laid out in its own direction (Arabic RTL, English LTR).
 */
export const LegalScreen = ({ kind }: { kind: LegalKind }) => {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const appLang = useLocaleStore((s) => s.lang);
  const { colors, spacing } = useTheme();
  const [lang, setLang] = useState<DocLang>(params.lang === 'en' || params.lang === 'ar' ? params.lang : appLang === 'en' ? 'en' : 'ar');
  const doc = LEGAL[kind][lang];
  const rtl = lang === 'ar';
  // physical alignment + font chosen by the document's language, not the app's
  const dir: TextStyle = { textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' };
  const font = (weight: 'regular' | 'semibold' | 'bold'): TextStyle => ({
    fontFamily: rtl ? { regular: 'IBMPlexSansArabic-Regular', semibold: 'IBMPlexSansArabic-SemiBold', bold: 'IBMPlexSansArabic-Bold' }[weight] : { regular: 'Outfit-Regular', semibold: 'Outfit-SemiBold', bold: 'Outfit-Bold' }[weight],
  });
  const other: LegalKind = kind === 'privacy' ? 'terms' : 'privacy';

  return (
    <Screen edges={[]} background={colors.canvas}>
      <Head>
        <title>{`${doc.title} · OneQ`}</title>
        <meta name="description" content={doc.intro.slice(0, 155)} />
      </Head>
      <Header title={doc.title} subtitle="OneQ" variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <SegmentedControl
          value={lang}
          onChange={setLang}
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Card style={[styles.doc, { direction: rtl ? 'rtl' : 'ltr' }]}>
          <View style={{ gap: 6 }}>
            <Text variant="h1" style={[dir, font('bold')]}>
              {doc.title}
            </Text>
            <Text variant="caption" muted style={[dir, font('regular')]}>
              {rtl ? `آخر تحديث: ${LAST_UPDATED.ar}` : `Last updated: ${LAST_UPDATED.en}`}
            </Text>
          </View>
          <Text variant="body" style={[dir, font('regular'), styles.para]}>
            {doc.intro}
          </Text>
          {doc.sections.map((s) => (
            <View key={s.heading} style={styles.section}>
              <Text variant="h3" style={[dir, font('bold')]}>
                {s.heading}
              </Text>
              {(s.paragraphs ?? []).map((p, i) => (
                <Text key={`p${i}`} variant="body" style={[dir, font('regular'), styles.para]}>
                  {p}
                </Text>
              ))}
              {(s.bullets ?? []).map((b, i) => (
                <View key={`b${i}`} style={styles.bullet}>
                  <View style={[styles.dot, { backgroundColor: colors.gold }]} />
                  <Text variant="body" style={[dir, font('regular'), styles.para, { flex: 1 }]}>
                    {b}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </Card>
        <Pressable onPress={() => router.replace({ pathname: `/${other}`, params: { lang } } as never)} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text variant="bodySm" weight="semibold" color={colors.primary}>
            {LEGAL[other][lang].title}
          </Text>
        </Pressable>
        <Text variant="caption" muted align="center">
          {`OneQ · ${LEGAL_CONTACT.city[lang]} · ${LEGAL_CONTACT.email}`}
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  doc: { gap: 18 },
  section: { gap: 8 },
  para: { lineHeight: 26 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 10 },
});
