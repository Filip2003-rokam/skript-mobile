import { followUpIsDue } from '../../lib/contactDates';
import { countAcceptedToday, getConnected, getIncoming, getOutgoing, type ConnectionPerson } from '../../lib/services/connectionService';
import { listContacts } from '../../lib/services/contactService';
import { listMine, type InterestPerson } from '../../lib/services/interestService';
import { getSuggestions, type Suggestion } from '../../lib/services/matchService';
import { listSessions, type SessionRow } from '../../lib/services/sessionService';

export type HomeFacts = {
  sessions: SessionRow[];
  suggestions: number;
  linksToday: number;
  followUps: number;
};

export const emptyFacts: HomeFacts = { sessions: [], suggestions: 0, linksToday: 0, followUps: 0 };

// Isti sakriveni ljudi kao na tabu Predlozi: interesovanje, preskok, veza i otvoren zahtev.
function visibleSuggestions(
  suggestions: Suggestion[],
  open: InterestPerson[],
  skipped: InterestPerson[],
  connected: ConnectionPerson[],
  incoming: ConnectionPerson[],
  outgoing: ConnectionPerson[],
): number {
  const hidden = new Set<string>();
  for (const person of [...open, ...skipped, ...connected]) hidden.add(person.userId);
  for (const person of [...incoming, ...outgoing]) {
    if (person.status === 'pending') hidden.add(person.userId);
  }
  return suggestions.filter((item) => !hidden.has(item.suggestedUserId)).length;
}

export async function loadFacts(eventId: string): Promise<HomeFacts> {
  const [sessions, suggestions, interests, incoming, outgoing, connected, contacts, linksToday] = await Promise.all([
    listSessions(eventId),
    getSuggestions(eventId),
    listMine(eventId),
    getIncoming(eventId),
    getOutgoing(eventId),
    getConnected(eventId),
    listContacts(),
    countAcceptedToday(eventId),
  ]);
  return {
    sessions,
    suggestions: visibleSuggestions(suggestions, interests.open, interests.skipped, connected, incoming, outgoing),
    linksToday,
    followUps: contacts.filter((contact) => followUpIsDue(contact.followUpDate, contact.followUpDone)).length,
  };
}
