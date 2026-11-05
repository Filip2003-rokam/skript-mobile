import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { EventHero } from './ui/EventHero';
import { Screen } from './ui/Screen';
import { colors, fontSize, fonts, size, space } from '../constants/theme';
import { authErrorMessage } from '../lib/services/authService';
import { countIncoming } from '../lib/services/connectionService';
import { countLiveSessions, getEventBySlug, type EventRow } from '../lib/services/eventService';
import { getMyName } from '../lib/services/profileService';

function greeting(name: string | null, now = new Date()) {
  const hour = now.getHours();
  const hello = hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobro veče';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${hello}, ${first}.` : `${hello}.`;
}

export function EventHome({ slug }: { slug: string }) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [incoming, setIncoming] = useState(0);
  const [live, setLive] = useState(0);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setReady(false);
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
          const [person, requests, sessions] = await Promise.all([getMyName(), countIncoming(row.id), countLiveSessions(row.id)]);
          if (!active) return;
          setName(person);
          setIncoming(requests);
          setLive(sessions);
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

  if (!ready) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </Screen>
    );
  }

  if (missing || error || !event) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <Text style={styles.error}>{error ?? 'Ovaj event ne postoji. Skeniraj QR kod ponovo.'}</Text>
          <Button label={error ? 'Pokušaj ponovo' : 'Skeniraj'} onPress={() => (error ? setAttempt((value) => value + 1) : router.push('/scan'))} />
        </View>
      </Screen>
    );
  }

  const arrow = <Feather name="arrow-right" size={size.iconSm} color={colors.ink} />;

  return (
    <Screen tabBar scroll>
      <EventHero eventName={event.name} title={greeting(name)} coverUri={event.cover_url ?? undefined} />
      {incoming > 0 || live > 0 ? (
        <View style={styles.status}>
          {incoming > 0 ? (
            <Chip label={`${incoming} novih zahteva`} trailing={arrow} onPress={() => router.push({ pathname: '/people', params: { view: 'requests' } })} />
          ) : null}
          {live > 0 ? (
            <Chip
              label={`Upravo traje ${live} sesija`}
              icon={<View style={styles.dot} />}
              trailing={arrow}
              onPress={() => router.push('/agenda')}
            />
          ) : null}
        </View>
      ) : null}
      <View style={styles.list}>
        <Chip label="Koga da upoznam?" icon={<Feather name="users" size={size.iconSm} color={colors.ink} />} onPress={() => router.push({ pathname: '/people', params: { view: 'suggestions' } })} />
        <Chip label="Šta je sada na programu?" icon={<Feather name="calendar" size={size.iconSm} color={colors.ink} />} onPress={() => router.push('/agenda')} />
        <Chip label="Moji zahtevi" icon={<Feather name="inbox" size={size.iconSm} color={colors.ink} />} onPress={() => router.push({ pathname: '/people', params: { view: 'requests' } })} />
        <Chip label="Moji kontakti" icon={<Feather name="book" size={size.iconSm} color={colors.ink} />} onPress={() => router.push({ pathname: '/profile', params: { view: 'contacts' } })} />
        <Chip label="Izmeni profil za event" icon={<Feather name="edit-2" size={size.iconSm} color={colors.ink} />} onPress={() => router.push({ pathname: '/event/[slug]/profile', params: { slug } })} />
        <Chip label="Skeniraj QR" icon={<Feather name="camera" size={size.iconSm} color={colors.ink} />} onPress={() => router.push('/scan')} />
      </View>
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
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
    textAlign: 'center',
  },
  status: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.gap,
  },
  dot: {
    width: size.dot,
    height: size.dot,
    borderRadius: size.dot,
    backgroundColor: colors.live,
  },
  list: {
    gap: space.gap,
  },
});
