import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Agenda } from '../../../components/Agenda';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { colors, fontSize, fonts, space } from '../../../constants/theme';
import { useCurrentEvent } from '../../../lib/currentEvent';

export default function AgendaScreen() {
  const { slug, ready } = useCurrentEvent();

  if (!ready) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </Screen>
    );
  }

  if (!slug) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <Text style={styles.message}>Skeniraj QR kod eventa</Text>
          <Button label="Skeniraj" onPress={() => router.push('/scan')} />
        </View>
      </Screen>
    );
  }

  return <Agenda slug={slug} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.gap,
  },
  message: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs17,
    color: colors.ink,
    textAlign: 'center',
  },
});
