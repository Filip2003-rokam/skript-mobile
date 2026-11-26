import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, fontSize, fonts, size, space } from '../constants/theme';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { EventHero } from './ui/EventHero';
import { Screen } from './ui/Screen';
import { Segmented } from './ui/Segmented';
import { InlineError, LoadingState } from './ui/State';
import { Requests } from './people/Requests';
import { Roster } from './people/Roster';
import { Suggestions } from './people/Suggestions';
import { usePeople } from './people/usePeople';
import { t } from '../lib/i18n';
import { useState } from 'react';
import { MeetingBlock } from './meetings/MeetingBlock';
import { ProposeMeetingSheet } from './meetings/ProposeMeetingSheet';
import { useMeetings } from './meetings/useMeetings';

export type PeopleView = 'suggestions' | 'saved' | 'requests' | 'connected';

type PeopleProps = {
  slug: string;
  view: PeopleView;
  onView: (view: PeopleView) => void;
};

export function People({ slug, view, onView }: PeopleProps) {
  const data = usePeople(slug);
  const meetings = useMeetings(data.event ?? null);
  const [meetWith, setMeetWith] = useState<{ userId: string; name: string | null } | null>(null);

  if (!data.event && !data.ready) {
    return (
      <Screen tabBar>
        <LoadingState />
      </Screen>
    );
  }

  if (!data.event) {
    return (
      <Screen tabBar>
        <View style={styles.center}>
          <EmptyState
            icon={<Feather name={data.error ? 'alert-circle' : 'users'} size={size.iconMd} color={colors.ink} />}
            text={data.error ?? t('errors.eventMissingRescan')}
            action={data.error ? t('common.retry') : t('common.scan')}
            onAction={() => (data.error ? data.retry() : router.push('/scan'))}
          />
        </View>
      </Screen>
    );
  }

  const savedIds = new Set(data.saved.map((person) => person.userId));
  const pending = data.incoming.filter((person) => person.status === 'pending').length;
  const tabs = [
    { id: 'suggestions', label: t('people.suggestions') },
    { id: 'saved', label: t('people.saved') },
    { id: 'requests', label: t('people.requests'), count: pending > 0 ? pending : undefined },
    { id: 'connected', label: t('people.connected') },
  ];

  const eventDays = data.event.days;
  // Isti red ispod svake osobe: žuto dok sastanak čeka, zeleno kad je zakazan.
  const meetingLine = (userId: string) => {
    const meeting = meetings.byPerson.get(userId);
    return meeting ? <MeetingBlock meeting={meeting} eventDays={eventDays} onChanged={() => void meetings.reload()} event={data.event ?? null} /> : null;
  };
  const meetButton = (person: { userId: string; name: string | null }) =>
    meetings.byPerson.has(person.userId) ? null : (
      <Button size="sm" variant="secondary" label={t('meetings.suggest')} onPress={() => setMeetWith(person)}>
        <Feather name="calendar" size={size.iconSm} color={colors.ink} />
      </Button>
    );

  return (
    <Screen tabBar scroll>
      {data.error ? <InlineError text={data.error} onRetry={data.retry} /> : null}
      <EventHero eventName={data.event.name} />
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
          skipped={data.skipped}
          savedIds={savedIds}
          refreshing={data.refreshing}
          refreshError={data.refreshError}
          onRefresh={() => void data.refresh()}
          onInterest={(userId) => data.interest(userId)}
          onSkip={(userId) => data.skip(userId)}
          onRestore={(interestId) => data.withdraw(interestId)}
          onToggleSave={data.toggleSave}
          meetingLine={meetingLine}
          onMeet={setMeetWith}
        />
      ) : null}
      {view === 'saved' ? (
        <Roster
          people={data.saved}
          empty={t('people.noSaved')}
          onFind={() => onView('suggestions')}
          trailing={(person) => (
            <Button size="sm" variant="secondary" label={t('common.saved')} onPress={() => void data.toggleSave(person.userId)}>
              <Feather name="bookmark" size={size.iconSm} color={colors.ink} />
            </Button>
          )}
          footer={(person) => meetingLine(person.userId) ?? meetButton(person)}
        />
      ) : null}
      {view === 'requests' ? (
        <Requests
          incoming={data.incoming}
          outgoing={data.outgoing}
          open={data.openInterests}
          onAccept={(id) => data.answer(id, 'accepted')}
          onDecline={(id) => data.answer(id, 'declined')}
          onWithdraw={(id) => data.withdraw(id)}
          onFind={() => onView('suggestions')}
        />
      ) : null}
      {view === 'connected' ? (
        <Roster
          people={data.connected}
          empty={t('people.noConnections')}
          onFind={() => onView('suggestions')}
          trailing={() => <Text style={styles.linked}>{t('people.connected')}</Text>}
          footer={(person) => meetingLine(person.userId) ?? meetButton(person)}
        />
      ) : null}
      <ProposeMeetingSheet
        open={meetWith != null}
        eventId={data.event.id}
        eventDays={eventDays}
        person={meetWith}
        onClose={() => setMeetWith(null)}
        onSent={() => {
          setMeetWith(null);
          void meetings.reload();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linked: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.fs13,
    color: colors.ink,
  },
});
