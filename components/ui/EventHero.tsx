import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, space, trackingTight } from '../../constants/theme';

// Vrh svake strane osim početne: samo ime eventa. Gde si, vidi se u donjoj traci.
export function EventHero({ eventName }: { eventName: string }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" numberOfLines={2} style={styles.name}>
        {eventName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.gap, paddingBottom: space.tight },
  name: {
    fontFamily: fonts.display,
    fontSize: fontSize.fs22,
    color: colors.ink,
    letterSpacing: fontSize.fs22 * trackingTight,
  },
});
