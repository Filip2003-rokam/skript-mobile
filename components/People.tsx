import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, fontSize, fonts, space } from '../constants/theme';
import { Button } from './ui/Button';
import { EventHero } from './ui/EventHero';
import { Screen } from './ui/Screen';
import { Segmented } from './ui/Segmented';
import { Requests } from './people/Requests';
import { Roster } from './people/Roster';
import { Suggestions } from './people/Suggestions';
import { usePeople } from './people/usePeople';

export type PeopleView = 'suggestions' | 'saved' | 'requests' | 'connected';

const tabs = [
  { id: 'suggestions', label: 'Predlozi' },
  { id: 'saved', label: 'Sačuvani' },
  { id: 'requests', label: 'Zahtevi' },
  { id: 'connected', label: 'Povezani' },
];

type PeopleProps = {
  slug: string;
  view: PeopleView;
  onView: (view: PeopleView) => void;
};

export function People({ slug, view, onView }: PeopleProps) {
  const data = usePeople(slug);

  if (!data.ready) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </Screen>
    );
  }

  if (data.missing || data.error || !data.event) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <Text style={styles.message}>{data.error ?? 'Ovaj event ne postoji. Skeniraj QR kod ponovo.'}</Text>
          <Button label={data.error ? 'Pokušaj ponovo' : 'Skeniraj'} onPress={() => (data.error ? data.retry() : router.push('/scan'))} />
        </View>
      </Screen>
    );
  }

  const savedIds = new Set(data.saved.map((person) => person.userId));

  return (
    <Screen tabBar scroll>
      <EventHero eventName={data.event.name} title="Ljudi" coverUri={data.event.cover_url ?? undefined} />
      <Segmented
        value={view}
        options={tabs}
        onChange={(id) => {
          if (id === 'suggestions' || id === 'saved' || id === 'requests' || id === 'connected') onView(id);
        }}
      />
      {view === 'suggestions' ? (
        <Suggestions
          suggestions={data.suggestions}
          savedIds={savedIds}
          outgoing={data.outgoing}
          connected={data.connected}
          refreshing={data.refreshing}
          refreshError={data.refreshError}
          onRefresh={() => void data.refresh()}
          onConnect={data.connect}
          onToggleSave={data.toggleSave}
        />
      ) : null}
      {view === 'saved' ? (
        <Roster
          people={data.saved}
          empty="Još nikog nisi sačuvao."
          onFind={() => onView('suggestions')}
          trailing={(person) => (
            <Button size="sm" variant="secondary" label="Sačuvano" onPress={() => void data.toggleSave(person.userId)}>
              <Feather name="bookmark" size={16} color={colors.ink} />
            </Button>
          )}
        />
      ) : null}
      {view === 'requests' ? (
        <Requests
          incoming={data.incoming}
          outgoing={data.outgoing}
          onAccept={(id) => data.answer(id, 'accepted')}
          onDecline={(id) => data.answer(id, 'declined')}
          onFind={() => onView('suggestions')}
        />
      ) : null}
      {view === 'connected' ? (
        <Roster
          people={data.connected}
          empty="Još nema veza."
          onFind={() => onView('suggestions')}
          trailing={() => <Text style={styles.linked}>Povezani</Text>}
        />
      ) : null}
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
  message: {
    fontFamily: fonts.regular,
    fontSize: fontSize.fs15,
    color: colors.ink,
    textAlign: 'center',
  },
  linked: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
});
