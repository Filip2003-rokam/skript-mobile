import { eventMoment, meetingCalendarDraft, meetingReminders, reminderLeadMinutes, sessionCalendarDraft, sessionReminders } from './reminders';

const session = (id: string, day: number, start: string, room: string | null = 'Sala 1') => ({ id, title: `Sesija ${id}`, room, day, start_time: start, duration_min: 45 });

describe('eventMoment', () => {
  it('računa dan eventa i sat po lokalnom vremenu', () => {
    const at = eventMoment('2026-12-01', 2, '11:30');
    expect(at?.getFullYear()).toBe(2026);
    expect(at?.getMonth()).toBe(11);
    expect(at?.getDate()).toBe(2);
    expect(at?.getHours()).toBe(11);
    expect(at?.getMinutes()).toBe(30);
  });

  it('prelazi u sledeći mesec i vraća null bez datuma ili sata', () => {
    expect(eventMoment('2026-11-30', 2, '09:00')?.getDate()).toBe(1);
    expect(eventMoment(null, 1, '09:00')).toBeNull();
    expect(eventMoment('2026-12-01', 1, null)).toBeNull();
  });
});

describe('sessionReminders', () => {
  const now = new Date(2026, 11, 1, 10, 0);

  it('samo sačuvane sesije koje tek dolaze, 10 minuta ranije', () => {
    const list = sessionReminders({
      slug: 'pogon',
      startsOn: '2026-12-01',
      sessions: [session('a', 1, '09:00'), session('b', 1, '11:00'), session('c', 1, '12:00')],
      savedIds: new Set(['a', 'b']),
      now,
    });
    expect(list.map((item) => item.key)).toEqual(['session:b']);
    expect(list[0].at.getHours()).toBe(10);
    expect(list[0].at.getMinutes()).toBe(60 - reminderLeadMinutes);
    expect(list[0].body).toBe('Sesija b, Sala 1');
    expect(list[0].url).toBe('/agenda?view=myDay&slug=pogon');
  });

  it('preskače sesiju čiji je podsetnik već prošao', () => {
    const list = sessionReminders({ slug: 'pogon', startsOn: '2026-12-01', sessions: [session('a', 1, '10:05')], savedIds: new Set(['a']), now });
    expect(list).toEqual([]);
  });
});

describe('meetingReminders', () => {
  const now = new Date(2026, 11, 1, 10, 0);
  const meeting = (id: string, status: string, time = '14:00') => ({ id, otherName: 'Ana', day: 1, time, place: 'Hol', status });

  it('samo prihvaćeni sastanci', () => {
    const list = meetingReminders({ slug: 'pogon', startsOn: '2026-12-01', meetings: [meeting('m1', 'accepted'), meeting('m2', 'pending')], now });
    expect(list.map((item) => item.key)).toEqual(['meeting:m1']);
    expect(list[0].body).toBe('Ana, Hol');
  });
});

describe('kalendar', () => {
  const event = { name: 'Pogon', starts_on: '2026-12-01' };

  it('sesija traje koliko piše u agendi', () => {
    const draft = sessionCalendarDraft(event, { ...session('a', 1, '09:00'), speakers: ['Ana', 'Bora'] });
    expect(draft?.title).toBe('Sesija a');
    expect((draft!.end.getTime() - draft!.start.getTime()) / 60000).toBe(45);
    expect(draft?.location).toBe('Sala 1, Pogon');
    expect(draft?.notes).toBe('Ana, Bora');
  });

  it('sastanak ide u kalendar tek kad je prihvaćen', () => {
    const pending = { id: 'm', otherName: 'Ana', day: 1, time: '14:00', place: 'Hol', status: 'pending' };
    expect(meetingCalendarDraft(event, pending)).toBeNull();
    const draft = meetingCalendarDraft(event, { ...pending, status: 'accepted' });
    expect(draft?.title).toBe('Sastanak: Ana');
    expect(draft?.location).toBe('Hol, Pogon');
  });
});
