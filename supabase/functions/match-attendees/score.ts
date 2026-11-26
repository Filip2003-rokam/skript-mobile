// Pravila iz matchFor, bez Deno-a, da se skor može proveriti van Edge funkcije.
export type MatchProfile = {
  name: string;
  role: string | null;
  company: string | null;
  why: string[];
  offers: string[];
  needs: string[];
  inRoom: boolean;
};

export type MatchScore = {
  score: number;
  matched_mine: string;
  matched_theirs: string;
};

export type Lang = 'sr' | 'en';

// Ista pravila, dve rečenice: srpski (na „ti“) i engleski.
const mineText: Record<Lang, Record<string, string>> = {
  sr: {
    'Software development': 'Praviš softver',
    Design: 'Dizajniraš proizvode',
    Funding: 'Investiraš',
    'Sales intros': 'Praviš prodajne kontakte',
    Marketing: 'Radiš marketing',
    Mentoring: 'Mentoruješ osnivače',
    Clients: 'Tražiš klijente',
    Developers: 'Tražiš programere',
    Partners: 'Tražiš partnere',
    Hiring: 'Zapošljavaš',
    Raising: 'Skupljaš novac',
  },
  en: {
    'Software development': 'You build software',
    Design: 'You design products',
    Funding: 'You invest',
    'Sales intros': 'You make sales intros',
    Marketing: 'You do marketing',
    Mentoring: 'You mentor founders',
    Clients: 'You are looking for clients',
    Developers: 'You are looking for developers',
    Partners: 'You are looking for partners',
    Hiring: 'You are hiring',
    Raising: 'You are raising money',
  },
};

const theirsText: Record<Lang, Record<string, string>> = {
  sr: {
    'Software development': 'Treba im razvojni tim',
    Funding: 'Skuplja seed rundu',
    Clients: 'Traži klijente',
    Partners: 'Traži partnere',
    Developers: 'Traži programere',
    Marketing: 'Treba im marketing',
    Design: 'Treba im dizajn',
    Mentoring: 'Traži mentora',
  },
  en: {
    'Software development': 'They need a dev team',
    Funding: 'Raising a seed round',
    Clients: 'Looking for clients',
    Partners: 'Looking for partners',
    Developers: 'Looking for developers',
    Marketing: 'They need marketing',
    Design: 'They need design',
    Mentoring: 'Looking for a mentor',
  },
};

const offerText: Record<Lang, Record<string, string>> = {
  sr: { Funding: 'Investira u seed', 'Software development': 'Pravi softver', 'Pilot customer': 'Može biti prvi kupac' },
  en: { Funding: 'Invests in seed', 'Software development': 'Builds software', 'Pilot customer': 'Could be a first customer' },
};

const offerToNeed: Record<string, string> = {
  'Software development': 'Developers',
  Funding: 'Funding',
  Marketing: 'Marketing',
  'Sales intros': 'Clients',
};

function has(values: string[], value: string): boolean {
  return values.includes(value);
}

export function isInvestor(person: MatchProfile): boolean {
  return person.role === 'Investor' || has(person.why, 'Invest') || has(person.offers, 'Funding');
}

export function isRaising(person: MatchProfile): boolean {
  return has(person.why, 'Raise') || has(person.needs, 'Funding');
}

export function isBuyer(person: MatchProfile): boolean {
  return has(person.why, 'Buy') || has(person.needs, 'Developers');
}

export function isAgency(person: MatchProfile): boolean {
  const makes = has(person.offers, 'Software development') || has(person.offers, 'Design');
  const sells = has(person.why, 'Sell') || has(person.why, 'Find clients');
  return makes && sells;
}

function sells(person: MatchProfile): boolean {
  return has(person.why, 'Sell') || has(person.why, 'Find clients') || has(person.offers, 'Software development');
}

function offerPhrase(tag: string, lang: Lang): string {
  const fixed = offerText[lang][tag] ?? theirsText[lang][tag];
  if (fixed) return fixed;
  return lang === 'en' ? `Offers ${tag.toLowerCase()}` : `Nudi ${tag.toLowerCase()}`;
}

function clip(text: string): string {
  const value = text.trim();
  return value.length <= 200 ? value : `${value.slice(0, 199)}…`;
}

export function scoreCandidate(me: MatchProfile, candidate: MatchProfile, lang: Lang = 'sr'): MatchScore | null {
  const mine = mineText[lang];
  const theirs = theirsText[lang];
  if (isInvestor(me)) {
    const founder = isRaising(candidate) && has(candidate.needs, 'Funding') && !isInvestor(candidate);
    if (!founder) return null;
    const score = Math.min(10, 7 + (candidate.inRoom ? 1 : 0) + (has(candidate.why, 'Raise') ? 1 : 0));
    return { score, matched_mine: mine.Funding, matched_theirs: theirs.Funding };
  }

  if (sells(me) && isAgency(candidate)) return null;

  let raw = 0;
  let pair: { mine: string; theirs: string } | null = null;

  for (const offer of me.offers) {
    const need = offerToNeed[offer];
    if (!need || !has(candidate.needs, need)) continue;
    raw += 3;
    pair ??= { mine: mine[offer] ?? offer, theirs: theirs[offer] ?? theirs[need] ?? need };
  }

  for (const need of me.needs) {
    const offered = offeredForNeed(need, candidate);
    if (!offered) continue;
    raw += 2;
    pair ??= { mine: mine[need] ?? need, theirs: offerPhrase(offered, lang) };
  }

  if (isRaising(me) && isInvestor(candidate)) {
    raw += 4;
    pair = { mine: mine.Raising, theirs: offerPhrase('Funding', lang) };
  }

  if (raw === 0 || !pair) return null;
  return { score: Math.min(10, 4 + raw + (candidate.inRoom ? 1 : 0)), matched_mine: pair.mine, matched_theirs: pair.theirs };
}

function offeredForNeed(need: string, candidate: MatchProfile): string | null {
  if (need === 'Clients') return isBuyer(candidate) ? 'Pilot customer' : null;
  if (need === 'Developers') return has(candidate.offers, 'Software development') ? 'Software development' : null;
  if (need === 'Partners') return has(candidate.why, 'Find partners') ? 'Partners' : null;
  if (need === 'Funding') return has(candidate.offers, 'Funding') ? 'Funding' : null;
  if (need === 'Marketing') return has(candidate.offers, 'Marketing') ? 'Marketing' : null;
  return null;
}

export function fallbackWhy(score: MatchScore): string {
  return `${score.matched_mine} ↔ ${score.matched_theirs}`;
}

export function fallbackOpeners(me: MatchProfile, candidate: MatchProfile, matchedTheirs: string, lang: Lang = 'sr'): [string, string] {
  const company = me.company?.trim();
  const theirCompany = candidate.company?.trim();
  const phraseRaw = matchedTheirs ? matchedTheirs.charAt(0).toLowerCase() + matchedTheirs.slice(1) : '';
  if (lang === 'en') {
    const first = candidate.name.trim().split(/\s+/)[0] || 'there';
    const intro = company ? `I'm with ${company}` : "I'm here for the summit";
    const place = theirCompany ? ` I see you're at ${theirCompany}.` : '';
    const phrase = phraseRaw || 'this';
    return [
      clip(`Hi ${first}, ${intro}.${place} Mind if I ask how it's going?`),
      clip(`Hi ${first}, Skript matched us on "${phrase}". Do you have five minutes after this session?`),
    ];
  }
  const first = candidate.name.trim().split(/\s+/)[0] || 'ćao';
  const intro = company ? `ja sam iz firme ${company}` : 'ovde sam zbog samita';
  const place = theirCompany ? ` Vidim da si u ${theirCompany}.` : '';
  const phrase = phraseRaw || 'ovome';
  return [
    clip(`Zdravo ${first}, ${intro}.${place} Mogu li da pitam kako ide?`),
    clip(`Zdravo ${first}, Skript nas je spojio oko „${phrase}“. Imaš li pet minuta posle ove sesije?`),
  ];
}
