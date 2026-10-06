import React, { useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, BottomSheet, ListRow, StatusPill, Text, toast, type BottomSheetRef, type IconName } from '@/components/ui';
import { repo } from '@/data';
import { useI18n } from '@/i18n';
import { queryClient } from '@/lib/query';
import { useLocaleStore } from '@/store/locale';
import { useSessionStore } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';

export interface WorkspaceMenuItem {
  icon: IconName;
  label: string;
  route?: string;
  onPress?: () => void;
  danger?: boolean;
}

export interface WorkspaceHeaderProps {
  name: string;
  avatarUrl?: string | null;
  status?: { label: string; tone: 'active' | 'pending' | 'inactive' };
  menu: WorkspaceMenuItem[];
  menuTitle: string;
  /** when true the header shows the OneQ monogram style avatar */
  dark?: boolean;
}

/** Link-2 workspace top bar: menu, avatar + name, status badge, AR/EN toggle. Includes the slide-up menu sheet. */
export const WorkspaceHeader = ({ name, avatarUrl, status, menu, menuTitle, dark }: WorkspaceHeaderProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, setLanguage } = useI18n();
  const lang = useLocaleStore((s) => s.lang);
  const { colors, spacing, radii, shadows } = useTheme();
  const sheet = useRef<BottomSheetRef>(null);

  const toggleLang = async () => {
    toast.info(t('profile.language.restart'));
    await setLanguage(lang === 'ar' ? 'en' : 'ar');
    queryClient.invalidateQueries();
  };

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.line, paddingHorizontal: spacing.gutter }]}>
      {/* phones reach every entry through the "More" tab; the drawer toggle is a desktop/web affordance */}
      {Platform.OS === 'web' ? (
        <Pressable onPress={() => sheet.current?.open()} style={[styles.menuBtn, { borderRadius: radii.pill }]} hitSlop={6} accessibilityLabel={menuTitle}>
          <View style={[styles.menuLine, { backgroundColor: colors.ink }]} />
          <View style={[styles.menuLine, { backgroundColor: colors.ink, width: 14 }]} />
          <View style={[styles.menuLine, { backgroundColor: colors.ink }]} />
        </Pressable>
      ) : null}
      <Avatar uri={avatarUrl} name={name} size={36} dark={dark} />
      <Text variant="title" weight="bold" style={{ flex: 1 }} lines={1}>
        {name}
      </Text>
      {status ? <StatusPill status={status.tone} label={status.label} /> : null}
      <Pressable onPress={toggleLang} style={[styles.langPill, { borderColor: colors.line, backgroundColor: colors.surface, borderRadius: radii.pill }]}>
        <View style={[styles.langSeg, { backgroundColor: lang === 'ar' ? colors.primary : 'transparent', borderRadius: radii.pill }]}>
          <Text variant="caption" weight="bold" color={lang === 'ar' ? colors.onPrimary : colors.muted}>
            {t('common.arabic')}
          </Text>
        </View>
        <View style={[styles.langSeg, { backgroundColor: lang === 'en' ? colors.primary : 'transparent', borderRadius: radii.pill }]}>
          <Text variant="caption" weight="bold" color={lang === 'en' ? colors.onPrimary : colors.muted} numeric>
            {t('common.english')}
          </Text>
        </View>
      </Pressable>
      <BottomSheet ref={sheet} title={menuTitle} height={0.8}>
        <View style={[{ borderRadius: radii.card, overflow: 'hidden', backgroundColor: colors.surface }, shadows.card]}>
          {menu.map((item, i) => (
            <ListRow
              key={item.label}
              icon={item.icon}
              title={item.label}
              danger={item.danger}
              divider={i < menu.length - 1}
              chevron={!item.danger}
              onPress={() => {
                sheet.current?.close();
                if (item.onPress) item.onPress();
                else if (item.route) router.push(item.route as never);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </View>
  );
};

export const useWorkspaceSignOut = () => {
  const router = useRouter();
  return async () => {
    await repo.auth.signOut();
    useSessionStore.getState().setSession(null);
    queryClient.clear();
    router.replace('/(auth)/welcome' as never);
  };
};

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', gap: 4 },
  menuLine: { width: 20, height: 2, borderRadius: 1 },
  langPill: { flexDirection: 'row', alignItems: 'center', padding: 3, borderWidth: 1 },
  langSeg: { paddingHorizontal: 10, height: 26, alignItems: 'center', justifyContent: 'center' },
});
