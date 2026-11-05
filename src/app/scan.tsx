import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';

type ScanResult = { kind: 'event'; slug: string } | { kind: 'user'; userId: string } | { kind: 'unknown' };

function readQr(value: string): ScanResult {
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'skript:') {
      const id = decodeURIComponent(url.pathname.replace(/^\//, ''));
      if (url.hostname === 'event' && id) return { kind: 'event', slug: id };
      if (url.hostname === 'user' && id) return { kind: 'user', userId: id };
      return { kind: 'unknown' };
    }
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      const [root, slug] = url.pathname.split('/').filter(Boolean);
      if (root === 'e' && slug) return { kind: 'event', slug: decodeURIComponent(slug) };
    }
  } catch {
    return { kind: 'unknown' };
  }
  return { kind: 'unknown' };
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [notice, setNotice] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const lastCode = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLocked(false);
      lastCode.current = null;
    }, []),
  );

  function openEvent(slug: string) {
    router.push({ pathname: '/event/[slug]/welcome', params: { slug } });
  }

  function onScan(value: string) {
    if (locked || lastCode.current === value) return;
    lastCode.current = value;
    const result = readQr(value);
    if (result.kind === 'event') {
      setLocked(true);
      openEvent(result.slug);
      return;
    }
    setNotice(result.kind === 'user' ? 'Ovo je lični QR kod.' : 'Ovo nije Skript QR kod.');
  }

  function enterByCode() {
    const slug = code.trim();
    if (!slug) {
      setCodeError('Unesi kod eventa.');
      return;
    }
    setCodeError(null);
    openEvent(slug);
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs30,
    color: colors.ink,
  },
  camera: {
    height: size.hero,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  denied: {
    gap: space.gap,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
  notice: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs15,
    color: colors.ink,
  },
});
