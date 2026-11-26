import { supabase } from '../supabase';
import type { EventRow } from '../../types/database';
import { getSession } from './authService';
import { appLanguage, t } from '../i18n';

export type { EventRow };

type SessionClock = {
  day: number;
  start_time: string | null;
  duration_min: number | null;
};

export type EventPhase = 'before' | 'during' | 'after';

// Datum iz baze je kalendarski dan, ne ponoć u UTC.
function localDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function eventPhase(startsOn: string | null, days: number | null, now = new Date()): { phase: EventPhase; day: number } {
  if (!startsOn || !days || days < 1) {
    return { phase: 'before', day: 1 };
  }
  const start = localDay(startsOn);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  if (today < start) return { phase: 'before', day: 1 };
  if (today >= end) return { phase: 'after', day: days };
  const day = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  return { phase: 'during', day };
}

export function formatStartDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (appLanguage() === 'en') return `${Number(day)}/${Number(month)}/${year}`;
  return `${Number(day)}. ${Number(month)}. ${year}.`;
}

export function eventInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return value.trim().slice(0, 2).toUpperCase();
}

function dayMonth(date: Date): string {
  if (appLanguage() === 'en') return `${date.getDate()}/${date.getMonth() + 1}`;
  return `${date.getDate()}. ${date.getMonth() + 1}.`;
}

export function eventDateLabel(startsOn: string | null, days: number | null): string {
  if (!startsOn) return '';
  const start = localDay(startsOn);
  if (!days || days < 2) return dayMonth(start);
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  return `${dayMonth(start)} – ${dayMonth(end)}`;
}

export function eventPlaceLine(event: EventRow): string {
  return [event.city, eventDateLabel(event.starts_on, event.days)].filter(Boolean).join(' · ');
}

export function eventStatusLine(event: EventRow, live: number): string {
  if (!event.starts_on || !event.days) return t('event.startUnknown');
  const timing = eventPhase(event.starts_on, event.days);
  if (timing.phase === 'before') return t('event.starts', { date: formatStartDate(event.starts_on) });
  if (timing.phase === 'after') return t('event.ended');
  if (live < 1) return t('event.dayNoSessions', { day: timing.day });
  return t('event.dayLive', { day: timing.day, count: live });
}

function clockMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

async function userId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error(t('errors.signedOut'));
  return session.user.id;
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const { data, error } = await supabase
    .from('events')
    .select('id, slug, name, city, starts_on, days, rooms, color, cover_url, logo_url')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyEvents(): Promise<EventRow[]> {
  const id = await userId();
  const { data, error } = await supabase
    .from('event_attendees')
    .select('events(id, slug, name, city, starts_on, days, rooms, color, cover_url, logo_url)')
    .eq('user_id', id);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const event = row.events as EventRow | EventRow[] | null;
    if (!event) return [];
    return Array.isArray(event) ? event : [event];
  });
}

export async function getMyAttendance(eventId: string) {
  const id = await userId();
  const { data, error } = await supabase
    .from('event_attendees')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function countLiveSessions(eventId: string, now = new Date()): Promise<number> {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('starts_on, days')
    .eq('id', eventId)
    .maybeSingle();
  if (eventError) throw eventError;
  const phase = eventPhase(event?.starts_on ?? null, event?.days ?? null, now);
  if (phase.phase !== 'during') return 0;

  const { data, error } = await supabase
    .from('event_sessions')
    .select('day, start_time, duration_min')
    .eq('event_id', eventId)
    .eq('day', phase.day);
  if (error) throw error;

  const minute = now.getHours() * 60 + now.getMinutes();
  return ((data ?? []) as SessionClock[]).filter((session) => {
    if (!session.start_time) return false;
    const start = clockMinutes(session.start_time);
    return minute >= start && minute < start + (session.duration_min ?? 0);
  }).length;
}
