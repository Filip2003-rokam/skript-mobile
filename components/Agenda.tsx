import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { AgendaFilters } from './agenda/AgendaFilters';
import { AgendaList } from './agenda/AgendaList';
import { SessionSheet } from './agenda/SessionSheet';
import { EmptyState } from './ui/EmptyState';
import { EventHero } from './ui/EventHero';
import { Screen } from './ui/Screen';
import { InlineError, LoadingState } from './ui/State';
import { colors, size, space } from '../constants/theme';
import { authErrorMessage } from '../lib/services/authService';
import { eventPhase, getEventBySlug, type EventRow } from '../lib/services/eventService';
import { listSessions, sessionMark, type SessionRow } from '../lib/services/sessionService';
import { t } from '../lib/i18n';
import { MyDay } from './agenda/MyDay';
import { Segmented } from './ui/Segmented';
import { sessionCalendarDraft, sessionReminders } from '../lib/reminders';
import { syncAgendaReminders } from '../lib/services/agendaReminderService';
import { withOfflineCache } from '../lib/offlineCache';
import { OfflineNote } from './ui/OfflineNote';
import { useMeetings } from './meetings/useMeetings';
import { listSavedSessionIds, setSessionSaved } from '../lib/services/mySessionsService';

const minute = 60_000;

export type AgendaView = 'agenda' | 'myDay';

export function Agenda({ slug, view = 'agenda', onView }: { slug: string; view?: AgendaView; onView?: (next: AgendaView) => void }) {
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
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [offline, setOffline] = useState<string | null>(null);
  const meetings = useMeetings(event);

  // Podsetnik 10 minuta pre svake sačuvane sesije. Zakazuje ga telefon, pa stiže i bez mreže.
  useEffect(() => {
    if (!event || !ready) return;
    void syncAgendaReminders(event.id, 'session', sessionReminders({ slug: event.slug, startsOn: event.starts_on, sessions, savedIds }));
  }, [event, sessions, savedIds, ready]);

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
      withOfflineCache(`agenda:${slug}`, async () => {
        const row = await getEventBySlug(slug);
        if (!row) return null;
        const list = await listSessions(row.id);
        const saved = await listSavedSessionIds(list.map((session) => session.id)).catch(() => new Set<string>());
        return { row, list, saved: [...saved] };
      })
        .then(async ({ value, offline: fromCache, savedAt }) => {
          if (!active) return;
          if (!value) {
            setMissing(true);
            return;
          }
          const { row, list } = value;
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
          setSavedIds(new Set(value.saved));
          setOffline(fromCache ? savedAt : null);
          void meetings.reload();
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
            text={error ?? t('errors.eventMissingRescan')}
            action={error ? t('common.retry') : t('common.scan')}
            onAction={() => (error ? setAttempt((value) => value + 1) : router.push('/scan'))}
          />
        </View>
      </Screen>
    );
  }

  const dayCount = event.days && event.days > 0 ? event.days : 1;
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const rooms = Array.isArray(event.rooms) ? event.rooms : [];
  const openMark = selected ? sessionMark(event.starts_on, event.days, selected, now) : 'upcoming';

  async function toggleSaved(session: SessionRow) {
    const next = !savedIds.has(session.id);
    setSaveError(null);
    setSavedIds((current) => {
      const copy = new Set(current);
      if (next) copy.add(session.id);
      else copy.delete(session.id);
      return copy;
    });
    try {
      await setSessionSaved(session.id, next);
    } catch {
      setSaveError(t('session.saveFailed'));
      setSavedIds((current) => {
        const copy = new Set(current);
        if (next) copy.delete(session.id);
        else copy.add(session.id);
        return copy;
      });
    }
  }

  return (
    <Screen tabBar>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {error ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
        {offline ? <OfflineNote savedAt={offline} onRetry={() => setAttempt((value) => value + 1)} /> : null}
        <EventHero eventName={event.name} />
        <Segmented
          value={view}
          options={[
            { id: 'agenda', label: t('agenda.viewAgenda') },
            { id: 'myDay', label: t('agenda.viewMyDay') },
          ]}
          onChange={(id) => {
            onView?.(id === 'myDay' ? 'myDay' : 'agenda');
            setRoom(null);
          }}
        />
        <AgendaFilters days={days} day={day} onDay={setDay} rooms={view === 'agenda' ? rooms : []} room={room} onRoom={setRoom} />
        {view === 'agenda' ? (
          <AgendaList event={event} sessions={sessions} day={day} room={room} now={now} onOpen={(session) => { setSelected(session); setOpen(true); }} />
        ) : (
          <MyDay
            event={event}
            sessions={sessions}
            savedIds={savedIds}
            meetings={meetings.meetings}
            day={day}
            now={now}
            onOpen={(session) => { setSelected(session); setOpen(true); }}
            onMeetingChanged={() => void meetings.reload()}
          />
        )}
      </ScrollView>
      <SessionSheet
        session={selected}
        mark={openMark}
        open={open}
        onClose={() => setOpen(false)}
        saved={selected ? savedIds.has(selected.id) : false}
        saveError={saveError}
        onToggleSave={selected ? () => void toggleSaved(selected) : undefined}
        calendar={selected ? sessionCalendarDraft(event, selected) : null}
      />
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
  scroll: { flex: 1 },
  list: { gap: space.gap, paddingBottom: space.gap },
});
