// Dvanaest izmišljenih osoba sa summita. Seed čita samo ova polja.

export const kinds = ['buyer', 'agency', 'investor', 'founder', 'operator'] as const;
export type Kind = (typeof kinds)[number];

export type DemoPerson = {
  id: string;
  name: string;
  role: string;
  company: string;
  kind: Kind;
  offersTags: string[];
  needsTags: string[];
  email: string;
  phone: string;
  inRoom: boolean;
};

export const testPeople: DemoPerson[] = [
  {
    id: 'ana',
    name: 'Ana Marić',
    role: 'Product',
    company: 'Northwind',
    kind: 'buyer',
    offersTags: [],
    needsTags: ['Developers'],
    email: 'ana@northwind.example',
    phone: '+389 70 214 551',
    inRoom: true,
  },
  {
    id: 'eva',
    name: 'Eva Krstić',
    role: 'Other',
    company: 'Daylight',
    kind: 'buyer',
    offersTags: [],
    needsTags: ['Developers', 'Partners'],
    email: 'eva@daylight.example',
    phone: '+381 64 330 120',
    inRoom: true,
  },
  {
    id: 'ivan',
    name: 'Ivan Petrov',
    role: 'Founder',
    company: 'Codeforge',
    kind: 'agency',
    offersTags: ['Software development'],
    needsTags: ['Clients'],
    email: 'ivan@codeforge.example',
    phone: '+389 78 220 619',
    inRoom: true,
  },
  {
    id: 'jonas',
    name: 'Jonas Weber',
    role: 'Investor',
    company: 'Brightline Ventures',
    kind: 'investor',
    offersTags: ['Funding', 'Mentoring'],
    needsTags: [],
    email: 'jonas@brightline.example',
    phone: '+49 151 220 1934',
    inRoom: true,
  },
  {
    id: 'lara',
    name: 'Lara Milić',
    role: 'Other',
    company: 'Fieldwork',
    kind: 'agency',
    offersTags: ['Design'],
    needsTags: ['Clients'],
    email: 'lara@fieldwork.example',
    phone: '+381 60 412 337',
    inRoom: false,
  },
  {
    id: 'luca',
    name: 'Luca Weiss',
    role: 'Founder',
    company: 'Roundtable',
    kind: 'founder',
    offersTags: ['Sales intros'],
    needsTags: ['Funding'],
    email: 'luca@roundtable.example',
    phone: '+41 79 330 2201',
    inRoom: true,
  },
  {
    id: 'marko',
    name: 'Marko Ilić',
    role: 'Other',
    company: 'Medika Group',
    kind: 'buyer',
    offersTags: [],
    needsTags: ['Developers'],
    email: 'marko@medika.example',
    phone: '+389 70 555 013',
    inRoom: true,
  },
  {
    id: 'mina',
    name: 'Mina Cole',
    role: 'Sales',
    company: 'Bridgekit',
    kind: 'buyer',
    offersTags: ['Sales intros'],
    needsTags: ['Developers'],
    email: 'mina@bridgekit.example',
    phone: '+389 71 902 448',
    inRoom: false,
  },
  {
    id: 'niko',
    name: 'Niko Varga',
    role: 'Founder',
    company: 'PilotLane',
    kind: 'founder',
    offersTags: ['Mentoring'],
    needsTags: ['Funding', 'Clients'],
    email: 'niko@pilotlane.example',
    phone: '+381 63 771 045',
    inRoom: false,
  },
  {
    id: 'petra',
    name: 'Petra Horvat',
    role: 'Investor',
    company: 'Adriatic Ventures',
    kind: 'investor',
    offersTags: ['Funding'],
    needsTags: [],
    email: 'petra@adriatic.example',
    phone: '+385 91 448 0021',
    inRoom: false,
  },
  {
    id: 'sofia',
    name: 'Sofia Reed',
    role: 'Marketing',
    company: 'Smallwave',
    kind: 'operator',
    offersTags: ['Marketing'],
    needsTags: ['Partners'],
    email: 'sofia@smallwave.example',
    phone: '+44 7700 900 412',
    inRoom: true,
  },
  {
    id: 'tom',
    name: 'Tom Becker',
    role: 'Founder',
    company: 'Loopwise',
    kind: 'founder',
    offersTags: ['Marketing'],
    needsTags: ['Funding', 'Developers'],
    email: 'tom@loopwise.example',
    phone: '+389 75 118 902',
    inRoom: true,
  },
];
