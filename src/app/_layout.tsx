import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Button } from '../../components/ui/Button';
import { colors, fontSize, fonts, space } from '../../constants/theme';
import { CurrentEventProvider } from '../../lib/currentEvent';
import { takeEntry } from '../../lib/pendingEntry';
import { authErrorMessage, getSession, onAuthChange } from '../../lib/services/authService';
import { listenForNotificationOpens, registerForPush } from '../../lib/services/notificationService';
import { useTranslation } from 'react-i18next';
import { loadSavedLanguage } from '../../lib/i18n';
import { t } from '../../lib/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Fredoka_600SemiBold,
  });
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Jezik iz „Ja“ se učita pre prvog ekrana. Promena jezika ponovo nacrta celo stablo (key ispod).
  const { i18n } = useTranslation();
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    loadSavedLanguage().finally(() => setLanguageReady(true));
  }, []);

  useEffect(() => {
    if (loaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded, fontError]);

  useEffect(() => {
    let active = true;
    getSession()
      .then((value) => {
        if (active) setSession(value);
      })
      .catch((error) => {
        if (!active) return;
        setSession(null);
        setSessionError(authErrorMessage(error));
      });
    const stop = onAuthChange((value) => {
      if (!active) return;
      setSession(value);
      setSessionError(null);
    });
    return () => {
      active = false;
      stop();
    };
  }, [attempt]);

  // Posle prijave i kad se sačuvana sesija vrati. Ne čeka se: dozvola i token ne smeju da zaustave ulaz.
  useEffect(() => {
    if (!session?.user.id) return;
    void registerForPush();
    let active = true;
    takeEntry()
      .then((slug) => {
        if (active && slug) router.replace({ pathname: '/event/[slug]/welcome', params: { slug, enter: '1' } });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!loaded || fontError || !session?.user.id) return;
    return listenForNotificationOpens();
  }, [loaded, fontError, session?.user.id]);

  if ((!loaded && !fontError) || !languageReady) {
    return null;
  }

  if (fontError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('errors.fonts')}</Text>
      </View>
    );
  }

  if (session === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (sessionError && !session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{sessionError}</Text>
        <Button label={t('common.retry')} onPress={() => { setSession(undefined); setSessionError(null); setAttempt((value) => value + 1); }} />
      </View>
    );
  }

  return (
    <CurrentEventProvider key={i18n.language}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.appBg } }}>
        <Stack.Screen name="scan" />
        <Stack.Screen name="event/[slug]/welcome" />
        <Stack.Protected guard={session !== null}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="swap" />
        <Stack.Screen name="event/[slug]/profile" />
        <Stack.Screen name="contact/new" />
          <Stack.Screen name="contact/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={session === null}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </CurrentEventProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.gap,
    padding: space.edge,
    backgroundColor: colors.appBg,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
    textAlign: 'center',
  },
});
