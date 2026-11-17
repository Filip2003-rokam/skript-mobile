import { followUpAtNine, fromDisplayDate } from './contactDates';

describe('fromDisplayDate', () => {
  it('prevodi DD.MM.GGGG u ISO datum', () => {
    expect(fromDisplayDate('02.10.2026')).toBe('2026-10-02');
    expect(fromDisplayDate(' 29.02.2024 ')).toBe('2024-02-29');
  });

  it('odbija pogrešan oblik i dan koji ne postoji', () => {
    expect(fromDisplayDate('2026-10-02')).toBeNull();
    expect(fromDisplayDate('2.10.2026')).toBeNull();
    expect(fromDisplayDate('31.02.2026')).toBeNull();
    expect(fromDisplayDate('29.02.2025')).toBeNull();
    expect(fromDisplayDate('32.01.2026')).toBeNull();
    expect(fromDisplayDate('')).toBeNull();
  });
});

describe('followUpAtNine', () => {
  const morning = new Date(2026, 9, 2, 8, 30, 0);

  it('vraća 9:00 istog dana ako taj trenutak još nije prošao', () => {
    const at = followUpAtNine('2026-10-02', morning);
    expect(at).toEqual(new Date(2026, 9, 2, 9, 0, 0, 0));
    expect(followUpAtNine('2026-10-03', morning)).toEqual(new Date(2026, 9, 3, 9, 0, 0, 0));
  });

  it('ne zakazuje prošao dan ni današnji 9:00 koji je već prošao', () => {
    expect(followUpAtNine('2026-10-01', morning)).toBeNull();
    expect(followUpAtNine('2026-10-02', new Date(2026, 9, 2, 9, 0, 0))).toBeNull();
    expect(followUpAtNine('2026-10-02', new Date(2026, 9, 2, 9, 1, 0))).toBeNull();
    expect(followUpAtNine(null, morning)).toBeNull();
    expect(followUpAtNine('02.10.2026', morning)).toBeNull();
  });
});
