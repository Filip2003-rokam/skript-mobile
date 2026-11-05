import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { EventLogo } from '../../../../components/ui/EventLogo';
import { Screen } from '../../../../components/ui/Screen';
import { SkriptMark } from '../../../../components/ui/SkriptMark';
import { colors, fontSize, fonts, radius, size, space } from '../../../../constants/theme';
import { useCurrentEvent } from '../../../../lib/currentEvent';
import { authErrorMessage } from '../../../../lib/services/authService';
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
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const code = typeof slug === 'string' ? slug : '';
  const { setSlug } = useCurrentEvent();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [live, setLive] = useState<number | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    let active = true;
    setEvent(null);
    setLive(null);
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

  async function enter() {
    if (!event) return;
    setEntering(true);
    setError(null);
    try {
      await setSlug(event.slug);
      const attendance = await getMyAttendance(event.id);
      if (attendance) router.replace('/');
      else router.replace({ pathname: '/event/[slug]/profile', params: { slug: event.slug } });
    } catch (cause) {
      setError(authErrorMessage(cause));
      setEntering(false);
    }
  }

  if (!event || live === null) {
    return (
      <Screen>
        <View style={styles.loading}>
          <EventLogo initials={eventInitials(event?.name ?? code)} source={event?.logo_url ? { uri: event.logo_url } : undefined} />
          {event ? <Text style={styles.name}>{event.name}</Text> : null}
          {missing ? (
            <>
              <Text style={styles.body}>Ovaj event ne postoji. Proveri kod.</Text>
              <Button label="Nazad" variant="ghost" onPress={() => router.back()} />
            </>
          ) : error ? (
            <>
              <Text style={styles.body}>{error}</Text>
              <Button label="Pokušaj ponovo" onPress={() => setAttempt((value) => value + 1)} />
            </>
          ) : (
            <ActivityIndicator color={colors.ink} />
          )}
        </View>
      </Screen>
    );
  }

  const place = eventPlaceLine(event);

  return (
    <Screen scroll>
      {event.cover_url ? <Image source={{ uri: event.cover_url }} style={styles.cover} /> : null}
      <Card>
        <View style={styles.card}>
          <EventLogo initials={eventInitials(event.name)} source={event.logo_url ? { uri: event.logo_url } : undefined} />
          <Text style={styles.name}>{event.name}</Text>
          {place ? <Text style={styles.place}>{place}</Text> : null}
          <Text style={styles.status}>{eventStatusLine(event, live)}</Text>
        </View>
      </Card>
      <View style={styles.actions}>
        <Button label="Uđi" size="lg" loading={entering} onPress={enter} />
        {error ? <Text style={styles.body}>{error}</Text> : null}
        <View style={styles.note}>
          <View style={styles.dot} />
          <Text style={styles.noteText}>Predlozi ljudi · Kontakt se deli tek kad oba prihvate</Text>
        </View>
        <View style={styles.sign}>
          <Text style={styles.by}>by</Text>
          <SkriptMark size={fontSize.fs13} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.gap,
  },
  cover: {
    height: size.hero,
    borderRadius: radius.card,
  },
  card: {
    alignItems: 'center',
    gap: space.gap,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs22,
    color: colors.ink,
    textAlign: 'center',
  },
  place: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.text2,
    textAlign: 'center',
  },
  status: {
    fontFamily: fonts.medium,
    fontSize: fontSize.fs13,
    color: colors.ink,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: space.gap,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
    textAlign: 'center',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: space.tight,
  },
  dot: {
    width: size.dot,
    height: size.dot,
    borderRadius: size.dot,
    backgroundColor: colors.live,
  },
  noteText: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
    textAlign: 'center',
  },
  sign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
  },
  by: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.text2,
  },
});
