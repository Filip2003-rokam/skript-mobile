import { t } from '../lib/i18n';

export type Choice = { key: string; label: string };

// Ključ ide u bazu i ostaje engleski. Natpis se čita na crtanju, pa prati izabrani jezik.
function choice(group: string, key: string, slug: string): Choice {
  return {
    key,
    get label() {
      return t(`options.${group}.${slug}`);
    },
  };
}

export const whyOptions: Choice[] = [
  choice('why', 'Sell', 'sell'),
  choice('why', 'Find clients', 'find_clients'),
  choice('why', 'Buy', 'buy'),
  choice('why', 'Invest', 'invest'),
  choice('why', 'Raise', 'raise'),
  choice('why', 'Hire', 'hire'),
  choice('why', 'Find partners', 'find_partners'),
  choice('why', 'Learn', 'learn'),
];

export const roleOptions: Choice[] = [
  choice('role', 'Founder', 'founder'),
  choice('role', 'Investor', 'investor'),
  choice('role', 'Sales', 'sales'),
  choice('role', 'Product', 'product'),
  choice('role', 'Engineering', 'engineering'),
  choice('role', 'Marketing', 'marketing'),
  choice('role', 'Student', 'student'),
  choice('role', 'Other', 'other'),
];

export const offerOptions: Choice[] = [
  choice('offer', 'Software development', 'software_development'),
  choice('offer', 'Design', 'design'),
  choice('offer', 'Funding', 'funding'),
  choice('offer', 'Sales intros', 'sales_intros'),
  choice('offer', 'Marketing', 'marketing'),
  choice('offer', 'Mentoring', 'mentoring'),
];

export const needOptions: Choice[] = [
  choice('need', 'Clients', 'clients'),
  choice('need', 'Funding', 'funding'),
  choice('need', 'Developers', 'developers'),
  choice('need', 'Partners', 'partners'),
  choice('need', 'Hiring', 'hiring'),
  choice('need', 'Marketing', 'marketing'),
];
