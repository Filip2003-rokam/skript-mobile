import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { colors, fontSize, fonts, pressScale, radius, shadow, size, space } from '../constants/theme';
import { useCurrentEvent } from '../lib/currentEvent';
import { authErrorMessage, signOut } from '../lib/services/authService';
import { getEventBySlug } from '../lib/services/eventService';
import { getMyEventProfile } from '../lib/services/attendeeService';
import { getMyProfile, listMyEventStats, saveMyLanguage, updateMyProfile, type EventStat, type MyProfile } from '../lib/services/profileService';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { EventHero } from './ui/EventHero';
import { Screen } from './ui/Screen';
import { SkriptMark } from './ui/SkriptMark';
import { ErrorState, InlineError, LoadingState } from './ui/State';
import { ContactList } from './profile/ContactList';
import { ReminderSetting } from './profile/ReminderSetting';
import { EditProfile } from './profile/EditProfile';
import { EventCards } from './profile/EventCards';
import { appLanguage, setAppLanguage, t } from '../lib/i18n';
import { Segmented } from './ui/Segmented';

// Getteri: tekst se čita na crtanju, pa prati izabrani jezik.
const notices: Record<string, string> = {
  get saved() { return t('common.saved'); },
  get edited() { return t('common.edited'); },
  get deleted() { return t('common.deleted'); },
};

export function Profile({ notice }: { notice?: string }) {
  const { slug, setSlug } = useCurrentEvent();
  const [account, setAccount] = useState<MyProfile | null>(null);
  const [events, setEvents] = useState<EventStat[]>([]);
  const [network, setNetwork] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState<string | null>(notices[notice ?? ''] ?? null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setMessage(notices[notice ?? ''] ?? null);
  }, [notice]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getMyProfile(), listMyEventStats()])
        .then(([profile, stats]) => {
          if (!active) return;
          setAccount(profile);
          setEvents(stats);
          setError(null);
        })
        .catch((cause) => {
          if (active) setError(authErrorMessage(cause));
        })
        .finally(() => {
          if (!active) return;
          setReady(true);
          setVersion((value) => value + 1);
        });
      return () => {
        active = false;
      };
    }, [attempt]),
  );

  useEffect(() => {
    if (!slug) {
      setNetwork(null);
      setNetworkError(null);
      return;
    }
    let active = true;
    getEventBySlug(slug)
      .then(async (event) => (event ? getMyEventProfile(event.id) : null))
      .then((profile) => {
        if (!active) return;
        const line = [profile?.role, profile?.company].filter(Boolean).join(' · ');
        setNetwork(line);
        setNetworkError(null);
      })
      .catch((cause) => {
        if (active) setNetworkError(authErrorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [slug, version]);

  async function save(fullName: string, phone: string, linkedinUrl: string) {
    setSaving(true);
    setEditError(null);
    try {
      await updateMyProfile({ fullName, phone, linkedinUrl });
      setAccount(await getMyProfile());
      setEditing(false);
      setMessage(t('common.saved'));
    } catch (cause) {
      setEditError(authErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function leave() {
    setLeaving(true);
    setError(null);
    try {
      await signOut();
    } catch (cause) {
      setError(authErrorMessage(cause));
      setLeaving(false);
    }
  }

  if (!ready && !account) {
    return (
      <Screen tabBar>
        <LoadingState />
      </Screen>
    );
  }

  if (error && !account) {
    return (
      <Screen tabBar>
        <ErrorState text={error} onRetry={() => setAttempt((value) => value + 1)} />
      </Screen>
    );
  }

  const name = account?.fullName?.trim() || t('profile.noName');
  const eventName = events.find((event) => event.slug === slug)?.name;

  return (
    <Screen tabBar scroll>
      {eventName ? <EventHero eventName={eventName} /> : null}
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      {error ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      <View style={styles.header}>
        <Avatar name={name} size={size.avatarLg} source={account?.avatarUrl} />
        <View style={styles.identity}>
          <Text style={styles.name}>{name}</Text>
          {account?.email ? <Text style={styles.email}>{account.email}</Text> : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Button label={t('profile.edit')} variant="secondary" onPress={() => setEditing(true)}>
          <Feather name="edit-2" size={size.iconSm} color={colors.ink} />
        </Button>
      </View>
      {slug ? (
        // Kao bedž u demou: lični kod za razmenu uživo. Kod se menja svakih pet minuta, pa živi na ekranu razmene.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.qrTitle')}
          onPress={() => router.push('/swap' as Href)}
          style={({ pressed }) => [styles.qrCard, pressed && { transform: [{ scale: pressScale }] }]}
        >
          <View style={styles.qrIcon}>
            <Feather name="maximize" size={size.iconMd} color={colors.ink} />
          </View>
          <View style={styles.identity}>
            <Text style={styles.qrTitle}>{t('profile.qrTitle')}</Text>
            <Text style={styles.meta}>{t('profile.qrHint')}</Text>
          </View>
          <Feather name="chevron-right" size={size.iconSm} color={colors.text3} />
        </Pressable>
      ) : null}
      <View style={styles.block}>
        <Text style={styles.section}>{t('home.myEvents')}</Text>
        <EventCards events={events} current={slug} onOpen={(next) => void setSlug(next)} />
      </View>
      <View style={styles.block}>
        <Text style={styles.section}>{t('profile.allContacts')}</Text>
        <ContactList version={version} />
      </View>
      <View style={styles.block}>
        <Text style={styles.section}>{t('profile.networking')}</Text>
        <Text style={styles.meta}>{slug ? network || t('profile.noEventProfile') : t('profile.pickEvent')}</Text>
        {networkError ? <InlineError text={networkError} /> : null}
        {slug ? (
          <Button label={t('profile.editSteps')} size="sm" variant="secondary" onPress={() => router.push({ pathname: '/event/[slug]/profile', params: { slug } })} style={styles.update} />
        ) : null}
      </View>
      <View style={styles.block}>
        <Text style={styles.section}>{t('profile.reminder')}</Text>
        <ReminderSetting />
      </View>
      <View style={styles.block}>
        <Text style={styles.section}>{t('language.title')}</Text>
        <Segmented
          value={appLanguage()}
          options={[
            { id: 'sr', label: t('language.sr') },
            { id: 'en', label: t('language.en') },
          ]}
          onChange={(id) => {
            const next = id === 'en' ? 'en' : 'sr';
            void setAppLanguage(next);
            saveMyLanguage(next).catch(() => undefined);
          }}
        />
      </View>
      <Button label={t('profile.signOut')} variant="ghost" loading={leaving} onPress={() => void leave()}>
        <Feather name="log-out" size={size.iconSm} color={colors.ink} />
      </Button>
      <View style={styles.sign}>
        <Text style={styles.by}>by</Text>
        <SkriptMark size={fontSize.fs12} />
      </View>
      {account && editing ? (
        <EditProfile profile={account} open={editing} saving={saving} error={editError} onClose={() => setEditing(false)} onSave={(fullName, phone, linkedin) => void save(fullName, phone, linkedin)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.card,
    padding: space.card,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  qrIcon: { width: size.chip + space.tight * 2, height: size.chip + space.tight * 2, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.skriptYellowSoft },
  qrTitle: { fontFamily: fonts.semibold, fontSize: fontSize.fs15, color: colors.ink },
  notice: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ink },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.card },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bold, fontSize: fontSize.fs22, color: colors.ink },
  email: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight * 2 },
  block: { gap: space.tight * 2 },
  section: { fontFamily: fonts.bold, fontSize: fontSize.fs15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2 },
  update: { alignSelf: 'flex-start', height: size.emptyIcon },
  sign: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: space.tight },
  by: { fontFamily: fonts.regular, fontSize: fontSize.fs12, color: colors.text2 },
});
