import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Chip } from './ui/Chip';
import { EmptyState } from './ui/EmptyState';
import { EventCover } from './ui/EventCover';
import { Featured, Section, SessionList } from './home/HomeSections';
import { Screen } from './ui/Screen';
import { InlineError, LoadingState } from './ui/State';
import { colors, fontSize, fonts, size, space } from '../constants/theme';
import { authErrorMessage } from '../lib/services/authService';
import { countIncoming } from '../lib/services/connectionService';
import { eventPhase, eventPlaceLine, getEventBySlug, type EventRow } from '../lib/services/eventService';
import { listSessions, sessionIsLive, upcomingSessions, type SessionRow } from '../lib/services/sessionService';

export function EventHome({ slug }: { slug: string }) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [incoming, setIncoming] = useState(0);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadedSlug = useRef<string | null>(null);

  useEffect(() => {
    if (loadedSlug.current !== slug) {
      loadedSlug.current = null;
      setEvent(null);
      setReady(false);
    }
    setMissing(false);
    setError(null);
  }, [slug, attempt]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getEventBySlug(slug)
        .then(async (row) => {
          if (!active) return;
          if (!row) {
            setMissing(true);
            return;
          }
          setEvent(row);
          const [requests, list] = await Promise.all([countIncoming(row.id), listSessions(row.id)]);
          if (!active) return;
          setIncoming(requests);
          setSessions(list);
          loadedSlug.current = slug;
          setMissing(false);
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
            text={error ?? 'Ovaj event ne postoji. Skeniraj QR kod ponovo.'}
            action={error ? 'Pokušaj ponovo' : 'Skeniraj'}
            onAction={() => (error ? setAttempt((value) => value + 1) : router.push('/scan'))}
          />
        </View>
      </Screen>
    );
  }

  const now = new Date();
  const live = sessions.filter((session) => sessionIsLive(event.starts_on, event.days, session, now));
  const next = upcomingSessions(event.starts_on, event.days, sessions, now);
  const ended = eventPhase(event.starts_on, event.days, now).phase === 'after';
  const icon = (name: keyof typeof Feather.glyphMap) => <Feather name={name} size={size.iconSm} color={colors.ink} />;

  return (
    <Screen tabBar scroll>
      <EventCover name={event.name} place={eventPlaceLine(event)} coverUri={event.cover_url ?? undefined} />
      {error ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {incoming > 0 ? (
        <Featured
          eyebrow="Novi zahtevi"
          title={incoming === 1 ? 'Jedna osoba želi da se upoznate' : `${incoming} osobe žele da se upoznate`}
          text="Kontakt se deli tek kad oboje kažete da."
          action="Pogledaj zahteve"
          onPress={() => router.push({ pathname: '/people', params: { view: 'requests' } })}
        />
      ) : (
        <Featured
          eyebrow="Mreženje"
          title="Koga vredi upoznati?"
          text="Predlozi prema tvom profilu. Kontakt se deli tek kad oboje kažete da."
          action="Prikaži ljude"
          onPress={() => router.push({ pathname: '/people', params: { view: 'suggestions' } })}
        />
      )}
      {live.length > 0 ? (
        <Section title="Uživo" live>
          <SessionList sessions={live} live />
        </Section>
      ) : null}
      {next.length > 0 ? (
        <Section title="Uskoro">
          <SessionList sessions={next} />
        </Section>
      ) : null}
      {ended ? <Text style={styles.note}>Event je završen. Kontakti koje si sačuvao ostaju u profilu.</Text> : null}
      <Section title="Brzo">
        <View style={styles.quick}>
          <Chip label="Razmeni kontakt" icon={icon('repeat')} onPress={() => router.push('/swap' as Href)} />
          <Chip label="Skeniraj QR" icon={icon('camera')} onPress={() => router.push('/scan')} />
          <Chip label="Moji kontakti" icon={icon('book')} onPress={() => router.push({ pathname: '/profile', params: { view: 'contacts' } })} />
          <Chip label="Profil za event" icon={icon('edit-2')} onPress={() => router.push({ pathname: '/event/[slug]/profile', params: { slug } })} />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.tight * 2,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.text2,
  },
});
