import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { colors, fontSize, fonts, space, trackingTight } from '../../../constants/theme';

export default function HomeScreen() {
  return (
    <Screen tabBar>
      <View style={styles.center}>
        <Text style={styles.title}>Početna</Text>
        <Button label="Komponente" variant="secondary" onPress={() => router.push('/dev/ui')} />
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
});
