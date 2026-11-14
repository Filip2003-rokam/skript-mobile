import { isValidEmail, validateLogin, validateRegister } from './validation';

describe('isValidEmail', () => {
  it('prihvata običnu adresu i skida razmake', () => {
    expect(isValidEmail('ime@primer.com')).toBe(true);
    expect(isValidEmail('  ime@primer.com  ')).toBe(true);
  });

  it('odbija prazno, adresu bez znaka @ i adresu bez tačke', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('imeprimer.com')).toBe(false);
    expect(isValidEmail('ime@primer')).toBe(false);
    expect(isValidEmail('ime @primer.com')).toBe(false);
  });
});

describe('validateLogin', () => {
  it('traži ispravnu adresu i najmanje 8 znakova', () => {
    expect(validateLogin('ime@primer.com', 'lozinka1')).toEqual({});
  });

  it('vraća poruku za mejl i za kratku lozinku', () => {
    expect(validateLogin('nije-mejl', 'kratko')).toEqual({
      email: 'Unesi ispravnu imejl adresu.',
      password: 'Lozinka mora imati najmanje 8 znakova.',
    });
  });

  it('lozinka od tačno 8 znakova prolazi', () => {
    expect(validateLogin('ime@primer.com', '12345678').password).toBeUndefined();
  });
});

describe('validateRegister', () => {
  it('traži ime pored mejla i lozinke', () => {
    expect(validateRegister('   ', 'ime@primer.com', 'lozinka1')).toEqual({
      fullName: 'Unesi ime.',
    });
  });

  it('prazan objekat znači da forma može da se pošalje', () => {
    expect(validateRegister('Ana Anić', 'ime@primer.com', 'lozinka1')).toEqual({});
  });
});
