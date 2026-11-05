export type EventRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  starts_on: string | null;
  days: number | null;
  cover_url: string | null;
  logo_url: string | null;
};

export type EventAttendeeProfile = {
  why: string[];
  role: string | null;
  company: string | null;
  offers: string[];
  needs: string[];
};
