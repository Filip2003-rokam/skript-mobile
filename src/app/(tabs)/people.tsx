import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { People, type PeopleView } from '../../../components/People';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Screen } from '../../../components/ui/Screen';
import { ErrorState, LoadingState } from '../../../components/ui/State';
import { colors, size } from '../../../constants/theme';
import { useLinkedSlug } from '../../../lib/useLinkedSlug';
import { t } from '../../../lib/i18n';

const views: PeopleView[] = ['suggestions', 'saved', 'requests', 'connected'];

function selectedView(value: string | string[] | undefined): PeopleView {
  const raw = Array.isArray(value) ? value[0] : value;
  return views.includes(raw as PeopleView) ? (raw as PeopleView) : 'suggestions';
}

export default function PeopleScreen() {
  const { view, slug: slugParam } = useLocalSearchParams<{ view?: string; slug?: string }>();
  const { slug, ready, error, reload } = useLinkedSlug('/people', slugParam, selectedView(view));

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
            text={t('empty.noEventPeople')}
            action={t('common.scan')}
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
