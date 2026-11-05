import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { Segmented } from '../../../components/ui/Segmented';
import { colors, fontSize, fonts, trackingTight } from '../../../constants/theme';

const peopleViews = [
  { id: 'suggestions', label: 'Predlozi' },
  { id: 'requests', label: 'Zahtevi' },
];

export default function PeopleScreen() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const selected = view === 'requests' || view === 'suggestions' ? view : null;

  return (
    <Screen tabBar>
      {selected ? <Segmented value={selected} options={peopleViews} onChange={(id) => router.setParams({ view: id })} /> : null}
      <View style={styles.center}>
        <Text style={styles.title}>Ljudi</Text>
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
