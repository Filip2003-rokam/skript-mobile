import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { EventHome } from '../../../components/EventHome';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Screen } from '../../../components/ui/Screen';
import { SkriptMark } from '../../../components/ui/SkriptMark';
import { ErrorState, InlineError, LoadingState } from '../../../components/ui/State';
import { colors, fontSize, fonts, size, space } from '../../../constants/theme';
import { useCurrentEvent } from '../../../lib/currentEvent';
import { authErrorMessage } from '../../../lib/services/authService';
import { getMyEvents, type EventRow } from '../../../lib/services/eventService';

function NoEventHome() {
  const { setSlug } = useCurrentEvent();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getMyEvents()
      .then((rows) => {
        if (!active) return;
        setEvents(rows);
        setError(null);
      })
      .catch((cause) => {
        if (active) setError(authErrorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => setAttempt((value) => value + 1);

  return (
    <Screen tabBar scroll>
      <View style={styles.prompt}>
        <SkriptMark size={fontSize.fs30} />
      </View>
      {events === null && !error ? <LoadingState fill={false} /> : null}
      {error && !events ? (
        <EmptyState
          icon={<Feather name="alert-circle" size={size.iconMd} color={colors.ink} />}
          text={error}
          action="Pokušaj ponovo"
          onAction={retry}
        />
      ) : null}
      {error && events ? <InlineError text={error} onRetry={retry} /> : null}
      {events && events.length === 0 ? (
        <EmptyState
          icon={<Feather name="camera" size={size.iconMd} color={colors.ink} />}
          text="Nema eventa na nalogu. Skeniraj QR kod da uđeš."
          action="Skeniraj"
          onAction={() => router.push('/scan')}
        />
      ) : null}
      {events && events.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listTitle}>Moji eventi</Text>
          {events.map((event) => (
            <Button
              key={event.id}
              label={event.name}
              variant="secondary"
              onPress={() => {
                setSlug(event.slug).catch((cause) => setError(authErrorMessage(cause)));
              }}
            />
          ))}
          <Button label="Skeniraj drugi event" variant="ghost" onPress={() => router.push('/scan')} />
        </View>
      ) : null}
    </Screen>
  );
}

export default function HomeScreen() {
  const { slug, ready, error, reload } = useCurrentEvent();

  if (!ready && !slug) {
    return (
      <Screen tabBar>
        <LoadingState />
      </Screen>
    );
  }

  if (error && !slug) {
    return (
      <Screen tabBar>
        <ErrorState text={error} onRetry={reload} />
      </Screen>
    );
  }

  if (!slug) return <NoEventHome />;

  return <EventHome slug={slug} />;
}

const styles = StyleSheet.create({
  prompt: {
    alignItems: 'center',
    gap: space.gap,
  },
  list: {
    gap: space.gap,
  },
  listTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.text2,
  },
});
