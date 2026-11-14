import { fromDisplayDate } from './contactDates';

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
