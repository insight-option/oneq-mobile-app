import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Icon, ProgressBar, Text } from '@/components/ui';
import { useMyCompany } from '@/data/hooks';
import type { Company } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { useWorkspaceSignOut, WorkspaceHeader } from './WorkspaceHeader';

export const completionOf = (c: Company) => {
  const items = [c.completion.location, c.completion.hours, c.completion.catalog, c.completion.media];
  return { done: items.filter(Boolean).length, total: items.length, complete: items.every(Boolean) };
};

/** Header for all company tabs (reads the owner's company). */
export const CompanyHeader = () => {
  const { t, localized } = useI18n();
  const company = useMyCompany();
  const signOut = useWorkspaceSignOut();
  const c = company.data;
  const completion = c ? completionOf(c) : null;
  const status = c ? (c.isActive ? { label: t('cw.status.active'), tone: 'active' as const } : completion?.complete ? { label: t('cw.status.inactive'), tone: 'inactive' as const } : { label: t('cw.status.incomplete'), tone: 'pending' as const }) : undefined;
  const menu = [
    { icon: 'briefcase' as const, label: t('cw.more.profile'), route: '/(company)/profile' },
    { icon: 'map-pin' as const, label: t('cw.more.location'), route: '/(company)/location' },
    { icon: 'clock' as const, label: t('cw.more.hours'), route: '/(company)/hours' },
    { icon: 'image' as const, label: t('cw.more.media'), route: '/(company)/media' },
    { icon: 'repeat' as const, label: t('cw.more.subscriptions'), route: '/(company)/subscriptions' },
    { icon: 'star' as const, label: t('cw.more.reviews'), route: '/(company)/reviews' },
    { icon: 'chart-line' as const, label: t('cw.more.analytics'), route: '/(company)/analytics' },
    { icon: 'bell' as const, label: t('cw.more.notifications'), route: '/(company)/notifications' },
    { icon: 'log-out' as const, label: t('cw.more.logout'), onPress: () => void signOut(), danger: true },
  ];
  return <WorkspaceHeader name={c ? localized(c.name) : 'OneQ'} avatarUrl={c?.logoUrl} status={status} menu={menu} menuTitle={t('cw.menu.title')} dark />;
};

/** Profile completion card shown on the dashboard until the company is live. */
export const CompletionChecklist = ({ company }: { company: Company }) => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing, radii } = useTheme();
  const completion = completionOf(company);
  if (completion.complete && company.isActive) return null;
  const items: { key: keyof Company['completion']; label: string; route: string }[] = [
    { key: 'location', label: t('cw.completion.location'), route: '/(company)/location' },
    { key: 'hours', label: t('cw.completion.hours'), route: '/(company)/hours' },
    { key: 'catalog', label: t('cw.completion.catalog'), route: '/(company)/(tabs)/catalog' },
    { key: 'media', label: t('cw.completion.media'), route: '/(company)/media' },
  ];
  return (
    <Card style={{ gap: spacing.md, borderWidth: 1, borderColor: colors.goldTint }} background={colors.surface}>
      <View style={styles.row}>
        <Icon name="circle-alert" size={20} color={colors.gold} />
        <Text variant="title" weight="bold" style={{ flex: 1 }}>
          {completion.complete ? t('cw.completion.done') : t('cw.completion.title')}
        </Text>
        <Text variant="caption" numeric weight="bold" color={colors.gold}>
          {completion.done}/{completion.total}
        </Text>
      </View>
      <ProgressBar value={completion.done / completion.total} color={colors.gold} />
      {!completion.complete ? (
        <Text variant="caption" muted>
          {t('cw.completion.body')}
        </Text>
      ) : (
        <Text variant="caption" muted>
          {t('cw.profile.activeHint')}
        </Text>
      )}
      <View style={{ gap: 6 }}>
        {items.map((it) => {
          const done = company.completion[it.key];
          return (
            <View key={it.key} style={[styles.row, { backgroundColor: done ? colors.successTint : colors.surfaceAlt, borderRadius: radii.sm, padding: 10 }]}>
              <Icon name={done ? 'circle-check' : 'chevron-left'} size={18} color={done ? colors.success : colors.muted} />
              <Text variant="bodySm" weight="semibold" color={done ? colors.success : colors.ink} style={{ flex: 1 }} onPress={() => router.push(it.route as never)}>
                {it.label}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 } });
