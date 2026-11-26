import { router } from 'expo-router';
import { Section } from './HomeSections';
import { SessionCard } from '../ui/SessionCard';
import { upcomingSessions, type SessionRow } from '../../lib/services/sessionService';
import { t } from '../../lib/i18n';

export function HomeNext({ startsOn, days, sessions, now }: { startsOn: string | null; days: number | null; sessions: SessionRow[]; now: Date }) {
  const next = upcomingSessions(startsOn, days, sessions, now, 4);
  if (next.length === 0) return null;
  return (
    <Section title={t('home.nextTitle')}>
      {next.map((session) => (
        <SessionCard key={session.id} session={session} mark="upcoming" onPress={() => router.push('/agenda')} />
      ))}
    </Section>
  );
}
