import { Platform } from 'react-native';
import * as CalendarLegacy from 'expo-calendar/legacy';
import { getDefaultCalendarSync, requestCalendarPermissions } from 'expo-calendar';
import { Contact } from 'expo-contacts';
import { t } from '../i18n';

// Ono što web ne može: upis pravo u kalendar i imenik telefona, kroz sistemski prozor.
// Korisnik vidi popunjenu formu i sam potvrdi. Aplikacija ne čita njegov kalendar ni imenik.

export type CalendarItem = {
  title: string;
  start: Date;
  end: Date;
  location?: string | null;
  notes?: string | null;
};

/** Android ne javlja šta je korisnik uradio u kalendaru, pa je tamo ishod uvek 'opened'. */
export type CalendarOutcome = 'saved' | 'opened' | 'canceled' | 'denied';

export async function addToCalendar(item: CalendarItem): Promise<CalendarOutcome> {
  if (Platform.OS === 'web') throw new Error(t('device.unsupported'));
  const details = {
    title: item.title,
    startDate: item.start,
    endDate: item.end,
    location: item.location ?? undefined,
    notes: item.notes ?? undefined,
  };
  if (Platform.OS === 'android') {
    // Android otvara svoju aplikaciju kalendara preko Intent-a. Dozvola nije potrebna.
    await CalendarLegacy.createEventInCalendarAsync(details);
    return 'opened';
  }
  // iOS 17+: dozvola „samo dodavanje“. Aplikacija ne vidi postojeće događaje.
  const permission = await requestCalendarPermissions(true);
  if (!permission.granted) return 'denied';
  const result = await getDefaultCalendarSync().addEventWithForm(details);
  return result.action === 'saved' ? 'saved' : 'canceled';
}

export type PhoneContact = {
  fullName: string;
  company?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  note?: string | null;
};

/** Sistemska forma „Novi kontakt“, već popunjena. Vraća true ako je korisnik sačuvao. */
export async function saveToPhoneContacts(person: PhoneContact): Promise<boolean> {
  if (Platform.OS === 'web') throw new Error(t('device.unsupported'));
  const parts = person.fullName.trim().split(/\s+/);
  const givenName = parts.shift() ?? '';
  const familyName = parts.join(' ');
  return Contact.presentCreateForm({
    givenName,
    familyName: familyName || undefined,
    company: person.company?.trim() || undefined,
    jobTitle: person.role?.trim() || undefined,
    emails: person.email ? [{ label: 'work', address: person.email }] : undefined,
    phones: person.phone ? [{ label: 'mobile', number: person.phone }] : undefined,
    urlAddresses: person.linkedin ? [{ label: 'LinkedIn', url: person.linkedin }] : undefined,
    note: person.note?.trim() || undefined,
  });
}
