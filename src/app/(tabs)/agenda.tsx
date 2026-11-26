import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Agenda } from '../../../components/Agenda';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Screen } from '../../../components/ui/Screen';
import { ErrorState, LoadingState } from '../../../components/ui/State';
import { colors, size, space } from '../../../constants/theme';
import { useCurrentEvent } from '../../../lib/currentEvent';
import { t } from '../../../lib/i18n';

export default function AgendaScreen() {
  const { slug, ready, error, reload } = useCurrentEvent();

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
            icon={<Feather name="calendar" size={size.iconMd} color={colors.ink} />}
            text={t('empty.noEventAgenda')}
            action={t('common.scan')}
            onAction={() => router.push('/scan')}
          />
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
  },
});
