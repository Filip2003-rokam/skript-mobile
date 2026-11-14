import { upcomingSessions, type SessionRow } from './sessionService';

jest.mock('../supabase', () => ({ supabase: {} }));

function session(id: string, day: number, start: string): SessionRow {
  return { id, title: id, room: 'Main Stage', day, start_time: start, duration_min: 30, speakers: [] };
}

const list = [session('a', 1, '09:00'), session('b', 1, '10:00'), session('c', 1, '11:00'), session('d', 1, '12:00'), session('e', 2, '09:00')];

describe('upcomingSessions', () => {
  it('pre eventa vraća prva tri sa prvog dana', () => {
    const now = new Date(2026, 9, 1, 12, 0);
    expect(upcomingSessions('2026-10-02', 2, list, now).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('tokom eventa vraća samo ona koja danas tek počinju', () => {
    const now = new Date(2026, 9, 2, 10, 30);
    expect(upcomingSessions('2026-10-02', 2, list, now).map((item) => item.id)).toEqual(['c', 'd']);
  });

  it('posle eventa ne vraća ništa', () => {
    const now = new Date(2026, 9, 5, 10, 0);
    expect(upcomingSessions('2026-10-02', 2, list, now)).toEqual([]);
  });
});
