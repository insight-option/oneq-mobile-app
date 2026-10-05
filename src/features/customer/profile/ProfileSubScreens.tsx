import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Avatar, Button, Card, Divider, EmptyState, Header, Icon, IconBubble, Input, ListRow, Screen, Select, Switch, Text, TextArea, toast } from '@/components/ui';
import { repo, DATA_MODE } from '@/data';
import { useMe, useUpdateMe } from '@/data/hooks';
import type { SavedAddress } from '@/domain/types';
import { AREA_KEYS, useI18n } from '@/i18n';
import { formatPhone } from '@/lib/phone';
import { id as makeId } from '@/lib/ids';
import { queryClient } from '@/lib/query';
import { useLocaleStore } from '@/store/locale';
import { useSession } from '@/store/session';
import { useTheme } from '@/theme/ThemeProvider';

/* ---------- Edit profile ---------- */
export const EditProfileScreen = () => {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const session = useSession();
  const me = useMe();
  const update = useUpdateMe();
  const [name, setName] = useState(me.data?.name ?? session?.name ?? '');
  const [email, setEmail] = useState(me.data?.email ?? session?.email ?? '');
  const [avatar, setAvatar] = useState<string | null>(me.data?.avatarUrl ?? null);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const url = await repo.profile.uploadImage(res.assets[0].uri, 'avatar');
    setAvatar(url);
  };
  const save = async () => {
    try {
      await update.mutateAsync({ name: name.trim(), email: email.trim() || null, avatarUrl: avatar });
      toast.success(t('profile.edit.saved'));
      router.back();
    } catch {
      toast.error(t('common.error'));
    }
  };
  return (
    <Screen edges={[]} background={colors.canvas} keyboard>
      <Header title={t('profile.edit.title')} variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.lg }}>
        <Pressable onPress={pick} style={{ alignItems: 'center', gap: 8 }}>
          <Avatar uri={avatar} name={name || 'U'} size={96} />
          <Text variant="bodySm" weight="semibold" color={colors.primary}>
            {t('profile.edit.avatar')}
          </Text>
        </Pressable>
        <Input label={t('profile.edit.name')} value={name} onChangeText={setName} leftIcon="user" />
        <Input label={t('profile.edit.phone')} value={formatPhone(session?.phone ?? '')} editable={false} leftIcon="smartphone" helper={t('profile.edit.phoneHint')} ltr />
        <Input label={t('profile.edit.email')} value={email} onChangeText={setEmail} leftIcon="mail" keyboardType="email-address" autoCapitalize="none" ltr />
        <Button label={t('common.save')} size="lg" fullWidth loading={update.isPending} onPress={save} />
      </View>
    </Screen>
  );
};

/* ---------- Addresses ---------- */
export const AddressesScreen = () => {
  const { t, areaName } = useI18n();
  const { colors, spacing } = useTheme();
  const me = useMe();
  const update = useUpdateMe();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ label: string; area: string | null; details: string }>({ label: '', area: null, details: '' });
  const addresses = me.data?.addresses ?? [];

  const persist = async (next: SavedAddress[], msg: string) => {
    try {
      await update.mutateAsync({ addresses: next });
      toast.success(msg);
    } catch {
      toast.error(t('common.error'));
    }
  };
  const add = async () => {
    if (!form.area || !form.details.trim()) {
      toast.error(t('booking.errors.address'));
      return;
    }
    await persist([...addresses, { id: makeId('addr'), label: form.label.trim() || t('profile.addresses.title'), area: form.area, details: form.details.trim(), location: null }], t('common.saved'));
    setForm({ label: '', area: null, details: '' });
    setAdding(false);
  };
  return (
    <Screen edges={[]} background={colors.canvas} keyboard>
      <Header title={t('profile.addresses.title')} variant="maroon" compact right={<Button label={t('common.add')} size="sm" variant="glass" leftIcon="plus" onPress={() => setAdding((v) => !v)} />} />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        {adding ? (
          <Card style={{ gap: spacing.md }}>
            <Input label={t('profile.addresses.label')} value={form.label} onChangeText={(v) => setForm((f) => ({ ...f, label: v }))} leftIcon="tag" placeholder="المنزل" />
            <Select label={t('profile.addresses.area')} value={form.area} onChange={(v) => setForm((f) => ({ ...f, area: v }))} options={AREA_KEYS.map((k) => ({ value: k, label: areaName(k), icon: 'map-pin' as const }))} placeholder={t('common.select')} />
            <TextArea label={t('profile.addresses.details')} value={form.details} onChangeText={(v) => setForm((f) => ({ ...f, details: v }))} />
            <Button label={t('common.save')} loading={update.isPending} onPress={add} />
          </Card>
        ) : null}
        {addresses.map((a) => (
          <Card key={a.id} padding={spacing.md} style={styles.row}>
            <IconBubble name="map-pin" size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="semibold">
                {a.label}
              </Text>
              <Text variant="caption" muted lines={2}>
                {areaName(a.area)} · {a.details}
              </Text>
            </View>
            <Pressable onPress={() => persist(addresses.filter((x) => x.id !== a.id), t('common.deleted'))} hitSlop={8}>
              <Icon name="trash-2" size={20} color={colors.danger} />
            </Pressable>
          </Card>
        ))}
        {!addresses.length && !adding ? <EmptyState icon="map-pin" title={t('profile.addresses.empty')} body={t('profile.addresses.emptyBody')} actionLabel={t('profile.addresses.add')} onAction={() => setAdding(true)} /> : null}
      </View>
    </Screen>
  );
};

/* ---------- Language ---------- */
export const LanguageScreen = ({ workspace }: { workspace?: boolean }) => {
  const { t, setLanguage } = useI18n();
  const lang = useLocaleStore((s) => s.lang);
  const { colors, spacing, radii } = useTheme();
  const choose = async (l: 'ar' | 'en') => {
    if (l === lang) return;
    toast.info(t('profile.language.restart'));
    const reloaded = await setLanguage(l);
    if (!reloaded) queryClient.invalidateQueries();
  };
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('profile.language.title')} variant={workspace ? 'workspace' : 'maroon'} compact />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        {(
          [
            { l: 'ar', label: t('profile.language.ar'), flag: '🇶🇦' },
            { l: 'en', label: t('profile.language.en'), flag: '🇬🇧' },
          ] as const
        ).map((o) => (
          <Pressable key={o.l} onPress={() => choose(o.l)} style={[styles.row, { backgroundColor: lang === o.l ? colors.tint : colors.surface, borderColor: lang === o.l ? colors.primary : colors.line, borderWidth: 1, borderRadius: radii.card, padding: spacing.lg }]}>
            <Text variant="h2">{o.flag}</Text>
            <Text variant="title" weight="semibold" style={{ flex: 1 }}>
              {o.label}
            </Text>
            {lang === o.l ? <Icon name="circle-check" size={22} color={colors.primary} /> : null}
          </Pressable>
        ))}
        <Text variant="caption" muted>
          {t('profile.language.restart')}
        </Text>
      </View>
    </Screen>
  );
};

/* ---------- Settings ---------- */
const SETTINGS_KEY = 'oneq.settings.v1';
export const SettingsScreen = () => {
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const [prefs, setPrefs] = useState({ notifications: true, offers: true, bookings: true });
  React.useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((v) => v && setPrefs(JSON.parse(v) as typeof prefs)).catch(() => undefined);
  }, []);
  const toggle = (key: keyof typeof prefs) => (v: boolean) => {
    const next = { ...prefs, [key]: v };
    setPrefs(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => undefined);
  };
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('profile.settings.title')} variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        <Card padding={0}>
          <ListRow icon="bell" title={t('profile.settings.notifications')} chevron={false} trailing={<Switch value={prefs.notifications} onValueChange={toggle('notifications')} />} divider />
          <ListRow icon="tag" title={t('profile.settings.offers')} chevron={false} trailing={<Switch value={prefs.offers} onValueChange={toggle('offers')} />} divider />
          <ListRow icon="calendar-check" title={t('profile.settings.bookings')} chevron={false} trailing={<Switch value={prefs.bookings} onValueChange={toggle('bookings')} />} />
        </Card>
        <Card padding={0}>
          <ListRow
            icon="refresh-cw"
            title={t('profile.settings.clearCache')}
            chevron={false}
            onPress={async () => {
              queryClient.clear();
              await AsyncStorage.removeItem('oneq.query.v1').catch(() => undefined);
              toast.success(t('profile.settings.cleared'));
            }}
            divider
          />
          <ListRow icon="info" title={t('profile.settings.version')} value={Constants.expoConfig?.version ?? '1.0.0'} chevron={false} divider />
          <ListRow icon="settings-2" title={t('profile.settings.dataMode')} value={DATA_MODE} chevron={false} />
        </Card>
      </View>
    </Screen>
  );
};

/* ---------- Help ---------- */
export const HelpScreen = () => {
  const { t } = useI18n();
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [1, 2, 3, 4] as const;
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('profile.help.title')} variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        <Text variant="h3">{t('profile.help.faq')}</Text>
        <Card padding={0}>
          {faqs.map((n, i) => (
            <View key={n}>
              <Pressable onPress={() => setOpen(open === i ? null : i)} style={[styles.row, { padding: spacing.lg }]}>
                <Text variant="title" weight="semibold" style={{ flex: 1 }}>
                  {t(`profile.help.q${n}` as 'profile.help.q1')}
                </Text>
                <Icon name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.faint} rtlAware={false} />
              </Pressable>
              {open === i ? (
                <Text variant="bodySm" muted style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
                  {t(`profile.help.a${n}` as 'profile.help.a1')}
                </Text>
              ) : null}
              {i < faqs.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>
        <Text variant="h3">{t('profile.help.contact')}</Text>
        <Button label={t('profile.help.whatsapp')} leftIcon="message-circle-more" variant="secondary" fullWidth onPress={() => Linking.openURL('https://wa.me/97444000000?text=' + encodeURIComponent('مرحبًا OneQ، أحتاج مساعدة')).catch(() => undefined)} />
      </View>
    </Screen>
  );
};

/* ---------- Privacy ---------- */
export const PrivacyScreen = () => {
  const { t } = useI18n();
  const lang = useLocaleStore((s) => s.lang);
  const { colors, spacing } = useTheme();
  const paragraphs =
    lang === 'ar'
      ? [
          'نلتزم في OneQ بحماية خصوصيتك. نجمع رقم جوالك وبريدك الإلكتروني واسمك لإنشاء حسابك وتأكيد حجوزاتك وإرسال الهدايا.',
          'نستخدم موقعك فقط لعرض أقرب الشركات إليك، ولا نشاركه مع أي طرف ثالث.',
          'تُشارك بيانات الحجز (الاسم، رقم الجوال، العنوان للخدمات المنزلية) مع الشركة التي تحجز لديها لتنفيذ الخدمة.',
          'يمكنك طلب حذف حسابك وبياناتك في أي وقت عبر مركز المساعدة.',
        ]
      : [
          'OneQ is committed to protecting your privacy. We collect your phone number, email and name to create your account, confirm bookings and send gifts.',
          'Your location is used only to show the nearest companies and is never shared with third parties.',
          'Booking data (name, phone, address for home services) is shared with the company you book with to deliver the service.',
          'You can request deletion of your account and data at any time through the help center.',
        ];
  return (
    <Screen edges={[]} background={colors.canvas}>
      <Header title={t('profile.privacy.title')} variant="maroon" compact />
      <View style={{ padding: spacing.gutter, gap: spacing.md }}>
        <Card style={{ gap: spacing.md }}>
          {paragraphs.map((p, i) => (
            <Text key={i} variant="body">
              {p}
            </Text>
          ))}
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 } });
