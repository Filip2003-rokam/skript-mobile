import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Reminder } from '../reminders';
import { remindersEnabled } from './reminderService';

// iOS drži najviše 64 zakazana obaveštenja po aplikaciji. Ostavljamo mesta i za ostalo.
const maxScheduled = 20; // po vrsti
const prefix = 'agenda:';

function identifier(eventId: string, key: string): string {
  return `${prefix}${eventId}:${key}`;
}

export type ReminderScope = 'session' | 'meeting';

/**
 * Zakazani podsetnici jedne vrste (sesije ili sastanci) za ovaj event postaju tačno `reminders`.
 * Vrste se usklađuju odvojeno: agenda zna sačuvane sesije, a sastanke učitava i ekran Ljudi.
 * Ne traži dozvolu: pita se jednom posle prijave (registerForPush). Bez dozvole ne radi ništa.
 * Prati isti prekidač „Podsetnici“ u profilu kao i follow-up podsetnici.
 */
export async function syncAgendaReminders(eventId: string, scope: ReminderScope, reminders: Reminder[]): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') return;
    const enabled = await remindersEnabled();

    const wanted = new Map((enabled ? reminders : []).slice(0, maxScheduled).map((item) => [identifier(eventId, item.key), item]));
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const eventPrefix = `${prefix}${eventId}:${scope}:`;

    for (const request of scheduled) {
      if (!request.identifier.startsWith(eventPrefix)) continue;
      const next = wanted.get(request.identifier);
      const sameTime = next && request.content.data?.at === next.at.toISOString();
      const sameText = next && request.content.title === next.title && request.content.body === next.body;
      if (sameTime && sameText) {
        wanted.delete(request.identifier);
        continue;
      }
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }

    for (const [id, item] of wanted) {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title: item.title, body: item.body, data: { url: item.url, at: item.at.toISOString() }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.at, channelId: 'default' },
      });
    }
  } catch {
    // Podsetnik je dodatak. Ako zakazivanje ne uspe, agenda i Moj dan rade isto.
  }
}

/** Pri odjavi: tuđi podsetnici ne smeju da ostanu na telefonu. */
export async function clearAgendaReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of scheduled) {
      if (request.identifier.startsWith(prefix)) await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  } catch {
    // Nema zakazanih ili native modul nije dostupan.
  }
}
