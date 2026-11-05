import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../components/ui/Screen';
import { colors, fontSize, fonts, trackingTight } from '../../../constants/theme';

export default function AgendaScreen() {
  return (
    <Screen tabBar>
      <View style={styles.center}>
        <Text style={styles.title}>Agenda</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs30,
    color: colors.ink,
    letterSpacing: fontSize.fs30 * trackingTight,
  },
});
