import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { People, type PeopleView } from '../../../components/People';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Screen } from '../../../components/ui/Screen';
import { ErrorState, LoadingState } from '../../../components/ui/State';
import { colors, size } from '../../../constants/theme';
import { useCurrentEvent } from '../../../lib/currentEvent';

const views: PeopleView[] = ['suggestions', 'saved', 'requests', 'connected'];

function selectedView(value: string | string[] | undefined): PeopleView {
  const raw = Array.isArray(value) ? value[0] : value;
  return views.includes(raw as PeopleView) ? (raw as PeopleView) : 'suggestions';
}

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? '';
}

export default function PeopleScreen() {
  const { slug: storedSlug, ready, error, setSlug, reload } = useCurrentEvent();
  const { view, slug: slugParam } = useLocalSearchParams<{ view?: string; slug?: string }>();
  const linkedSlug = firstParam(slugParam);
  const applied = useRef('');
  const slug = linkedSlug || storedSlug;

  // Notifikacija šalje /people?view=requests&slug=... Dok je slug u adresi, otvori taj event, pa ga skloni iz adrese.
  useEffect(() => {
    if (!linkedSlug) {
      applied.current = '';
      return;
    }
    if (!ready || applied.current === linkedSlug) return;
    if (linkedSlug !== storedSlug) {
      void setSlug(linkedSlug);
      return;
    }
    applied.current = linkedSlug;
    router.replace({ pathname: '/people', params: { view: selectedView(view), slug: '' } });
  }, [linkedSlug, storedSlug, ready, setSlug, view]);

  if (!ready && !slug) {
    return (
      <Screen tabBar>
        <LoadingState />
      </Screen>
    );
  }

  if (error && !slug) {
    return (
      <Screen tabBar>
        <ErrorState text={error} onRetry={reload} />
      </Screen>
    );
  }

  if (!slug) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <EmptyState
            icon={<Feather name="users" size={size.iconMd} color={colors.ink} />}
            text="Nema izabranog eventa. Skeniraj QR kod da vidiš ljude."
            action="Skeniraj"
            onAction={() => router.push('/scan')}
          />
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
  },
});
