import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from './ui/Chip';
import { EmptyState } from './ui/EmptyState';
import { EventHero } from './ui/EventHero';
import { SessionCard } from './ui/SessionCard';
import { Screen } from './ui/Screen';
import { InlineError, LoadingState } from './ui/State';
import { colors, fontSize, fonts, pressScale, radius, shadow, size, space, trackingTight } from '../constants/theme';
import { authErrorMessage } from '../lib/services/authService';
import { eventPhase, getEventBySlug, type EventRow } from '../lib/services/eventService';
import { listSessions, sessionClock, sessionIsLive, type SessionRow } from '../lib/services/sessionService';

const minute = 60_000;

function SessionModal({ session, open, onClose }: { session: SessionRow | null; open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const time = session ? sessionClock(session.start_time) : '';
  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable accessibilityLabel="Zatvori" style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} />
        {session ? (
          <View style={[styles.sheet, { marginBottom: Math.max(insets.bottom, space.gap) }]}>
            <View style={styles.handle} />
            {time ? <Text style={styles.time}>{time}</Text> : null}
            <Text style={styles.modalTitle}>{session.title}</Text>
            {session.room ? <Text style={styles.meta}>{session.room}</Text> : null}
            {session.speakers.length > 0 ? <Text style={styles.meta}>{session.speakers.join(', ')}</Text> : null}
            {session.duration_min != null ? <Text style={styles.meta}>Trajanje: {session.duration_min} min</Text> : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

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
        <View style={styles.days}>
          {days.map((value) => (
            <Chip key={value} label={`Dan ${value}`} selected={day === value} onPress={() => setDay(value)} />
          ))}
        </View>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={[styles.rooms, listWidth > 0 ? { width: listWidth } : null]}
          contentContainerStyle={styles.roomRow}
        >
          <Chip label="Sve sale" selected={room === null} onPress={() => setRoom(null)} />
          {rooms.map((name) => (
            <Chip key={name} label={name} selected={room === name} onPress={() => setRoom(name)} />
          ))}
        </ScrollView>
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
      <SessionModal session={selected} open={open} onClose={() => setOpen(false)} />
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
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.gap,
  },
  rooms: {
    flexGrow: 0,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
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
  time: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.text2,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.text2,
  },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: colors.scrim,
  },
  sheet: {
    gap: space.gap,
    marginHorizontal: space.gap,
    maxHeight: '80%',
    borderRadius: radius.panel,
    padding: space.edge,
    backgroundColor: colors.glassStrong,
    ...shadow.lift,
  },
  handle: {
    alignSelf: 'center',
    width: size.emptyIcon,
    height: size.dot + size.ring,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs22,
    color: colors.ink,
    letterSpacing: fontSize.fs22 * trackingTight,
  },
});
