import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { People, type PeopleView } from '../../../components/People';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { colors, fontSize, fonts, space } from '../../../constants/theme';
import { useCurrentEvent } from '../../../lib/currentEvent';

const views: PeopleView[] = ['suggestions', 'saved', 'requests', 'connected'];

function selectedView(value: string | string[] | undefined): PeopleView {
  const raw = Array.isArray(value) ? value[0] : value;
  return views.includes(raw as PeopleView) ? (raw as PeopleView) : 'suggestions';
}

export default function PeopleScreen() {
  const { slug, ready } = useCurrentEvent();
  const { view } = useLocalSearchParams<{ view?: string }>();

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

  return <People slug={slug} view={selectedView(view)} onView={(next) => router.setParams({ view: next })} />;
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
