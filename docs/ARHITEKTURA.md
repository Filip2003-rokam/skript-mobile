# Arhitektura aplikacije Skript

Skript je mobilna aplikacija za umrežavanje na događaju. Korisnik uđe na event, vidi koga da upozna, pošalje interesovanje ili razmeni kontakt uživo, dogovori sastanak i posle razgovora snimi belešku. Telefon nikad ne drži tajne ključeve servera. U njemu su samo javna adresa Supabase projekta i anon ključ (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

Svaki poziv ka bazi ide na tu adresu. Uz njega idu zaglavlja `apikey` (anon ključ) i `Authorization: Bearer` (pristupni token prijavljenog korisnika). Postgres zatim primenjuje RLS: pravila koja kažu koji red sme da vidi baš taj korisnik.

## 1. Slojevi

```text
Ekrani (src/app/)
    → komponente (components/)
        → servisi (lib/services/)
            → Supabase: Auth, Postgres + RLS, Edge funkcije
                → Gemini i Expo Push
        → telefon: notifikacije, kalendar, imenik, kamera, mikrofon, AsyncStorage
```

**Ekrani** (`src/app/`) su rute. Expo Router pravi ekran od putanje fajla. Ekran drži stanje forme, pokazuje učitavanje, grešku i prazan prikaz, i zove servis ili veću komponentu.

**Komponente** (`components/`) crtaju kartice, dugmad, liste i tabove. Veće celine (početna eventa, agenda, ljudi, profil) ovde sklapaju podatke. Zajednički izgled je u `components/ui/`. Boje, slova i razmaci su u `constants/theme.ts`.

**Servisi** (`lib/services/`) su jedino mesto odakle aplikacija priča sa serverom i sa delovima telefona (kalendar, imenik, notifikacije). Funkcija vrati običan objekat ili baci grešku sa porukom za korisnika. Ekran ne sastavlja SQL.

**Supabase** ima tri dela:

- **Auth** pravi nalog, prijavu i sesiju. Sesija stoji na telefonu u AsyncStorage.
- **Postgres** čuva evente, profile, interesovanja, veze, sastanke, kontakte, predloge i obaveštenja. RLS je uključen na svim tabelama. Tuđi privatni mejl i telefon korisnik vidi tek kad baza, posle obostranog pristanka, upiše kontakt u njegov red.
- **Edge funkcije** rade ono što telefon ne sme: `match-attendees` računa predloge i zove Gemini, `voice-note` pretvara snimak u belešku i nacrt mejla, a `notify-connection` šalje push. Sve tri na serveru koriste service role ključ, koji nije u aplikaciji.

**Spoljni servisi:**

- **Gemini** piše rečenicu „zašto da se upoznate“ i dve prve poruke, prepisuje glasovnu belešku i piše nacrt follow-up mejla. Ključ `GEMINI_API_KEY` čita samo Edge funkcija. Ako Gemini ne odgovori, predlozi se ipak sačuvaju sa lokalnim tekstom iz `score.ts`.
- **Expo Push.** Telefon traži dozvolu, dobije Expo token i upiše ga u `push_tokens`. Slanje ide sa servera (`POST https://exp.host/--/api/v2/push/send`). `notify-connection` čeka webhook-ove na tabelama `connections` i `meetings` i proverava zaglavlje `x-webhook-secret`. Webhook-ovi nisu u SQL migracijama, pa se uključuju u Supabase projektu.

## 2. Navigacija i ekrani

Donja traka ima četiri taba i dugme u sredini, kao u Skript demou: **Početna, Agenda, mikrofon, Ljudi, Ja**. Mikrofon otvara nov kontakt sa glasovnom beleškom. Ruta je putanja fajla, a `(auth)` i `(tabs)` su grupe čije se zagrade ne vide u adresi.

| Ekran | Šta prikazuje | Servisi |
| --- | --- | --- |
| `_layout.tsx` | Čeka font i sesiju, pa otvara stek. Prijavljenom korisniku registruje push, prati dodir na obaveštenje i čuva jezik aplikacije na nalogu. | `getSession`, `registerForPush`, `listenForNotificationOpens`, `saveMyLanguage` |
| `+native-intent.tsx` | Prevodi spoljni link (`skript://…`, `https://…/e/slug`) u rutu aplikacije. | `getSession` |
| `(auth)/login`, `(auth)/register` | Prijava i nov nalog. | `signIn`, `signUp` |
| `(tabs)/index` | Bez eventa: „Moji eventi“ ili prazno stanje. Sa eventom: početna (`EventHome`) sa zvoncetom, sledećim predavanjem, predlozima i statusom. | `getMyEvents`, `getEventBySlug`; `loadHome` čita predloge, interesovanja, veze, kontakte i sesije; zvonce `listInbox`, `markInboxRead` |
| `(tabs)/agenda` | Agenda po danima i salama, i Moj dan: sačuvana predavanja i sastanci po vremenu, sa dugmetom za kalendar. | `listSessions`, `listSavedSessionIds`, `setSessionSaved`, `listMeetings`, `syncAgendaReminders`, `addToCalendar` |
| `(tabs)/people` | Predlozi, Zahtevi, Povezani. Na povezanoj osobi predlog sastanka. | `getSuggestions`, `refreshSuggestions`, `expressInterest`, `skipPerson`, `removeInterest`, `listMine`, `getIncoming`, `getOutgoing`, `getConnected`, `respond`, `proposeMeeting`, `answerMeeting` |
| `(tabs)/profile` | Nalog, jezik, eventi, kontakti, podsetnici, odjava. | `getMyProfile`, `updateMyProfile`, `saveMyLanguage`, `listMyEventStats`, `listContacts`, `signOut` |
| `scan` | Kamera i polje „Kod eventa“. Prepozna kod eventa, kod osobe i obične linkove. | `readSkriptQr` |
| `swap` | Razmena uživo: moj QR (važi 5 minuta) i „Skeniraj njihov“. Posle razmene ponuda za glasovnu belešku. | `issueSwapToken`, `revokeSwapToken`, `swapContact`, `getContact`, `updateContact` |
| `event/[slug]/welcome` | Kartica eventa (radi i pre prijave), dugme „Uđi“. | `getEventBySlug`, `getMyAttendance`, `getSession` |
| `event/[slug]/profile` | Četiri koraka profila za event. | `getMyEventProfile`, `saveMyEventProfile` |
| `contact/new` | Nov kontakt, ručno ili glasovnom beleškom. | `createContact`, `transcribeVoiceNote` |
| `contact/[id]` | Kontakt: izmena, brisanje, follow-up, nacrt mejla, čuvanje u imenik. | `getContact`, `updateContact`, `deleteContact`, `draftFollowUp`, `saveToPhoneContacts` (servis kontakata sam zakaže ili otkaže podsetnik za follow-up) |

## 3. Servisi

Filteri u putanji su skraćeni. Pravi poziv doda `?select=...` i uslove, na primer `event_id=eq.{id}`.

| Servis | Funkcije | Kuda ide |
| --- | --- | --- |
| `authService` | `signUp`, `signIn`, `signOut`, `getSession`, `onAuthChange`, `authErrorMessage` | `/auth/v1/…`. Posle registracije triger `handle_new_user` upiše `profiles` i `profile_private`. Odjava prvo briše push token. |
| `eventService` | `getEventBySlug`, `getMyEvents`, `getMyAttendance`, `countLiveSessions` i račun datuma | `events`, `event_attendees`, `event_sessions` |
| `sessionService` | `listSessions`, `upcomingSessions`, `sessionIsLive` i račun vremena | `event_sessions` |
| `mySessionsService` | `listSavedSessionIds`, `setSessionSaved` | `saved_sessions` (samo svoji redovi) |
| `attendeeService` | `getMyEventProfile`, `saveMyEventProfile` | `event_attendees` (upsert po `event_id,user_id`) |
| `profileService` | `getMyProfile`, `updateMyProfile`, `saveMyLanguage`, `listMyEventStats` | `profiles`, `profile_private`; statistika čita `event_attendees`, `contacts`, `connections`, `saved_people` |
| `matchService` | `getSuggestions`, `refreshSuggestions` | čita `match_suggestions`; osvežavanje je `POST /functions/v1/match-attendees` |
| `interestService` | `expressInterest`, `skipPerson`, `removeInterest`, `listMine` | `interests` (samo svoji redovi) |
| `connectionService` | `getIncoming`, `getOutgoing`, `getConnected`, `respond`, `countIncoming`, `countAcceptedToday` | `connections`; odgovor menja samo status, samo primalac |
| `swapService` | `issueSwapToken`, `revokeSwapToken`, `swapContact`, `swapQr` | `swap_tokens`; razmena je RPC `swap_contact` |
| `meetingService` | `listMeetings`, `proposeMeeting`, `answerMeeting` i prikaz vremena | `meetings`; triger `guard_meeting` čuva pravila |
| `inboxService` | `listInbox`, `markInboxRead`, `inboxText`, `inboxTarget` | `notifications`; telefon sme da menja samo `read_at` |
| `savedService` | `list`, `save`, `unsave` | `saved_people` |
| `contactService` | `listContacts`, `getContact`, `createContact`, `updateContact`, `deleteContact` | `contacts` (samo `owner_id = auth.uid()`) |
| `voiceNoteService` | `transcribeVoiceNote`, `draftFollowUp` | `POST /functions/v1/voice-note` |
| `notificationService` | `registerForPush`, `unregisterPush`, `listenForNotificationOpens` | `push_tokens`; dodir na obaveštenje otvara `data.url` |
| `reminderService` | `syncFollowUp`, `cancelFollowUp`, `remindersEnabled`, `setRemindersEnabled` | samo telefon: lokalna notifikacija za follow-up u 9:00 |
| `agendaReminderService` | `syncAgendaReminders`, `clearAgendaReminders` | samo telefon: podsetnik 10 minuta pred sačuvano predavanje i dogovoren sastanak, najviše 20 po vrsti |
| `deviceService` | `addToCalendar`, `saveToPhoneContacts` | samo telefon: sistemska forma kalendara i imenika |

Keš bez mreže (`lib/offlineCache.ts`) obmotava čitanja agende, sastanaka i kontakata. Kad poziv uspe, rezultat se sačuva u AsyncStorage. Kad padne zbog mreže, ekran dobije poslednji sačuvan rezultat, a agenda i kontakti pokažu napomenu da su podaci od ranije.

## 4. Baza

Šema je u `supabase/migrations/` (001 do 009), redom kojim je nastajala.

| Tabela | Ko vidi | Ko menja |
| --- | --- | --- |
| `profiles` | ja i ljudi sa mog eventa (`shares_event`) | samo ja |
| `profile_private` (mejl, telefon, LinkedIn) | samo ja | samo ja |
| `events`, `event_sessions` | svi, i pre prijave | niko sa telefona |
| `event_attendees` | ljudi sa istog eventa | samo svoj red |
| `interests` | samo moji klikovi | upis i brisanje svojih; šesti otvoreni odbija triger |
| `connections` | samo veze u kojima učestvujem | primalac menja samo status; `accepted` iz telefona ne može da se upiše |
| `swap_tokens` | samo svoji | vlasnika i rok od 5 minuta postavlja baza |
| `meetings` | predlagač i pozvani | predlog i odgovor po pravilima trigera `guard_meeting` |
| `saved_sessions`, `saved_people`, `contacts`, `push_tokens` | samo svoji | samo svoji |
| `notifications` | samo svoja | samo `read_at`; upisuju ih trigeri |
| `match_suggestions` | samo svoji predlozi | niko sa telefona; upisuje `match-attendees` |
| `match_runs`, `voice_note_runs` | niko sa telefona | niko sa telefona; brojači za dnevne limite |

Trigeri koji nose pravila:

- `handle_connection_accepted`: kad veza postane prihvaćena, upiše po jedan kontakt za obe strane i prepiše mejl, telefon i LinkedIn iz `profile_private`. Klijent nikad ne čita tuđi `profile_private`.
- `match_mutual_interest`: kad postoje oba „Zainteresovan“, upiše prihvaćenu vezu.
- `limit_open_interests`: najviše 5 otvorenih interesovanja po eventu.
- `guard_meeting`: predlagač može samo da otkaže, pozvani samo da prihvati ili odbije, a vreme i mesto se pri odgovoru ne menjaju.
- `notify_connection_change`, `notify_meeting_change`: upisuju obaveštenja za zvonce.

## 5. Ono što radi samo telefon

| Mogućnost | Kako | Gde |
| --- | --- | --- |
| Push obaveštenja | Expo token u `push_tokens`, slanje sa servera, tekst na jeziku primaoca (`profiles.language`) | `notificationService`, `notify-connection` |
| Podsetnik za follow-up | lokalna notifikacija u 9:00 na dan follow-up-a | `reminderService` |
| Podsetnik pred predavanje i sastanak | lokalna notifikacija 10 minuta ranije, i bez mreže | `agendaReminderService`, `lib/reminders.ts` |
| Kalendar | iOS: forma sa dozvolom „samo dodavanje“; Android: aplikacija kalendara. Aplikacija ne čita kalendar. | `deviceService.addToCalendar` |
| Imenik | sistemska forma za nov kontakt, popunjena iz Skripta | `deviceService.saveToPhoneContacts` |
| Snimanje u pozadini | `expo-audio` sa `allowsBackgroundRecording`, plugin u `app.json` | `components/voice/VoiceNote.tsx` |
| Rad bez mreže | poslednji uspešan odgovor iz AsyncStorage | `lib/offlineCache.ts` |
| Kamera | `expo-camera`: kod eventa, kod osobe, web link eventa | `scan.tsx`, `swap.tsx`, `lib/skriptQr.ts` |

## 6. Glavni tokovi

### Ulazak na event

1. Na „Skeniraj“ kamera pročita QR. `readSkriptQr` prepozna `skript://event/{slug}` ili link `/e/{slug}`. Kod osobe dobije poruku da se on skenira u Razmeni kontakt. Običan QR dobije poruku da to nije Skript kod.
2. Otvara se `/event/{slug}/welcome`. Kartica se vidi i pre prijave, jer `events` i `event_sessions` smeju da čitaju i neprijavljeni (migracija 008).
3. Na „Uđi“ se slug čuva na telefonu, da tabovi znaju koji je event otvoren. Ako profil za event ne postoji, idu četiri koraka, inače početna.

### Predlozi i slepo interesovanje

1. „Napravi predloge“ zove `match-attendees`. Funkcija proveri da je korisnik na eventu i da danas nije bilo pet pokretanja (`match_runs`, zona Europe/Belgrade).
2. Iz kandidata izbaci postojeće veze, kontakte i ljude iz `interests`. `scoreCandidate` u `score.ts` da skor od 4 do 10 ili odbaci par. Ostane najviše deset.
3. Gemini napiše razlog i dve poruke. Ako ne odgovori za 20 sekundi, ostaje lokalni tekst.
4. „Zainteresovan“ upiše red u `interests`, koji druga strana ne može da pročita. Kad su oboje zainteresovani, `match_mutual_interest` upiše vezu, a `handle_connection_accepted` kontakte za oboje.

### Razmena uživo

1. Na ekranu Razmeni kontakt telefon upiše nasumičan kod u `swap_tokens`. Baza postavi vlasnika i rok od 5 minuta, šta god telefon poslao. Kod se osvežava pre isteka.
2. Druga osoba skenira kod. `swap_contact` proveri: kod postoji, nije iskorišćen ni istekao, nije moj, oboje smo na istom eventu, i ranije nije bilo odbijanja. Tek onda upiše prihvaćenu vezu, a triger kontakte. Kod se označi kao iskorišćen.
3. Posle razmene aplikacija nudi glasovnu belešku za taj kontakt.

### Sastanak i Moj dan

1. Na povezanoj osobi „Predloži sastanak“: dan, vreme, mesto do 60 znakova.
2. Pozvani dobija obaveštenje u zvoncetu i push. Prihvati ili odbije. Predlagač može samo da otkaže.
3. Prihvaćen sastanak ulazi u Moj dan pored sačuvanih predavanja. `syncAgendaReminders` zakaže podsetnik 10 minuta ranije.

### Glasovna beleška i follow-up

1. Mikrofon na traci, ili ponuda posle razmene, snima najviše 30 sekundi. Snimanje radi i kad se ekran zaključa.
2. `voice-note` prepiše snimak i vrati belešku sa temom razgovora. Dnevni limit je 20 obrada (`voice_note_runs`).
3. „Napiši follow-up“ napravi nacrt mejla iz beleške, kraći ili formalniji po želji. „Otvori u mejlu“ otvara poštu korisnika. Skript ništa ne šalje sam.

## 7. Podizanje projekta od nule

Sve komande su iz foldera `skript-mobile`. Vrednosti tajni se ne pišu u repo.

1. **Migracije.** `npx supabase db push --remote` pošalje fajlove iz `supabase/migrations` na povezani projekat. `npx supabase migration list --remote` treba da pokaže iste brojeve u kolonama Local i Remote.
2. **Seed.** Kopiraj `scripts/.env.example` u `scripts/.env` i popuni ga. `npx tsx scripts/seed-test-users.ts` pravi dvanaest test naloga. `npx tsx scripts/seed-my-demo.ts` doda demo interesovanja, vezu, sačuvane ljude i kontakte nalogu iz `MY_EMAIL`.
3. **Tajne funkcija.** `GEMINI_API_KEY`, `GEMINI_MODEL` (čitaju `match-attendees` i `voice-note`) i `WEBHOOK_SECRET` (čita `notify-connection`).
4. **Funkcije.**
   ```bash
   npx supabase functions deploy match-attendees
   npx supabase functions deploy voice-note
   npx supabase functions deploy notify-connection --no-verify-jwt
   ```
   Treća nema proveru JWT-a jer je zove webhook, a tajnu nosi zaglavlje.
5. **Webhook-ovi.** U Database Webhooks dva webhook-a ka `notify-connection`, oba sa zaglavljem `x-webhook-secret`: tabela `connections` (Insert, Update) i tabela `meetings` (Insert, Update).
6. **EAS build.** Profil `preview` u `eas.json` ima `"environment": "preview"`. Za to okruženje u EAS-u podesi `EXPO_PUBLIC_SUPABASE_URL` i `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Service role i Gemini ključ ne idu u EAS.

## 8. Testovi

| Komanda | Šta proverava |
| --- | --- |
| `npm test` | Jest, 42 testa: skor kandidata, provera mejla i lozinke, prevodi (isti ključevi u oba jezika), podsetnici, keš bez mreže, čitanje QR koda, datumi, predstojeća predavanja |
| `npm run test:db` | 32 testa nad pravim Postgres-om (PGlite) sa svim migracijama: sastanci i privatnost |
| `npx tsc --noEmit` | tipovi |

Testovi baze ne mokuju pravila. `supabase/tests/db.ts` napravi bazu, primeni sve migracije i doda delove Supabase-a koje migracije očekuju (`auth.users`, `auth.uid()`, uloge `anon` i `authenticated`). `db.as(korisnik, …)` radi kao prijavljen korisnik, isto kao telefon. `privacy.test.ts` proverava:

- profil i prijavu vide samo ljudi sa istog eventa;
- mejl i telefon vidi samo vlasnik, a kontakt nastaje tek posle prihvatanja;
- zahtev ne može sam da se prihvati ni da se prepravi;
- slepo interesovanje i limit od 5;
- kod za razmenu (vlasnik i rok sa servera, jednokratan, ne sa drugog eventa);
- pre prijave se vide samo event i agenda;
- push tokene i predloge vidi samo vlasnik.

Da testovi stvarno hvataju grešku proverava se tako što se privremeno otvori jedna politika: odmah padnu.

Ručni scenariji za telefon su u `docs/TEST-SCENARIJI.md`.

## 9. Pitanja komisije

1. **Zašto ekran ne zove Supabase direktno?**
   Da se isti poziv ne ponavlja u više ekrana i da se putanja ka bazi vidi na jednom mestu, u servisu.

2. **Šta je anon ključ i zašto sme da bude u aplikaciji?**
   To je javni ključ projekta. On samo otvara vrata do API-ja. Ko šta sme da čita određuju RLS i token prijavljenog korisnika.

3. **Gde je service role ključ?**
   Samo na serveru, u Edge funkcijama. Nije u telefonu, nije u `eas.json` i nije u repou.

4. **Šta je RLS?**
   Pravilo u Postgresu koje se primenjuje na svaki red. Na primer, `contacts_own` dozvoljava rad samo ako je `owner_id` jednak `auth.uid()`.

5. **Kako znate da RLS stvarno radi?**
   `npm run test:db` pokreće pravi Postgres sa svim migracijama i radi kao različiti korisnici. Test proverava da Dejan sa drugog eventa ne vidi nikoga sa ovog, da Ceca ne vidi tuđe zahteve, da neprijavljen posetilac dobija „permission denied“. Kad se pravilo namerno olabavi, testovi padnu.

6. **Kako posle prihvatanja vidim tuđi mejl?**
   Triger u bazi, koji radi kao `security definer`, prepiše mejl u moj red u `contacts`. Ja čitam svoj kontakt, nikad tuđi `profile_private`.

7. **Ko bira ljude za predlog, Gemini ili kod?**
   Kod. `scoreCandidate` da skor i odbaci par koji se ne poklapa. Gemini samo napiše rečenicu i dve poruke za već izabrane.

8. **Šta ako Gemini ne radi?**
   Predlozi se upišu sa spremnim tekstom, na primer „Praviš softver ↔ Treba im razvojni tim“. Korisnik i dalje dobije listu.

9. **Zašto je „Zainteresovan“ slep?**
   Da odbijanje ne bude neprijatno. Druga strana vidi tvoj klik samo ako je i ona kliknula, i tada je to već veza.

10. **Može li neko da prihvati vezu umesto druge osobe?**
    Ne. Politika pušta insert samo sa statusom `pending`, a promenu statusa samo primaocu. Prihvaćena veza nastaje samo iz trigera (obostrano interesovanje) ili funkcije `swap_contact` (razmena uživo).

11. **Šta sprečava zloupotrebu koda za razmenu?**
    Rok i vlasnika postavlja baza, ne telefon. Kod važi 5 minuta i samo jednom, samo za osobu sa istog eventa, i ne deli kontakt ako je ranije bilo odbijanja.

12. **Zašto mobilna aplikacija, kad Skript postoji na webu?**
    Push kad je aplikacija zatvorena, podsetnik pred sastanak bez mreže, kalendar, imenik i snimanje sa zaključanim ekranom. To web ne radi ili radi loše. Detaljno u `docs/IDEJA.md`.

13. **Kako stiže obaveštenje?**
    Telefon upiše Expo token. Webhook na `connections` ili `meetings` pozove `notify-connection`, a ona Expo Push. Tekst je na jeziku primaoca. Isto obaveštenje triger upiše i u `notifications`, za zvonce.

14. **Šta notifikacija otvara?**
    Obaveštenje nosi `data.url`: zahteve, povezane, Moj dan ili kontakt. `listenForNotificationOpens` na dodir otvori tu rutu, i kad je aplikacija bila ugašena.

15. **Da li aplikacija radi bez interneta?**
    Agenda, sastanci i kontakti se prikazuju iz poslednjeg uspešnog učitavanja, uz napomenu da su podaci stari. Podsetnici su lokalni i stižu i bez mreže. Radnja koja traži server javi da nema interneta i ne briše listu.

16. **Zašto dva jezika i kako?**
    Konferencije u regionu imaju i strane goste. Jezik se uzima sa telefona (srpski i za hrvatski, bosanski i crnogorski), može se promeniti u profilu i čuva se na nalogu, da push stiže na istom jeziku. Test proverava da oba jezika imaju iste ključeve.

17. **Koje tabele telefon sme da menja?**
    Svoj profil i privatne podatke, svoju prijavu na event, svoja interesovanja, kodove, sačuvane ljude i predavanja, kontakte i push tokene. Veze samo kao primalac i samo status. Sastanke po pravilima trigera. Obaveštenja samo kao pročitana. `events`, `event_sessions` i `match_suggestions` samo čita.

18. **Šta aplikacija namerno ne radi?**
    Ne snima predavanja, ne pravi event sa telefona, ne naplaćuje ulaz, ne šalje mejlove sama i ne bira par pomoću Geminija.
