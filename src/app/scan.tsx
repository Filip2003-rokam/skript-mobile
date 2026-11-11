import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';
import { useCurrentEvent } from '../../lib/currentEvent';
import { readSkriptQr } from '../../lib/skriptQr';
import { authErrorMessage, getSession } from '../../lib/services/authService';
import { getAttendeeName } from '../../lib/services/attendeeService';
import { sendRequest } from '../../lib/services/connectionService';
import { getEventBySlug } from '../../lib/services/eventService';

type PersonRequest = { userId: string; name: string; eventId: string };

export default function ScanScreen() {
  const { slug } = useCurrentEvent();
  const [permission, requestPermission] = useCameraPermissions();
  const [notice, setNotice] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [person, setPerson] = useState<PersonRequest | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const lastCode = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLocked(false);
      lastCode.current = null;
    }, []),
  );

  function openEvent(next: string) {
    router.push({ pathname: '/event/[slug]/welcome', params: { slug: next } });
  }

  function unlock() {
    setLocked(false);
  }

  async function openPerson(userId: string, eventSlug: string | null) {
    try {
      const session = await getSession();
      if (session?.user.id === userId) {
        setNotice('Ovo je tvoj bedž.');
        unlock();
        return;
      }
      if (!slug || eventSlug !== slug) {
        setNotice('Ova osoba nije na ovom eventu.');
        unlock();
        return;
      }
      const event = await getEventBySlug(slug);
      const name = event ? await getAttendeeName(event.id, userId) : null;
      if (!event || !name) {
        setNotice('Ova osoba nije na ovom eventu.');
        unlock();
        return;
      }
      setNotice(null);
      setNote('');
      setSendError(null);
      setPerson({ userId, name, eventId: event.id });
    } catch (cause) {
      setNotice(authErrorMessage(cause));
      unlock();
    }
  }

  function onScan(value: string) {
    if (locked || lastCode.current === value) return;
    lastCode.current = value;
    const result = readSkriptQr(value);
    if (result.kind === 'event') {
      setLocked(true);
      openEvent(result.slug);
      return;
    }
    if (result.kind === 'user') {
      setLocked(true);
      void openPerson(result.userId, result.eventSlug);
      return;
    }
    setNotice('Ovo nije Skript QR kod.');
  }

  function closeRequest() {
    setPerson(null);
    setSendError(null);
    unlock();
  }

  async function submit() {
    if (!person) return;
    setSending(true);
    setSendError(null);
    try {
      await sendRequest(person.eventId, person.userId, note, 'qr');
      setPerson(null);
      setNote('');
      setNotice('Zahtev poslat');
      unlock();
    } catch (cause) {
      setSendError(cause instanceof Error && !('code' in cause) ? cause.message : authErrorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  function enterByCode() {
    const next = code.trim();
    if (!next) {
      setCodeError('Unesi kod eventa.');
      return;
    }
    setCodeError(null);
    openEvent(next);
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Skeniraj QR</Text>
      {!permission ? (
        <ActivityIndicator color={colors.ink} />
      ) : permission.granted ? (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={locked ? undefined : ({ data }) => onScan(data)}
        />
      ) : (
        <View style={styles.denied}>
          <Text style={styles.body}>
            {permission.canAskAgain
              ? 'Skriptu treba kamera da pročita QR kod eventa.'
              : 'Kamera je odbijena. Otvori podešavanja telefona, uključi kameru za Skript i vrati se ovde.'}
          </Text>
          <Button
            label={permission.canAskAgain ? 'Dozvoli kameru' : 'Otvori podešavanja'}
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          />
        </View>
      )}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <TextField label="Kod eventa" value={code} onChangeText={setCode} error={codeError ?? undefined} autoCapitalize="none" />
      <Button label="Uđi" onPress={enterByCode} />
      <Modal visible={person !== null} transparent animationType="slide" statusBarTranslucent onRequestClose={closeRequest}>
        <View style={styles.modal}>
          <Pressable accessibilityLabel="Zatvori" style={[StyleSheet.absoluteFill, styles.scrim]} onPress={closeRequest} />
          {person ? (
            <View style={styles.sheet}>
              <Text style={styles.person}>{person.name}</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Dodaj kratku poruku"
                accessibilityLabel="Dodaj kratku poruku"
                placeholderTextColor={colors.text3}
                maxLength={280}
                style={styles.note}
              />
              {sendError ? <Text style={styles.body}>{sendError}</Text> : null}
              <Button label="Pošalji zahtev" loading={sending} onPress={() => void submit()} />
            </View>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: fontSize.fs30, color: colors.ink },
  camera: { height: size.hero, borderRadius: radius.card, overflow: 'hidden' },
  denied: { gap: space.gap },
  body: { fontFamily: fonts.regular, fontSize: fontSize.fs15, color: colors.ink },
  notice: { fontFamily: fonts.semibold, fontSize: fontSize.fs15, color: colors.ink },
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    gap: space.gap,
    padding: space.edge,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    backgroundColor: colors.appBg,
  },
  person: { fontFamily: fonts.bold, fontSize: fontSize.fs22, color: colors.ink },
  note: {
    height: size.field,
    paddingHorizontal: space.buttonMd,
    borderRadius: radius.pill,
    backgroundColor: colors.fillSubtle,
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
});
