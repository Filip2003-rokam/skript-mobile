import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { emptyFacts, loadFacts, type HomeFacts } from './home/loadHome';
import { HomeMark } from './home/HomeMark';
import { InboxBell } from './home/InboxBell';
import { Section } from './home/HomeSections';
import { StatusPills } from './home/StatusPills';
import { buildTryCards, TryCards } from './home/TryCards';
import { HomeNext } from './home/HomeNext';
import { Chip } from './ui/Chip';
import { EmptyState } from './ui/EmptyState';
import { Screen } from './ui/Screen';
import { InlineError, LoadingState } from './ui/State';
import { colors, fontSize, fonts, size, space, trackingWide } from '../constants/theme';
import { authErrorMessage } from '../lib/services/authService';
import { getEventBySlug, eventPhase, type EventRow } from '../lib/services/eventService';
import { sessionIsLive, upcomingSessions } from '../lib/services/sessionService';
import { t } from '../lib/i18n';

export function EventHome({ slug }: { slug: string }) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [facts, setFacts] = useState<HomeFacts>(emptyFacts);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadedSlug = useRef<string | null>(null);

  useEffect(() => {
    if (loadedSlug.current !== slug) {
      loadedSlug.current = null;
      setEvent(null);
      setFacts(emptyFacts);
      setReady(false);
    }
    setError(null);
  }, [slug, attempt]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getEventBySlug(slug)
        .then(async (row) => {
          if (!active) return;
          if (!row) {
            setEvent(null);
            return;
          }
          setEvent(row);
          const next = await loadFacts(row.id);
          if (!active) return;
          setFacts(next);
          loadedSlug.current = slug;
          setError(null);
        })
        .catch((cause) => {
          if (active) setError(authErrorMessage(cause));
        })
        .finally(() => {
          if (active) setReady(true);
        });
      return () => {
        active = false;
      };
    }, [slug, attempt]),
  );

  if (!event && !ready) {
    return (
      <Screen tabBar>
        <LoadingState />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <EmptyState
            icon={<Feather name={error ? 'alert-circle' : 'camera'} size={size.iconMd} color={colors.ink} />}
            text={error ?? t('errors.eventMissingRescan')}
            action={error ? t('common.retry') : t('common.scan')}
            onAction={() => (error ? setAttempt((value) => value + 1) : router.push('/scan'))}
          />
        </View>
      </Screen>
    );
  }

  const now = new Date();
  const ended = eventPhase(event.starts_on, event.days, now).phase === 'after';
  const live = ended ? [] : facts.sessions.filter((session) => sessionIsLive(event.starts_on, event.days, session, now));
  const next = ended ? [] : upcomingSessions(event.starts_on, event.days, facts.sessions, now, 1);
  const icon = (name: keyof typeof Feather.glyphMap) => <Feather name={name} size={size.iconSm} color={colors.ink} />;

  return (
    <Screen tabBar scroll>
      <View style={styles.hero}>
        <View style={styles.top}>
          <View style={styles.side} />
          <Text style={styles.eventName} numberOfLines={2}>
            {event.name}
          </Text>
          <View style={[styles.side, styles.sideEnd]}>
            <InboxBell eventId={event.id} />
          </View>
        </View>
        <HomeMark />
        <Text style={styles.question}>{t('home.question')}</Text>
        <StatusPills live={live.length} linksToday={facts.linksToday} />
      </View>
      {error ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      <Section title={t('home.try')}>
        <TryCards cards={buildTryCards(live[0]?.title ?? null, next[0]?.title ?? null, facts.suggestions, facts.followUps, ended)} />
      </Section>
      <Section title={t('home.quick')}>
        <View style={styles.quick}>
          <Chip label={t('home.swap')} icon={icon('repeat')} onPress={() => router.push('/swap' as Href)} />
          <Chip label={t('scan.title')} icon={icon('camera')} onPress={() => router.push('/scan')} />
          <Chip label={t('home.myContacts')} icon={icon('book')} onPress={() => router.push('/profile')} />
          <Chip label={t('home.eventProfile')} icon={icon('edit-2')} onPress={() => router.push({ pathname: '/event/[slug]/profile', params: { slug } })} />
        </View>
      </Section>
      {ended ? null : <HomeNext startsOn={event.starts_on} days={event.days} sessions={facts.sessions} now={now} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: space.gap,
    paddingTop: space.gap,
  },
  top: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: size.buttonSm,
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  eventName: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fontSize.fs11,
    color: colors.text3,
    letterSpacing: trackingWide,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  question: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs17,
    color: colors.ink,
    textAlign: 'center',
  },
  quick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.tight * 2,
  },
});
