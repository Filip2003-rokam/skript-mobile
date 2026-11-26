import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { SwapCode } from '../../components/swap/SwapCode';
import { SavedSwap } from '../../components/swap/SavedSwap';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Screen } from '../../components/ui/Screen';
import { InlineError, LoadingState } from '../../components/ui/State';
import { colors, fontSize, fonts, radius, size, space, trackingTight } from '../../constants/theme';
import { useCurrentEvent } from '../../lib/currentEvent';
import { readSkriptQr } from '../../lib/skriptQr';
import { authErrorMessage } from '../../lib/services/authService';
import { getContact, updateContact, type Contact } from '../../lib/services/contactService';
import { getEventBySlug, type EventRow } from '../../lib/services/eventService';
import { getMyProfile } from '../../lib/services/profileService';
import { issueSwapToken, revokeSwapToken, swapContact, swapRefreshMs } from '../../lib/services/swapService';
import { t } from '../../lib/i18n';

export default function SwapScreen() {
  const { slug } = useCurrentEvent();
  const [permission, requestPermission] = useCameraPermissions();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [person, setPerson] = useState(t('swap.attendee'));
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
        const profile = await getMyProfile();
        if (!active) return;
        setEvent(row);
        setPerson(profile.fullName?.trim() || t('swap.attendee'));
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
      setNotice(t('swap.notSwapCode'));
      return;
    }
    locked.current = true;
    setNotice(null);
    setError(null);
    try {
      const contactId = await swapContact(result.token);
      const contact = await getContact(contactId);
      if (!contact) throw new Error(t('errors.contactNotCreated'));
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
        <EmptyState icon={<Feather name="calendar" size={size.iconMd} color={colors.ink} />} text={t('swap.joinFirst')} action={t('swap.scanEvent')} onAction={() => router.push('/scan')} />
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
          text={error ?? t('swap.openFailed')}
          action={t('common.retry')}
          onAction={() => setAttempt((value) => value + 1)}
        />
      </Screen>
    );
  }

  if (saved) {
    return (
      <Screen scroll>
        <SavedSwap
          contact={saved}
          onLater={() => router.back()}
          onSave={async (value) => {
            await updateContact(saved.id, value);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('swap.title')}</Text>
      {error ? <InlineError text={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {token ? <SwapCode token={token} person={person} eventName={event.name} /> : null}
      <Text style={styles.note}>{t('swap.codeNote')}</Text>
      {scanning ? (
        <View style={styles.scan}>
          <Text style={styles.scanning}>{t('swap.scanning')}</Text>
          {!permission ? null : permission.granted ? (
            <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => void onScan(data)} />
          ) : (
            <Button label={permission.canAskAgain ? t('camera.allow') : t('camera.openSettings')} onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())} />
          )}
          {notice ? <Text style={styles.note}>{notice}</Text> : null}
          <Button label={t('swap.closeScanner')} variant="ghost" onPress={() => setScanning(false)} />
        </View>
      ) : (
        <Button label={t('swap.scanTheirs')} onPress={() => { locked.current = false; setScanning(true); }}>
          <Feather name="camera" size={size.iconMd} color={colors.onInk} />
        </Button>
      )}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.fs22,
    color: colors.ink,
    letterSpacing: fontSize.fs22 * trackingTight,
  },
  note: { fontFamily: fonts.regular, fontSize: fontSize.fs13, lineHeight: fontSize.fs22, color: colors.text2, textAlign: 'center' },
  scanning: { fontFamily: fonts.semibold, fontSize: fontSize.fs13, color: colors.ink, textAlign: 'center' },
  scan: { gap: space.gap },
  camera: { height: size.hero, borderRadius: radius.card, overflow: 'hidden' },
});
