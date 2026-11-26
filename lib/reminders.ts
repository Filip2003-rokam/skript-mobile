// Podsetnici koje telefon zakaže sam, bez servera i bez mreže.
// Ovde je samo računanje: šta, kada i sa kojim tekstom. Zakazivanje je u lib/services/agendaReminderService.ts.
import { t } from './i18n';

export const reminderLeadMinutes = 10;

export type Reminder = {
  /** Stalni ključ, da se isti podsetnik ne zakaže dvaput: session:<id> ili meeting:<id>. */
  key: string;
  at: Date;
  title: string;
  body: string;
  url: string;
};

type SessionInput = { id: string; title: string; room: string | null; day: number | null; start_time: string | null };
type MeetingInput = { id: string; otherName: string | null; day: number; time: string; place: string; status: string };

/** Lokalno vreme: prvi dan eventa + (dan - 1), u satu iz agende. */
export function eventMoment(startsOn: string | null, day: number | null, clock: string | null): Date | null {
  if (!startsOn || !clock) return null;
  const [year, month, date] = startsOn.split('-').map(Number);
  const [hour, minute] = clock.split(':').map(Number);
  if ([year, month, date, hour, minute].some((value) => value == null || Number.isNaN(value))) return null;
  return new Date(year, month - 1, date + Math.max((day ?? 1) - 1, 0), hour, minute, 0, 0);
}

function reminderUrl(slug: string): string {
  return `/agenda?view=myDay&slug=${encodeURIComponent(slug)}`;
}

/** Podsetnik 10 minuta pre svake sačuvane sesije koja tek dolazi. */
export function sessionReminders(input: {
  slug: string;
  startsOn: string | null;
  sessions: SessionInput[];
  savedIds: Set<string>;
  now?: Date;
}): Reminder[] {
  const now = input.now ?? new Date();
  const list: Reminder[] = [];
  for (const session of input.sessions) {
    if (!input.savedIds.has(session.id)) continue;
    const start = eventMoment(input.startsOn, session.day, session.start_time);
    if (!start) continue;
    const at = new Date(start.getTime() - reminderLeadMinutes * 60 * 1000);
    if (at <= now) continue;
    list.push({
      key: `session:${session.id}`,
      at,
      title: t('reminder.sessionTitle', { minutes: reminderLeadMinutes }),
      body: session.room ? t('reminder.sessionBodyRoom', { title: session.title, room: session.room }) : session.title,
      url: reminderUrl(input.slug),
    });
  }
  return list.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Podsetnik 10 minuta pre svakog prihvaćenog sastanka koji tek dolazi. */
export function meetingReminders(input: { slug: string; startsOn: string | null; meetings: MeetingInput[]; now?: Date }): Reminder[] {
  const now = input.now ?? new Date();
  const list: Reminder[] = [];
  for (const meeting of input.meetings) {
    if (meeting.status !== 'accepted') continue;
    const start = eventMoment(input.startsOn, meeting.day, meeting.time);
    if (!start) continue;
    const at = new Date(start.getTime() - reminderLeadMinutes * 60 * 1000);
    if (at <= now) continue;
    list.push({
      key: `meeting:${meeting.id}`,
      at,
      title: t('reminder.meetingTitle', { minutes: reminderLeadMinutes }),
      body: t('reminder.meetingBody', { name: meeting.otherName?.trim() || t('person.unknown'), place: meeting.place }),
      url: reminderUrl(input.slug),
    });
  }
  return list.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export type CalendarDraft = { title: string; start: Date; end: Date; location: string | null; notes: string | null };

const meetingMinutes = 30;

export function sessionCalendarDraft(
  event: { name: string; starts_on: string | null; city?: string | null },
  session: SessionInput & { duration_min: number | null; speakers?: string[] },
): CalendarDraft | null {
  const start = eventMoment(event.starts_on, session.day, session.start_time);
  if (!start) return null;
  const end = new Date(start.getTime() + (session.duration_min ?? meetingMinutes) * 60 * 1000);
  const location = [session.room, event.name].filter(Boolean).join(', ');
  const speakers = session.speakers?.filter(Boolean).join(', ');
  return { title: session.title, start, end, location: location || null, notes: speakers || null };
}

export function meetingCalendarDraft(event: { name: string; starts_on: string | null }, meeting: MeetingInput): CalendarDraft | null {
  if (meeting.status !== 'accepted') return null;
  const start = eventMoment(event.starts_on, meeting.day, meeting.time);
  if (!start) return null;
  const name = meeting.otherName?.trim() || t('person.unknown');
  return {
    title: t('reminder.meetingCalendarTitle', { name }),
    start,
    end: new Date(start.getTime() + meetingMinutes * 60 * 1000),
    location: [meeting.place, event.name].filter(Boolean).join(', '),
    notes: null,
  };
}
