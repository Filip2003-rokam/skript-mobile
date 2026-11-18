import { useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { rememberEntry } from '../../../../lib/pendingEntry';
import { WelcomeCard } from '../../../../components/event/WelcomeCard';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Screen } from '../../../../components/ui/Screen';
import { LoadingState } from '../../../../components/ui/State';
import { colors, size } from '../../../../constants/theme';
import { useCurrentEvent } from '../../../../lib/currentEvent';
import { authErrorMessage, getSession } from '../../../../lib/services/authService';
import {
  countLiveSessions,
  eventInitials,
  eventPlaceLine,
  eventStatusLine,
  getEventBySlug,
  getMyAttendance,
  type EventRow,
} from '../../../../lib/services/eventService';

export default function EventWelcomeScreen() {
  const { slug, enter } = useLocalSearchParams<{ slug: string; enter?: string }>();
  const code = typeof slug === 'string' ? slug : '';
  const { setSlug } = useCurrentEvent();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [live, setLive] = useState<number | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [entering, setEntering] = useState(false);
  const continued = useRef(false);

  useEffect(() => {
    setEvent(null);
    setLive(null);
    setMissing(false);
    setError(null);
    setEntering(false);
  }, [code]);

  useEffect(() => {
    let active = true;
    setMissing(false);
    setError(null);
    getEventBySlug(code)
      .then(async (row) => {
        if (!active) return;
        if (!row) {
          setMissing(true);
          return;
        }
        setEvent(row);
        const count = await countLiveSessions(row.id);
        if (active) setLive(count);
      })
      .catch((cause) => {
        if (active) setError(authErrorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [code, attempt]);

  async function enterEvent() {
    if (!event) return;
    setEntering(true);
    setError(null);
    try {
      const session = await getSession();
      if (!session) {
        await rememberEntry(event.slug);
        router.push('/login');
        setEntering(false);
        return;
      }
      await setSlug(event.slug);
      const attendance = await getMyAttendance(event.id);
      if (attendance) router.replace('/');
      else router.replace({ pathname: '/event/[slug]/profile', params: { slug: event.slug } });
    } catch (cause) {
      setError(authErrorMessage(cause));
      setEntering(false);
    }
  }

  useEffect(() => {
    if (enter !== '1' || !event || continued.current) return;
    continued.current = true;
    void enterEvent();
  }, [enter, event]);

  if (!event && !missing && !error) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!event && missing) {
    return (
      <Screen>
        <EmptyState
          icon={<Feather name="camera" size={size.iconMd} color={colors.ink} />}
          text="Ovaj event ne postoji. Vrati se i proveri kod."
          action="Nazad"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <EmptyState
          icon={<Feather name="alert-circle" size={size.iconMd} color={colors.ink} />}
          text={error ?? 'Ne mogu da otvorim event. Proveri vezu i pokušaj ponovo.'}
          action="Pokušaj ponovo"
          onAction={() => setAttempt((value) => value + 1)}
        />
      </Screen>
    );
  }

  const status =
    live === null
      ? error
        ? 'Stanje sesija nije učitano. Pokušaj ponovo.'
        : 'Učitavam stanje sesija.'
      : eventStatusLine(event, live);

  return (
    <Screen scroll>
      <WelcomeCard
        coverUri={event.cover_url}
        initials={eventInitials(event.name)}
        logoUri={event.logo_url}
        name={event.name}
        place={eventPlaceLine(event)}
        status={status}
        entering={entering}
        error={error}
        onEnter={() => void enterEvent()}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    </Screen>
  );
}
