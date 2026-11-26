export type EventRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  starts_on: string | null;
  days: number | null;
  rooms: string[];
  color: string | null;
  cover_url: string | null;
  logo_url: string | null;
};

export type InterestKind = 'interested' | 'skipped';

export type EventAttendeeProfile = {
  why: string[];
  role: string | null;
  company: string | null;
  offers: string[];
  needs: string[];
};
