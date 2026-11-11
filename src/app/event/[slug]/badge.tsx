import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../../components/ui/Button';
import { EventLogo } from '../../../../components/ui/EventLogo';
import { Screen } from '../../../../components/ui/Screen';
import { colors, fontSize, fonts, radius, shadow, space } from '../../../../constants/theme';
import { userBadgeUrl } from '../../../../lib/skriptQr';
import { authErrorMessage, getSession } from '../../../../lib/services/authService';
import { eventInitials, eventPlaceLine, getEventBySlug, type EventRow } from '../../../../lib/services/eventService';
import { getMyEventProfile } from '../../../../lib/services/attendeeService';
import { getMyProfile } from '../../../../lib/services/profileService';

export default function BadgeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const code = typeof slug === 'string' ? slug : '';
  const [event, setEvent] = useState<EventRow | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setReady(false);
    setMissing(false);
    setError(null);
    getEventBySlug(code)
      .then(async (row) => {
        if (!active) return;
        if (!row) {
          setMissing(true);
          return;
        }
        const [session, profile, attendance] = await Promise.all([getSession(), getMyProfile(), getMyEventProfile(row.id)]);
        if (!active) return;
        setEvent(row);
        setName(profile.fullName?.trim() || 'Učesnik');
        setCompany(attendance?.company?.trim() || null);
        setUserId(session?.user.id ?? null);
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
  }, [code, attempt]);

  if (!ready) {
    return (
      <Screen>
        <ActivityIndicator color={colors.ink} />
      </Screen>
    );
  }

  if (missing || !event) {
    return (
      <Screen>
        <Text style={styles.body}>Ovaj event ne postoji.</Text>
        <Button label="Nazad" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (error || !userId) {
    return (
      <Screen>
        <Text style={styles.body}>{error ?? 'Nisi prijavljen.'}</Text>
        <Button label="Pokušaj ponovo" onPress={() => setAttempt((value) => value + 1)} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Button label="Nazad" variant="ghost" onPress={() => router.back()} />
      <View style={styles.card}>
        <View style={styles.band}>
          {event.cover_url ? <Image source={{ uri: event.cover_url }} style={styles.cover} /> : null}
          <View style={styles.bandRow}>
            <EventLogo initials={eventInitials(event.name)} source={event.logo_url ? { uri: event.logo_url } : undefined} small />
            <View style={styles.bandText}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventPlace}>{eventPlaceLine(event)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.bodyBlock}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>UČESNIK</Text>
          </View>
          <Text style={styles.person}>{name}</Text>
          {company ? <Text style={styles.company}>{company}</Text> : null}
          <View style={styles.qr}>
            <QRCode value={userBadgeUrl(userId, event.slug)} size={176} color={colors.ink} backgroundColor={colors.surface} quietZone={8} />
          </View>
          <Text style={styles.note}>Kad neko skenira tvoj bedž, tebi stiže zahtev. Kontakt se deli tek kad ga prihvatiš.</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    ...shadow.lift,
  },
  band: {
    minHeight: 88,
    justifyContent: 'center',
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  cover: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.gap,
    paddingHorizontal: space.edge,
    paddingVertical: space.card,
  },
  bandText: { flex: 1, minWidth: 0 },
  eventName: { fontFamily: fonts.bold, fontSize: fontSize.fs15, color: colors.appBg },
  eventPlace: { fontFamily: fonts.regular, fontSize: fontSize.fs11, color: colors.appBg, opacity: 0.8 },
  bodyBlock: { alignItems: 'center', gap: space.gap, paddingHorizontal: space.edge, paddingTop: space.card, paddingBottom: space.edge },
  pill: { paddingHorizontal: space.gap, paddingVertical: space.tight, borderRadius: radius.pill, backgroundColor: colors.skriptYellow },
  pillText: { fontFamily: fonts.bold, fontSize: fontSize.fs11, color: colors.ink, letterSpacing: 0.6 },
  person: { fontFamily: fonts.display, fontSize: fontSize.fs30, color: colors.ink, textAlign: 'center' },
  company: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2, textAlign: 'center' },
  qr: { padding: space.gap, borderRadius: radius.card, backgroundColor: colors.surface, ...shadow.card },
  note: { fontFamily: fonts.regular, fontSize: fontSize.fs13, color: colors.text2, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: fontSize.fs15, color: colors.ink },
});
