-- Tri eventa i njihove sesije iz demoa. Poruke i citati se ne prenose.
-- Demo daje samo natpis datuma, pa starts_on prati taj dan u 2026.

insert into public.events (slug, name, city, dates_label, starts_on, days, rooms, color, cover_url, logo_url)
values
  (
    'startup-revolution-ai-summit',
    'Startup Revolution AI Summit',
    'Skopje',
    'Oct 2 to 3',
    '2026-10-02',
    2,
    array['Main Stage', 'Startup Stage'],
    '#4b2a8c',
    'https://demo.skript.events/__l5e/assets-v1/d528dae9-3805-431c-86f8-aaafd66ca61e/hall.webp',
    null
  ),
  (
    'founders-week-belgrade',
    'Founders Week Belgrade',
    'Belgrade',
    'Oct 8',
    '2026-10-08',
    1,
    array['Main Hall', 'Builder Studio', 'Founders Lounge'],
    '#1f7a55',
    'https://demo.skript.events/__l5e/assets-v1/d528dae9-3805-431c-86f8-aaafd66ca61e/hall.webp',
    'https://demo.skript.events/__l5e/assets-v1/b79b84d6-f852-4194-ab39-134843e18dab/fwb.svg'
  ),
  (
    'the5',
    'THE5',
    'Novi Sad',
    'Oct 15 · Demo date',
    '2026-10-15',
    1,
    array['Main Stage'],
    '#b94267',
    'https://demo.skript.events/__l5e/assets-v1/d528dae9-3805-431c-86f8-aaafd66ca61e/hall.webp',
    null
  );

insert into public.event_sessions (event_id, title, room, day, start_time, duration_min, speakers)
select e.id, s.title, s.room, s.day, s.start_time::time, 40, s.speakers
from public.events e
join (
  values
    ('startup-revolution-ai-summit', 'The First Money: How to Fund Your Startup Before You Raise Investment', 'Startup Stage', 1, '14:48', array['Rich Hayes', 'Adrien Hastert']::text[]),
    ('startup-revolution-ai-summit', 'How Investors Think: Building Scalable Companies', 'Main Stage', 1, '11:00', array['Tessa Vale (demo speaker)']::text[]),
    ('startup-revolution-ai-summit', 'Bootstrapping Your Startup', 'Startup Stage', 1, '17:30', array['Aleksa Lukić', 'Uroš Stanimirović']::text[]),
    ('startup-revolution-ai-summit', '350K Without Giving Up Equity', 'Startup Stage', 2, '15:45', array['Vincenzo Belpiede']::text[]),
    ('startup-revolution-ai-summit', 'The Brain Behind the Successful Founder', 'Main Stage', 2, '10:30', array['David Amor']::text[]),
    ('startup-revolution-ai-summit', 'Everyone Can Build Now. So Who Wins?', 'Main Stage', 1, '14:48', array['Nora Voss (demo panelist)', 'Felix Marin (demo panelist)', 'Tessa Vale (demo panelist)']::text[]),
    ('startup-revolution-ai-summit', 'From First Conversation to First Customer', 'Startup Stage', 2, '11:00', array['Felix Marin (demo speaker)']::text[]),
    ('startup-revolution-ai-summit', 'Trust by design in AI products', 'Startup Stage', 1, '11:00', array['Mira Novak']::text[]),
    ('startup-revolution-ai-summit', 'Opening: a practical year for AI', 'Main Stage', 1, '09:30', array['Leon Savić']::text[]),
    ('startup-revolution-ai-summit', 'Customer discovery lab', 'Startup Stage', 1, '09:30', array['Iris Beck']::text[]),
    ('startup-revolution-ai-summit', 'Pricing your first AI product', 'Main Stage', 1, '13:00', array['Theo Marković']::text[]),
    ('startup-revolution-ai-summit', 'Small teams, useful agents', 'Startup Stage', 1, '13:00', array['Ada West']::text[]),
    ('startup-revolution-ai-summit', 'Distribution without a big budget', 'Main Stage', 1, '17:30', array['Max Ristić']::text[]),
    ('startup-revolution-ai-summit', 'Data foundations for growing teams', 'Startup Stage', 2, '10:30', array['Elena Frost']::text[]),
    ('startup-revolution-ai-summit', 'Pilots that become partnerships', 'Main Stage', 2, '11:00', array['Owen Petrović']::text[]),
    ('startup-revolution-ai-summit', 'From summit ideas to Monday action', 'Main Stage', 2, '15:45', array['Mira Novak', 'Leon Savić']::text[]),
    ('founders-week-belgrade', 'Building from Belgrade', 'Main Hall', 1, '09:30', array['Lara Milić']::text[]),
    ('founders-week-belgrade', 'Prototypes worth testing', 'Builder Studio', 1, '09:30', array['Eli Hart']::text[]),
    ('founders-week-belgrade', 'Finding your first design partners', 'Founders Lounge', 1, '11:00', array['Niko Varga']::text[]),
    ('founders-week-belgrade', 'Sustainable growth for small teams', 'Main Hall', 1, '11:00', array['Sofia Reed']::text[]),
    ('founders-week-belgrade', 'Useful agents in daily operations', 'Builder Studio', 1, '14:30', array['Ada West']::text[]),
    ('founders-week-belgrade', 'The funding conversation', 'Founders Lounge', 1, '14:30', array['Theo Marković']::text[])
) as s(slug, title, room, day, start_time, speakers)
  on e.slug = s.slug;
