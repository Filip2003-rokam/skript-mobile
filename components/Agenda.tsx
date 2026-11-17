import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { AgendaFilters } from './agenda/AgendaFilters';
import { SessionSheet } from './agenda/SessionSheet';
import { EmptyState } from './ui/EmptyState';
import { EventHero } from './ui/EventHero';
import { SessionCard } from './ui/SessionCard';
import { Screen } from './ui/Screen';
import { InlineError, LoadingState } from './ui/State';
import { colors, fontSize, fonts, size, space } from '../constants/theme';
import { authErrorMessage } from '../lib/services/authService';
import { eventPhase, getEventBySlug, type EventRow } from '../lib/services/eventService';
import { listSessions, sessionClock, sessionIsLive, type SessionRow } from '../lib/services/sessionService';

const minute = 60_000;

export function Agenda({ slug }: { slug: string }) {
  const [listWidth, setListWidth] = useState(0);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [day, setDay] = useState(1);
  const [room, setRoom] = useState<string | null>(null);
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadedId = useRef<string | null>(null);
  const loadedSlug = useRef<string | null>(null);

  useEffect(() => {
    if (loadedSlug.current !== slug) {
      loadedSlug.current = null;
      loadedId.current = null;
      setEvent(null);
      setSessions([]);
      setReady(false);
      setOpen(false);
    }
    setMissing(false);
    setError(null);
  }, [slug, attempt]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setNow(new Date());
      const timer = setInterval(() => setNow(new Date()), minute);
      getEventBySlug(slug)
        .then(async (row) => {
          if (!active) return;
          if (!row) {
            setMissing(true);
            return;
          }
          const list = await listSessions(row.id);
          if (!active) return;
          if (loadedId.current !== row.id) {
            loadedId.current = row.id;
            const timing = eventPhase(row.starts_on, row.days);
            const count = row.days && row.days > 0 ? row.days : 1;
            const next = timing.phase === 'during' ? timing.day : 1;
            setDay(Math.min(Math.max(next, 1), count));
            setRoom(null);
          }
          loadedSlug.current = slug;
          setEvent(row);
          setSessions(list);
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
        clearInterval(timer);
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
            icon={<Feather name={error ? 'alert-circle' : 'calendar'} size={size.iconMd} color={colors.ink} />}
            text={error ?? 'Ovaj event ne postoji. Skeniraj QR kod ponovo.'}
            action={error ? 'Pokušaj ponovo' : 'Skeniraj'}
            onAction={() => (error ? setAttempt((value) => value + 1) : router.push('/scan'))}
          />
        </View>
      </Screen>
    );
  }

  const dayCount = event.days && event.days > 0 ? event.days : 1;
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const rooms = Array.isArray(event.rooms) ? event.rooms : [];
  const visible = sessions.filter((session) => session.day === day && (room === null || session.room === room));
  const live = visible.filter((session) => sessionIsLive(event.starts_on, event.days, session, now));
  const liveIds = new Set(live.map((session) => session.id));
  const groups = new Map<string, SessionRow[]>();
  for (const session of visible) {
    if (liveIds.has(session.id)) continue;
    const time = sessionClock(session.start_time);
    const list = groups.get(time);
    if (list) list.push(session);
    else groups.set(time, [session]);
  }

  function show(session: SessionRow) {
    setSelected(session);
    setOpen(true);
  }

  return (
    <Screen tabBar>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onLayout={(layout) => setListWidth(layout.nativeEvent.layout.width)}
      >
        {error ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
        <EventHero eventName={event.name} />
        <AgendaFilters days={days} day={day} onDay={setDay} rooms={rooms} room={room} onRoom={setRoom} listWidth={listWidth} />
        {live.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.liveHeading}>
              <View style={styles.dot} />
              <Text style={styles.liveTitle}>Upravo traje</Text>
            </View>
            {live.map((session) => (
              <SessionCard key={session.id} session={session} live onPress={() => show(session)} />
            ))}
          </View>
        ) : null}
        {[...groups.entries()].map(([time, list]) => (
          <View key={time || 'bez-vremena'} style={styles.section}>
            {time ? <Text style={styles.timeHeading}>{time}</Text> : null}
            {list.map((session) => (
              <SessionCard key={session.id} session={session} onPress={() => show(session)} />
            ))}
          </View>
        ))}
        {visible.length === 0 ? (
          <EmptyState icon={<Feather name="calendar" size={size.iconMd} color={colors.ink} />} text="Nema sesija za ove filtere." />
        ) : null}
      </ScrollView>
      <SessionSheet session={selected} open={open} onClose={() => setOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.gap,
  },
  scroll: {
    flex: 1,
  },
  list: {
    gap: space.gap,
    paddingBottom: space.gap,
  },
  section: {
    gap: space.gap,
  },
  liveHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
  },
  dot: {
    width: size.dot * 2,
    height: size.dot * 2,
    borderRadius: size.dot,
    backgroundColor: colors.live,
  },
  liveTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
  timeHeading: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.text2,
    fontVariant: ['tabular-nums'],
  },
});
