# Popis Skript demoa

Izvor: repo `Filip2003-rokam/skript-conference-companion`, commit `e462166`, pročitan 5. 11. 2026. U repou ništa nije menjano. Demo je na demo.skript.events.

## Najvažnije

- **Demo je samo frontend.** Nema baze, naloga ni pravog AI-ja. To je i zapisano u `AGENTS.md` kao zahtev. Ljudi, sesije, beleške i kontakti su izmišljeni podaci iz `src/mock`, a odgovori u chatu su unapred napisani u `src/lib/chatEngine.ts`.
- **Tehnologija:** React 19, TanStack Start i Router, Tailwind 4, shadcn i Radix, framer-motion, lucide-react. Ništa od toga ne radi direktno u React Native-u. Prenose se izgled, tekst i pravila, a ne kod komponenti.
- **Centar demoa je chat Ask.** Zajedno ima oko 95 KB koda (`HomeChat.tsx` 55 KB, `chatEngine.ts` 38 KB) i tridesetak vrsta kartica u odgovorima. Taj deo je najveći i najteži za prenos.
- **Mreženje je mali i čist deo:** `lib/networking.ts` (60 linija), `PeopleScreen.tsx` i `network-cards.tsx`. To je skoro tačno ono što radi diplomski.

## Navigacija na telefonu

- **Donja traka (puni režim):** Ask (žuta pilula), Agenda, okrugli mikrofon u sredini, People, Me.
- **Add-on režim:** Ask, Agenda, Notes, Questions.
- **Vrh ekrana:** fotografija sale koja se gubi u pozadini, pilula sa imenom eventa i pilula „by Skript“, okruglo dugme za pretragu, pa veliki naslov ekrana. Posle skrola ostaje uska traka sa imenom eventa i naslovom.
- **Pozadina:** svetla `#F6F6F4` sa tri mutne mrlje u boji eventa, žutoj i sivoplavoj.

## Ekrani

| Ruta | Ekran | Šta prikazuje | Vrsta |
|---|---|---|---|
| `/` | Setup | Znak Skript, „Opening Startup Revolution AI Summit“, „Powered by Prodigi“. Posle 1,2 s otvara event. | osnova |
| `/e/:slug` | Ulaz | Učitavanje od 1 s (logo, naziv, spinner). Zatim dobrodošlica: fotografija, kartica sa logom, nazivom, „Skopje · Oct 2 to 3“ i statusom „Day 1 · 2 sessions on now“, dugme Enter, red „Every session recorded · Your notes after each talk“ i „No app, no account.“ Na kraju „What's your name?“ sa poljem, Continue i Skip. | osnova |
| `/e/:slug` | Ask | „Good morning.“, čipovi stanja („Recording all sessions · 2 with notes ready“, poziv na sastanak), predlozi pitanja, „Show me around“, polje „Ask about any session, speaker or your notes“ i mikrofon. | uglavnom sesije, deo mreženje |
| `/e/:slug/agenda` | Agenda | Prekidač Agenda / My day, čipovi Day 1 i Day 2, čipovi sala, „Happening now“, sesije po satima. My day ima kalendar, Google Calendar i zahteve za sastanke. | sesije |
| `/e/:slug/s/:id` | Sesija | Pitanja publike, ocena, beleške, chat o sesiji. | sesije |
| `/e/:slug/people` | People | Prekidač Saved / Requests / Connected, kartice predloga i zahteva. Prazno: „No one saved yet.“ i dugme „Find more people“, koje otvara Ask sa „Who should I meet here?“. | mreženje |
| `/e/:slug/contacts` | Contacts | Pretraga, čip „Follow up due“, izvoz u CSV i vCard, kontakti grupisani po eventu. Otvoren kontakt: Draft follow-up, Reminder, Book a meeting, Continue in Ask. | mreženje |
| `/me` | Me | Avatar, ime, email, Edit profile (ime, email, fotografija), simulirana prijava i odjava, bedž sa QR kodom, „My events“ (tri eventa sa brojem kontakata, beleški i sesija), svi kontakti, „Networking profile“ sa „Update in Ask“. | mreženje |
| `/e/:slug/notes`, `/questions` | Beleške, pitanja | Sačuvane beleške i pitanja za govornike (add-on režim). | sesije |
| `/e/:slug/recap` | Recap | Pregled posle eventa. | sesije |
| `/style` | Dizajn sistem | Sve boje i komponente na jednoj stranici. Korisno za poređenje. | osnova |

Preko ekrana se otvaraju: „Set up the demo“ (scenariji, sat, režim, tema, moduli), simulirana prijava mejlom, panel obaveštenja (zvono), tura „Show me around“ od 11 koraka i donji paneli (BottomSheet).

## Mreženje, tačno kako radi

### Profil kroz razgovor u četiri koraka

1. „Quick setup so I can find the right people. What brings you here? Pick all that fit.“ Čipovi: Sell, Find clients, Buy, Invest, Raise, Hire, Find partners, Learn. Dugme Continue.
2. „What do you do?“ Founder, Investor, Sales, Product, Engineering, Marketing, Student, Other.
3. „Your company?“ Polje, pa Continue ili Skip.
4. „What do you offer, and where do you need help?“
   - I offer: Software development, Design, Funding, Sales intros, Marketing, Mentoring.
   - I need help with: Clients, Funding, Developers, Partners, Hiring, Marketing.
   - Dugmad Done i „Say it“ (glas je simuliran).

Posle četvrtog koraka odmah se prikazuje lista predloga.

### Pravila skora (`matchFor` u `lib/networking.ts`)

- **Investitor** (uloga Investor, izabrano Invest ili nudi Funding) vidi samo osnivače kojima treba novac. Skor je 7, plus 1 ako je osoba u sali i plus 1 ako upravo skuplja rundu.
- **Ko prodaje** (Sell ili Find clients, ili nudi Software development) ne vidi agencije.
- Ostali sabiraju poene:
  - +3 za svaku moju ponudu koja nekome treba,
  - +2 za svaku moju potrebu koju neko nudi (Clients znači da je osoba kupac),
  - +4 ako ja skupljam novac, a osoba je investitor.
- **Skor:** 4 + zbir + 1 ako je osoba u sali, najviše 10. Bez ijednog poklapanja osoba se ne predlaže.
- **„Matched on“** je par fraza, npr. „You build software ↔ Needs a product team“.
- Redosled je po skoru, pa po imenu. Marko je izuzet, jer on šalje demo zahtev.

### Kartica predloga

- Avatar, ime, uloga · firma i žut bedž skora „8/10“.
- **WHY MEET:** jedna rečenica.
- **MATCHED ON:** žut čip ↔ beo čip.
- Dugmad:
  - Connect: otvara polje „Add a short note“ i dugme Send request, a posle toga piše „Request sent“.
  - Save / Saved.
  - „How do I start?“: dve prve poruke, svaka sa Copy.
  - „Suggest a time“.
  - „Add a note about our chat“.
- Lista prvo prikaže tri predloga, pa dugme „Show N more“.

### Kartica zahteva

- „Marko wants to connect“, uloga · firma, „THEY WROTE“ i poruka.
- Dugmad: Accept, Not now, Suggest a time.
- Posle Accept: email, telefon i dugme „Save to contacts“.
- Posle Not now: „You can still find Marko in People.“

### Stanje mreženja

`saved[]`, `sent{id: poruka}`, `connected[]` i `incoming[{id, note, status}]`. Status može biti pending, accepted ili dismissed. Na početku stiže jedan demo zahtev, od Marka Ilića iz Medika Group.

## Podaci (`src/mock`)

- **3 eventa:** Startup Revolution AI Summit (Skopje, Oct 2 to 3, sale Main Stage i Startup Stage, stvaran event), Founders Week Belgrade i THE5 (izmišljeni). Boje eventa: `#4b2a8c`, `#1f7a55`, `#b94267`.
- **16 sesija** za Summit, sa naslovom, salom, danom i vremenom. Na primer „Opening: a practical year for AI“ (Main Stage, dan 1, 09:30) i „Customer discovery lab“ (Startup Stage, dan 1, 09:30). Poruke i citati su izmišljeni i tako su označeni.
- **12 osoba za mreženje** (`network.ts`): vrsta (buyer, agency, investor, founder, operator), šta nude, šta traže, oblast, rečenica „why“, email, telefon i da li su u sali. Svi su izmišljeni.
- **Lični podaci:** 4 kontakta, sačuvane sesije, beleške, govornici i brojke za recap.
- **Sat demoa:** Before event, Day 1 11:20, Day 1 14:55, Day 2 16:00, After event.
- **Scenariji:** New attendee (no account), Returning attendee with account, Add-on attendee, Start over.

## Izgled

### Tokeni (`src/theme/theme.css`)

| Šta | Vrednost |
|---|---|
| Pozadina | `#F6F6F4` |
| Tekst | `#111114`, sporedni `#55555F`, treći `#9A9AA5` |
| Kartica | `#FFFFFF`, ivica `rgba(17,17,20,0.08)` |
| Tanka linija | `rgba(17,17,20,0.07)`, blaga podloga `rgba(17,17,20,0.04)` |
| Skript žuta | `#FFE14D`, svetla `#FFF5BF`, tekst na žutoj `#111114` |
| Uživo | `#E5484D`, greška `#D64545` |
| Avatar | pozadina `#EEEEF0` |
| Staklo | `rgba(255,255,255,0.8)`, jače `rgba(255,255,255,0.92)` |
| Fontovi | Plus Jakarta Sans (400, 500, 600, 700) za tekst, Fredoka 600 za znak i velike naslove |
| Veličine slova | 11, 13, 15, 17, 22, 30, a naslovi imaju razmak slova -0.02em |
| Zaobljenja | kartica 22, donji panel 28, pilula 999, logo eventa 10 |
| Razmaci | ivica ekrana 20, razmak između elemenata 12 |
| Senka kartice | `0 1px 3px rgba(17,17,20,0.06)` |
| Tamna tema | postoji (pozadina `#0E111D`, kartica `#1C1C21`) |

### Komponente (`src/components/skript/primitives.tsx` i `overlays.tsx`)

- **Button:**
  - primary: crna pilula, beo tekst,
  - secondary: staklena pilula,
  - ghost: bez pozadine,
  - signal: žuta pilula,
  - icon: okruglo dugme,
  - microphone: crn krug sa žutom ikonom.
  - Visine: 36, 48 i 56.
- **Chip:** default (staklo), selected (žut), signal (svetlo žut), event (boja eventa). Visina 32, mali 24.
- **GlassCard:** staklo, belo (surface), istaknuto sa žutim okvirom, ili na dodir.
- **Segmented:** prekidač sa žutom aktivnom opcijom.
- **Ostalo:** Avatar sa inicijalima, EmptyState (ikona, tekst, dugme), BottomSheet, BottomNav sa MicOrb, EventHero, EventLogo (beli kvadrat 72 px sa inicijalima, zaobljen 10), SkriptSignature („by Skript“).
- **Pokret:** pritisak smanji dugme na 0,97, a mrlje u pozadini se lagano pomeraju.

### Ikone

Demo koristi lucide-react: MessageCircle, CalendarDays, Users, UserRound, NotebookPen, Search, UserPlus, Bookmark, BookmarkCheck, Sparkles, CalendarPlus, Send, Check, Copy, Mail, Phone, BellRing, Download, Camera, Pencil, LogOut, Mic.

U Expo-u iste ili skoro iste ikone ima Feather iz `@expo/vector-icons`: message-circle, calendar, users, user, search, user-plus, bookmark, send, check, copy, mail, phone, bell, download, camera, edit-2, log-out, mic.

### Slike

U repou su samo pokazivači na Lovable, a same slike preuzimaš sa ovih adresa:

- Logo Skript: `https://demo.skript.events/__l5e/assets-v1/f3cb07fa-892e-4602-981f-677abf5e2221/skript-logo.jpeg`
- Fotografija sale: `https://demo.skript.events/__l5e/assets-v1/d528dae9-3805-431c-86f8-aaafd66ca61e/hall.webp`
- Prodigi znak: `https://demo.skript.events/__l5e/assets-v1/22d88f62-2821-4648-bcad-4adee5173069/prodigi.png`
- Founders Week znak: `https://demo.skript.events/__l5e/assets-v1/b79b84d6-f852-4194-ab39-134843e18dab/fwb.svg`

Logo je JPEG, pa ga za ikonicu aplikacije izvezi kao PNG. Znak „Skrıpt“ u aplikaciji je tekst u fontu Fredoka.

## Predlog šta ide u diplomski

**Prenosimo jedan na jedan, ali nad pravom bazom:**

- izgled: tokeni, komponente, vrh ekrana, donja traka
- ulaz na event: učitavanje, dobrodošlica, ime i Skip, posle skeniranja QR koda
- profil u četiri koraka, sa istim čipovima
- pravila skora iz `networking.ts`, koja prenosimo u Edge funkciju. Gemini piše „Why meet“ i dve prve poruke.
- People: Saved, Requests, Connected, kartica predloga i kartica zahteva
- Me: profil, moji eventi, kontakti. Lični QR izgleda kao bedž iz demoa.
- Contacts: pretraga, beleška i podsetnik za follow-up

**Uprošćeno:** Ask postaje početni ekran sa pozdravom i predlozima kao dugmadima („Koga da upoznam?“, „Moji zahtevi“, „Moji kontakti“, „Izmeni profil“), bez slobodnog chata.

**Kasnije ili nikad:** sesije, beleške, pitanja publike, ocene, recap, sastanci i kalendar, glas, tura, „Set up the demo“, desktop raspored i add-on režim.

**Šta se menja u bazi u odnosu na plan:**

- profil za event dobija `why[]`, `role`, `company`, `offers[]` i `needs[]` umesto `looking_for` i `offering`
- veze dobijaju i stanje „sačuvano“
- vrsta osobe (investitor, kupac, agencija) računa se iz profila, a ne upisuje ručno

## Šta još da slikaš na telefonu

Kod već pokriva tekst i pravila, pa slike služe samo da Cursor vidi izgled. Dovoljno je ovih deset:

1. dobrodošlica
2. ime
3. Ask na početku
4. četiri koraka profila
5. lista predloga sa otvorenim „How do I start?“
6. People, sva tri taba
7. Markov zahtev pre i posle Accept
8. Me
9. Contacts sa otvorenim kontaktom
10. bedž

Nalog ne treba. Za stanje sa nalogom otvori „Set up the demo“ i izaberi „Returning attendee with account“.
