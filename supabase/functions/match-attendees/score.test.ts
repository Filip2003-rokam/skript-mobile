import { fallbackOpeners, scoreCandidate, type MatchProfile } from './score';

function person(partial: Partial<MatchProfile> = {}): MatchProfile {
  return {
    name: 'Ana',
    role: null,
    company: null,
    why: [],
    offers: [],
    needs: [],
    inRoom: false,
    ...partial,
  };
}

describe('scoreCandidate', () => {
  it('vraća null kad se ponuda i potreba ne poklapaju', () => {
    expect(scoreCandidate(person({ offers: ['Design'] }), person({ needs: ['Funding'] }))).toBeNull();
  });

  it('boduje ponudu koja pokriva potrebu i dodaje poen ako je osoba u sali', () => {
    const me = person({ offers: ['Software development'] });
    const away = person({ needs: ['Developers'] });
    const here = person({ needs: ['Developers'], inRoom: true });

    expect(scoreCandidate(me, away)).toEqual({
      score: 7,
      matched_mine: 'Praviš softver',
      matched_theirs: 'Treba im razvojni tim',
    });
    expect(scoreCandidate(me, here)?.score).toBe(8);
  });

  it('zadržava prvi par iako se poklopi još jedna ponuda', () => {
    const score = scoreCandidate(
      person({ offers: ['Software development', 'Marketing'] }),
      person({ needs: ['Developers', 'Marketing'] }),
    );
    expect(score).toEqual({
      score: 10,
      matched_mine: 'Praviš softver',
      matched_theirs: 'Treba im razvojni tim',
    });
  });

  it('boduje moju potrebu prema onome što kandidat nudi', () => {
    expect(
      scoreCandidate(person({ needs: ['Developers'] }), person({ offers: ['Software development'] })),
    ).toEqual({
      score: 6,
      matched_mine: 'Tražiš programere',
      matched_theirs: 'Pravi softver',
    });
  });

  it('investitor vidi samo osnivača koji traži novac', () => {
    const investor = person({ role: 'Investor' });
    const founder = person({ why: ['Raise'], needs: ['Funding'], inRoom: true });

    expect(scoreCandidate(investor, founder)).toEqual({
      score: 9,
      matched_mine: 'Investiraš',
      matched_theirs: 'Skuplja seed rundu',
    });
    expect(scoreCandidate(investor, person({ why: ['Raise'] }))).toBeNull();
    expect(scoreCandidate(investor, person({ role: 'Investor', why: ['Raise'], needs: ['Funding'] }))).toBeNull();
  });

  it('ne spaja dve agencije', () => {
    const agency = person({ why: ['Sell'], offers: ['Software development'] });
    expect(scoreCandidate(agency, agency)).toBeNull();
  });

  it('osnivač koji skuplja novac dobija investitora kao par', () => {
    expect(scoreCandidate(person({ why: ['Raise'] }), person({ role: 'Investor' }))).toEqual({
      score: 8,
      matched_mine: 'Skupljaš novac',
      matched_theirs: 'Investira u seed',
    });
  });

  it('skor ne prelazi 10', () => {
    const me = person({
      why: ['Raise'],
      offers: ['Software development', 'Marketing', 'Sales intros'],
    });
    const candidate = person({
      role: 'Investor',
      inRoom: true,
      needs: ['Developers', 'Marketing', 'Clients'],
    });
    expect(scoreCandidate(me, candidate)?.score).toBe(10);
  });
});

describe('english', () => {
  const dev: MatchProfile = { name: 'Ana', role: 'Founder', company: 'Northwind', why: ['Sell'], offers: ['Software development'], needs: [], inRoom: false };
  const buyer: MatchProfile = { name: 'Marko Petrović', role: 'Product', company: 'Acme', why: ['Buy'], offers: [], needs: ['Developers'], inRoom: false };

  it('writes the match reason in English', () => {
    const score = scoreCandidate(dev, buyer, 'en');
    expect(score?.matched_mine).toBe('You build software');
    expect(score?.matched_theirs).toBe('They need a dev team');
  });

  it('writes both openers in English', () => {
    const [first, second] = fallbackOpeners(dev, buyer, 'They need a dev team', 'en');
    expect(first).toBe("Hi Marko, I'm with Northwind. I see you're at Acme. Mind if I ask how it's going?");
    expect(second).toContain('Skript matched us on "they need a dev team"');
  });
});
