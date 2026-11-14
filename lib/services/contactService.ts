import { supabase } from '../supabase';
import { getSession } from './authService';

export type ContactListItem = {
  id: string;
  fullName: string;
  company: string | null;
  note: string | null;
  followUpDate: string | null;
  followUpDone: boolean;
  eventId: string | null;
  eventName: string | null;
};

export type Contact = ContactListItem & {
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  followUpDraft: string | null;
};

export type ContactWrite = {
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  note: string | null;
  followUpDate: string | null;
  followUpDraft?: string | null;
  followUpDone?: boolean;
  eventId?: string | null;
};

type EventName = { name: string } | { name: string }[] | null;

type ListRow = {
  id: string;
  full_name: string;
  company: string | null;
  note: string | null;
  follow_up_date: string | null;
  follow_up_done: boolean;
  event_id: string | null;
  events: EventName;
};

type DetailRow = ListRow & {
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  follow_up_draft: string | null;
};

const listColumns = 'id, full_name, company, note, follow_up_date, follow_up_done, event_id, events(name)';
const detailColumns = `${listColumns}, job_title, email, phone, linkedin_url, follow_up_draft`;

function eventName(value: EventName): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0]?.name ?? null) : value.name;
}

function listItem(row: ListRow): ContactListItem {
  return {
    id: row.id,
    fullName: row.full_name,
    company: row.company,
    note: row.note,
    followUpDate: row.follow_up_date,
    followUpDone: row.follow_up_done,
    eventId: row.event_id,
    eventName: eventName(row.events),
  };
}

function detailItem(row: DetailRow): Contact {
  return {
    ...listItem(row),
    jobTitle: row.job_title,
    email: row.email,
    phone: row.phone,
    linkedinUrl: row.linkedin_url,
    followUpDraft: row.follow_up_draft,
  };
}

export async function listContacts(search?: string): Promise<ContactListItem[]> {
  let query = supabase.from('contacts').select(listColumns).order('full_name', { ascending: true });
  const term = search?.trim().replace(/[%_,]/g, ' ') ?? '';
  if (term) query = query.or(`full_name.ilike.%${term}%,company.ilike.%${term}%,note.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ListRow[]).map(listItem);
}

export async function getContact(id: string): Promise<Contact | null> {
  const { data, error } = await supabase.from('contacts').select(detailColumns).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? detailItem(data as DetailRow) : null;
}

export async function createContact(data: ContactWrite): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error('Nisi prijavljen.');
  const { data: row, error } = await supabase
    .from('contacts')
    .insert({
      owner_id: session.user.id,
      full_name: data.fullName.trim(),
      job_title: data.jobTitle,
      company: data.company,
      email: data.email,
      phone: data.phone,
      linkedin_url: data.linkedinUrl,
      note: data.note,
      follow_up_date: data.followUpDate,
      follow_up_draft: data.followUpDraft ?? null,
      follow_up_done: data.followUpDone ?? false,
      event_id: data.eventId ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (row as { id: string }).id;
}

export async function updateContact(id: string, data: Partial<ContactWrite>): Promise<void> {
  const patch: Record<string, string | boolean | null> = {};
  if (data.fullName !== undefined) patch.full_name = data.fullName.trim();
  if (data.jobTitle !== undefined) patch.job_title = data.jobTitle;
  if (data.company !== undefined) patch.company = data.company;
  if (data.email !== undefined) patch.email = data.email;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.linkedinUrl !== undefined) patch.linkedin_url = data.linkedinUrl;
  if (data.note !== undefined) patch.note = data.note;
  if (data.followUpDate !== undefined) patch.follow_up_date = data.followUpDate;
  if (data.followUpDraft !== undefined) patch.follow_up_draft = data.followUpDraft;
  if (data.followUpDone !== undefined) patch.follow_up_done = data.followUpDone;
  if (data.eventId !== undefined) patch.event_id = data.eventId;
  const { error } = await supabase.from('contacts').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}
