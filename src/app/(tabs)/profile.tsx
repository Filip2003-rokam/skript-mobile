import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Segmented } from '../../../components/ui/Segmented';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { colors, fontSize, fonts, space, trackingTight } from '../../../constants/theme';
import { useCurrentEvent } from '../../../lib/currentEvent';
import { authErrorMessage, signOut } from '../../../lib/services/authService';

export default function ProfileScreen() {
  const { slug } = useCurrentEvent();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setLoading(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Screen tabBar>
      {view === 'contacts' ? <Segmented value="contacts" options={[{ id: 'contacts', label: 'Kontakti' }]} onChange={() => undefined} /> : null}
      <View style={styles.center}>
        <Text style={styles.title}>Profil</Text>
        {slug ? (
          <Button label="Profil eventa" variant="secondary" onPress={() => router.push({ pathname: '/event/[slug]/profile', params: { slug } })} />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Odjavi se" loading={loading} onPress={leave} />
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
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs30,
    color: colors.ink,
    letterSpacing: fontSize.fs30 * trackingTight,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs13,
    color: colors.destructive,
    textAlign: 'center',
  },
});
