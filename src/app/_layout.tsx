import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { colors, fontSize, fonts, space } from '../../constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Fredoka_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Fontovi nisu učitani. Proveri vezu i pokreni aplikaciju ponovo.</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.appBg } }} />;
}

const styles = {
  error: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: space.edge,
    backgroundColor: colors.appBg,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
    textAlign: 'center' as const,
  },
};
