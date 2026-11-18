import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { getSession } from './authService';

export type VoiceDraft = {
  note: string;
  topic: string;
  followUpDate: string | null;
  subject: string;
  body: string;
  followUpDraft: string | null;
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
};

const fallback = 'Beleška nije obrađena. Proveri vezu i pokušaj ponovo.';

export function formatDraft(subject: string, body: string): string | null {
  const title = subject.trim();
  const text = body.trim();
  if (!title && !text) return null;
  if (!title) return text;
  if (!text) return `Predmet: ${title}`;
  return `Predmet: ${title}\n\n${text}`;
}

export function splitDraft(draft: string | null): { subject: string; body: string } {
  if (!draft?.trim()) return { subject: '', body: '' };
  const match = /^Predmet: ([^\n]*)\n\n([\s\S]*)$/.exec(draft);
  if (!match) return { subject: '', body: draft.trim() };
  return { subject: match[1].trim(), body: match[2].trim() };
}

export function noteWithTopic(note: string, topic: string, existing?: string | null): string | null {
  const topicLine = topic.trim() ? `Tema: ${topic.trim()}` : '';
  const parts = [existing?.trim(), note.trim(), topicLine].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join('\n\n') : null;
}

export type FollowUpTone = 'plain' | 'shorter' | 'formal';

export async function draftFollowUp(input: { note: string; name: string; company: string | null; event: string | null; tone: FollowUpTone }): Promise<{ subject: string; body: string; followUpDraft: string | null }> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen. Prijavi se i pokušaj ponovo.');
  const { data, error } = await supabase.functions.invoke('voice-note', {
    body: { text: input.note, name: input.name, company: input.company ?? '', event: input.event ?? '', tone: input.tone },
  });
  if (error) throw new Error(await functionMessage(error));
  const row = data as Record<string, unknown> | null;
  const subject = text(row?.email_subject);
  const body = text(row?.email_body);
  if (!subject && !body) throw new Error('Nacrt nije napisan. Proveri belešku i pokušaj ponovo.');
  return { subject, body, followUpDraft: formatDraft(subject, body) };
}

export async function transcribeVoiceNote(audioBase64: string, mimeType: string): Promise<VoiceDraft> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen. Prijavi se i pokušaj ponovo.');

  const { data, error } = await supabase.functions.invoke('voice-note', {
    body: { audio_base64: audioBase64, mime_type: mimeType },
  });
  if (error) throw new Error(await functionMessage(error));

  const row = data as Record<string, unknown> | null;
  const note = text(row?.note);
  if (!note) throw new Error('Nisam razumeo snimak. Govori bliže mikrofonu i pokušaj ponovo.');
  const subject = text(row?.email_subject);
  const body = text(row?.email_body);
  return {
    note,
    topic: text(row?.topic),
    followUpDate: dateOrNull(row?.follow_up_date),
    subject,
    body,
    followUpDraft: formatDraft(subject, body),
    fullName: text(row?.full_name),
    jobTitle: text(row?.job_title),
    company: text(row?.company),
    email: text(row?.email),
    phone: text(row?.phone),
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function dateOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

async function functionMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    try {
      const body = (await error.context.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) return body.error;
    } catch {
      return fallback;
    }
  }
  return fallback;
}
