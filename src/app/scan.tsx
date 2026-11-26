import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { colors, fontSize, fonts, radius, size, space } from '../../constants/theme';
import { readSkriptQr } from '../../lib/skriptQr';
import { t } from '../../lib/i18n';

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

  function openEvent(next: string, webUrl?: string) {
    router.push({ pathname: '/event/[slug]/welcome', params: webUrl ? { slug: next, web: webUrl } : { slug: next } });
  }

  function unlock() {
    setLocked(false);
  }

  function onScan(value: string) {
    if (locked || lastCode.current === value) return;
    lastCode.current = value;
    const result = readSkriptQr(value);
    if (result.kind === 'event') {
      setLocked(true);
      openEvent(result.slug, result.webUrl);
      return;
    }
    if (result.kind === 'user' || result.kind === 'swap') {
      setNotice(t('scan.personCode'));
      return;
    }
    setNotice(t('scan.notSkript'));
  }

  function enterByCode() {
    const next = code.trim();
    if (!next) {
      setCodeError(t('scan.enterCode'));
      return;
    }
    setCodeError(null);
    openEvent(next);
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('scan.title')}</Text>
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
              ? t('scan.cameraNeeded')
              : t('scan.cameraDenied')}
          </Text>
          <Button
            label={permission.canAskAgain ? t('camera.allow') : t('camera.openSettings')}
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          />
        </View>
      )}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <TextField label={t('scan.eventCode')} value={code} onChangeText={setCode} error={codeError ?? undefined} autoCapitalize="none" />
      <Button label={t('scan.enter')} onPress={enterByCode} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: fontSize.fs30, color: colors.ink },
  camera: { height: size.hero, borderRadius: radius.card, overflow: 'hidden' },
  denied: { gap: space.gap },
  body: { fontFamily: fonts.regular, fontSize: fontSize.fs15, color: colors.ink },
  notice: { fontFamily: fonts.semibold, fontSize: fontSize.fs15, color: colors.ink },
});
