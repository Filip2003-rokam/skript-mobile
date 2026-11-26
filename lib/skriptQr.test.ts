import { readSkriptQr } from './skriptQr';

describe('readSkriptQr', () => {
  it('čita QR aplikacije', () => {
    expect(readSkriptQr('skript://event/pogon')).toEqual({ kind: 'event', slug: 'pogon' });
    expect(readSkriptQr('skript://swap/abc')).toEqual({ kind: 'swap', token: 'abc' });
  });

  it('veb QR eventa pamti adresu za browser', () => {
    expect(readSkriptQr('https://connectlog.app/e/pogon?x=1')).toEqual({ kind: 'event', slug: 'pogon', webUrl: 'https://connectlog.app/e/pogon' });
  });

  it('nepoznat kod nije event', () => {
    expect(readSkriptQr('https://example.com/nesto')).toEqual({ kind: 'unknown' });
    expect(readSkriptQr('obican tekst')).toEqual({ kind: 'unknown' });
  });
});
