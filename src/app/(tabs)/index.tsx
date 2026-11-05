import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { EventHome } from '../../../components/EventHome';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { SkriptMark } from '../../../components/ui/SkriptMark';
import { colors, fontSize, fonts, space } from '../../../constants/theme';
import { useCurrentEvent } from '../../../lib/currentEvent';
import { authErrorMessage } from '../../../lib/services/authService';
import { getMyEvents, type EventRow } from '../../../lib/services/eventService';

function NoEventHome() {
  const { setSlug } = useCurrentEvent();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyEvents()
      .then((rows) => {
        if (active) setEvents(rows);
      })
      .catch((cause) => {
        if (!active) return;
        setEvents([]);
        setError(authErrorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen tabBar scroll>
      <View style={styles.prompt}>
        <SkriptMark size={fontSize.fs30} />
        <Text style={styles.promptText}>Skeniraj QR kod eventa</Text>
        <Button label="Skeniraj" onPress={() => router.push('/scan')} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {events === null ? <ActivityIndicator color={colors.ink} /> : null}
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
        </View>
      ) : null}
    </Screen>
  );
}

export default function HomeScreen() {
  const { slug, ready } = useCurrentEvent();

  if (!ready) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </Screen>
    );
  }

  if (!slug) return <NoEventHome />;

  return <EventHome slug={slug} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.gap,
  },
  prompt: {
    alignItems: 'center',
    gap: space.gap,
  },
  promptText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs17,
    color: colors.ink,
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
    textAlign: 'center',
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
