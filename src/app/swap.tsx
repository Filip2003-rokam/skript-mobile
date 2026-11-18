import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { SwapCode } from '../../components/swap/SwapCode';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Screen } from '../../components/ui/Screen';
import { InlineError, LoadingState } from '../../components/ui/State';
import { VoiceNote } from '../../components/voice/VoiceNote';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';
import { useCurrentEvent } from '../../lib/currentEvent';
import { readSkriptQr } from '../../lib/skriptQr';
import { authErrorMessage } from '../../lib/services/authService';
import { getMyEventProfile } from '../../lib/services/attendeeService';
import { getContact, updateContact, type Contact } from '../../lib/services/contactService';
import { eventInitials, eventPlaceLine, getEventBySlug, type EventRow } from '../../lib/services/eventService';
import { getMyProfile } from '../../lib/services/profileService';
import { issueSwapToken, revokeSwapToken, swapContact, swapRefreshMs } from '../../lib/services/swapService';

export default function SwapScreen() {
  const { slug } = useCurrentEvent();
  const [permission, requestPermission] = useCameraPermissions();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [person, setPerson] = useState('Učesnik');
  const [company, setCompany] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saved, setSaved] = useState<Contact | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const locked = useRef(false);

  const refresh = useCallback(async (eventId: string) => {
    const next = await issueSwapToken(eventId);
    setToken(next);
  }, []);

  useEffect(() => {
    if (!slug) {
      setReady(true);
      return;
    }
    let active = true;
    setError(null);
    getEventBySlug(slug)
      .then(async (row) => {
        if (!active) return;
        if (!row) {
          setEvent(null);
          return;
        }
        const [profile, attendance] = await Promise.all([getMyProfile(), getMyEventProfile(row.id)]);
        if (!active) return;
        setEvent(row);
        setPerson(profile.fullName?.trim() || 'Učesnik');
        setCompany(attendance?.company?.trim() || null);
        await refresh(row.id);
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
  }, [slug, attempt, refresh]);

  useEffect(() => {
    if (!event) return;
    const timer = setInterval(() => {
      void refresh(event.id).catch((cause) => setError(authErrorMessage(cause)));
    }, swapRefreshMs);
    return () => {
      clearInterval(timer);
      void revokeSwapToken(event.id);
    };
  }, [event, refresh]);

  async function onScan(value: string) {
    if (locked.current || !event) return;
    const result = readSkriptQr(value);
    if (result.kind !== 'swap') {
      setNotice('Ovo nije kod za razmenu. Skeniraj QR sa ekrana Razmeni kontakt.');
      return;
    }
    locked.current = true;
    setNotice(null);
    setError(null);
    try {
      const contactId = await swapContact(result.token);
      const contact = await getContact(contactId);
      if (!contact) throw new Error('Kontakt nije napravljen. Pokušaj ponovo.');
      await revokeSwapToken(event.id);
      setToken(null);
      setSaved(contact);
      setScanning(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : authErrorMessage(cause));
      locked.current = false;
    }
  }

  if (!slug) {
    return (
      <Screen>
        <EmptyState icon={<Feather name="calendar" size={size.iconMd} color={colors.ink} />} text="Prvo uđi na event. Razmena važi samo među učesnicima." action="Skeniraj event" onAction={() => router.push('/scan')} />
      </Screen>
    );
  }

  if (!ready && !event) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!event || !token && !saved) {
    return (
      <Screen>
        <EmptyState
          icon={<Feather name="alert-circle" size={size.iconMd} color={colors.ink} />}
          text={error ?? 'Ne mogu da otvorim razmenu. Proveri da si na ovom eventu i pokušaj ponovo.'}
          action="Pokušaj ponovo"
          onAction={() => setAttempt((value) => value + 1)}
        />
      </Screen>
    );
  }

  if (saved) {
    return (
      <Screen scroll>
        <Text style={styles.title}>Kontakt je sačuvan</Text>
        <Text style={styles.body}>{saved.fullName} je sada u tvojim kontaktima. Isto važi i za tu osobu.</Text>
        <VoiceNote
          existingNote={saved.note}
          existingDate={saved.followUpDate}
          email={saved.email}
          onSave={async (value) => {
            await updateContact(saved.id, value);
          }}
        />
        <Button label="Kasnije" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Button label="Nazad" variant="ghost" onPress={() => router.back()} />
      {error ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {token ? (
        <SwapCode
          token={token}
          eventName={event.name}
          place={eventPlaceLine(event)}
          coverUri={event.cover_url}
          initials={eventInitials(event.name)}
          logoUri={event.logo_url}
          person={person}
          company={company}
        />
      ) : null}
      {scanning ? (
        <View style={styles.scan}>
          {!permission ? null : permission.granted ? (
            <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => void onScan(data)} />
          ) : (
            <Button label={permission.canAskAgain ? 'Dozvoli kameru' : 'Otvori podešavanja'} onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())} />
          )}
          {notice ? <Text style={styles.body}>{notice}</Text> : null}
          <Button label="Zatvori skener" variant="ghost" onPress={() => setScanning(false)} />
        </View>
      ) : (
        <Button label="Skeniraj njihov" onPress={() => { locked.current = false; setScanning(true); }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: fontSize.fs30, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: fontSize.fs15, color: colors.ink },
  scan: { gap: space.gap },
  camera: { height: size.hero, borderRadius: radius.card, overflow: 'hidden' },
});
