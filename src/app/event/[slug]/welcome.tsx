import { useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { rememberEntry } from '../../../../lib/pendingEntry';
import { WelcomeCard } from '../../../../components/event/WelcomeCard';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Screen } from '../../../../components/ui/Screen';
import { LoadingState } from '../../../../components/ui/State';
import { colors, size } from '../../../../constants/theme';
import { useCurrentEvent } from '../../../../lib/currentEvent';
import { authErrorMessage, getSession } from '../../../../lib/services/authService';
import {
  eventInitials,
  getEventBySlug,
  getMyAttendance,
  type EventRow,
} from '../../../../lib/services/eventService';
import { t } from '../../../../lib/i18n';

export default function EventWelcomeScreen() {
  const { slug, enter, web } = useLocalSearchParams<{ slug: string; enter?: string; web?: string }>();
  const webUrl = typeof web === 'string' && web.startsWith('https://') ? web : null;
  const code = typeof slug === 'string' ? slug : '';
  const { setSlug } = useCurrentEvent();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [entering, setEntering] = useState(false);
  const continued = useRef(false);

  useEffect(() => {
    setEvent(null);
    setMissing(false);
    setError(null);
    setEntering(false);
  }, [code]);

  useEffect(() => {
    let active = true;
    setMissing(false);
    setError(null);
    getEventBySlug(code)
      .then((row) => {
        if (!active) return;
        if (!row) {
          setMissing(true);
          return;
        }
        setEvent(row);
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

  // Skeniran QR sa veb aplikacije za event koji ne postoji u bazi aplikacije: otvori ga tamo gde postoji.
  if (!event && missing && webUrl) {
    return (
      <Screen>
        <EmptyState
          icon={<Feather name="globe" size={size.iconMd} color={colors.ink} />}
          text={t('scan.webEvent')}
          action={t('scan.openInBrowser')}
          onAction={() => void WebBrowser.openBrowserAsync(webUrl)}
        />
      </Screen>
    );
  }

  if (!event && missing) {
    return (
      <Screen>
        <EmptyState
          icon={<Feather name="camera" size={size.iconMd} color={colors.ink} />}
          text={t('errors.eventMissingCode')}
          action={t('common.back')}
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
          text={error ?? t('errors.eventOpen')}
          action={t('common.retry')}
          onAction={() => setAttempt((value) => value + 1)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <WelcomeCard
        initials={eventInitials(event.name)}
        logoUri={event.logo_url}
        name={event.name}
        entering={entering}
        error={error}
        onEnter={() => void enterEvent()}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    </Screen>
  );
}
