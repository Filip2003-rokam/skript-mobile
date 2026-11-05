import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { colors, fontSize, fonts, space } from '../../constants/theme';
import { CurrentEventProvider } from '../../lib/currentEvent';
import { authErrorMessage, getSession, onAuthChange } from '../../lib/services/authService';

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
  }, []);

  if (!loaded && !fontError) {
    return null;
  }

  if (fontError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Fontovi nisu učitani. Proveri vezu i pokreni aplikaciju ponovo.</Text>
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
      </View>
    );
  }

  return (
    <CurrentEventProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.appBg } }}>
        <Stack.Protected guard={session !== null}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scan" />
          <Stack.Screen name="event/[slug]/welcome" />
          <Stack.Screen name="event/[slug]/profile" />
          <Stack.Screen name="dev/ui" />
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
