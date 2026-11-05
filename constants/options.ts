export type Choice = { key: string; label: string };

export const whyOptions: Choice[] = [
  { key: 'Sell', label: 'Prodajem' },
  { key: 'Find clients', label: 'Tražim klijente' },
  { key: 'Buy', label: 'Kupujem' },
  { key: 'Invest', label: 'Investiram' },
  { key: 'Raise', label: 'Skupljam novac' },
  { key: 'Hire', label: 'Zapošljavam' },
  { key: 'Find partners', label: 'Tražim partnere' },
  { key: 'Learn', label: 'Učim' },
];

export const roleOptions: Choice[] = [
  { key: 'Founder', label: 'Osnivač' },
  { key: 'Investor', label: 'Investitor' },
  { key: 'Sales', label: 'Prodaja' },
  { key: 'Product', label: 'Proizvod' },
  { key: 'Engineering', label: 'Razvoj' },
  { key: 'Marketing', label: 'Marketing' },
  { key: 'Student', label: 'Student' },
  { key: 'Other', label: 'Drugo' },
];

export const offerOptions: Choice[] = [
  { key: 'Software development', label: 'Razvoj softvera' },
  { key: 'Design', label: 'Dizajn' },
  { key: 'Funding', label: 'Investicije' },
  { key: 'Sales intros', label: 'Prodajni kontakti' },
  { key: 'Marketing', label: 'Marketing' },
  { key: 'Mentoring', label: 'Mentorstvo' },
];

export const needOptions: Choice[] = [
  { key: 'Clients', label: 'Klijenti' },
  { key: 'Funding', label: 'Investicije' },
  { key: 'Developers', label: 'Programeri' },
  { key: 'Partners', label: 'Partneri' },
  { key: 'Hiring', label: 'Zapošljavanje' },
  { key: 'Marketing', label: 'Marketing' },
];
