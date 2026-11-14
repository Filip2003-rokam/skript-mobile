# Arhitektura aplikacije Skript

Skript je mobilna aplikacija za umrežavanje na događaju. Korisnik uđe na event, vidi koga da upozna, pošalje zahtev i posle prihvatanja dobije kontakt. Telefon nikad ne drži tajne ključeve servera. U njemu su samo javna adresa Supabase projekta i anon ključ (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

Svaki poziv ka bazi ide na tu adresu. Uz njega idu zaglavlja `apikey` (anon ključ) i `Authorization: Bearer` (pristupni token prijavljenog korisnika). Postgres zatim primenjuje RLS: pravila koja kažu koji red sme da vidi baš taj korisnik.

## 1. Slojevi

```text
Ekrani (src/app/)
    → komponente (components/)
        → servisi (lib/services/)
            → Supabase: Auth, Postgres + RLS, Edge funkcije
                → Gemini i Expo Push
```

**Ekrani** (`src/app/`) su rute. Expo Router pravi ekran od putanje fajla. Ekran drži stanje forme, pokazuje učitavanje, grešku i prazan prikaz, i zove servis ili veću komponentu.

**Komponente** (`components/`) crtaju kartice, dugmad, liste i tabove. Veće celine, početna eventa, agenda, ljudi i profil, ovde sklapaju podatke. Zajednički izgled je u `components/ui/`. Boje i razmaci su u `constants/theme.ts`.

**Servisi** (`lib/services/`) su jedino mesto odakle ekran priča sa serverom. Funkcija vrati običan objekat ili baci grešku. Ekran ne sastavlja SQL.

**Supabase** ima tri dela:

- **Auth** pravi nalog, prijavu i sesiju. Sesija stoji na telefonu u AsyncStorage.
- **Postgres** čuva evente, profile, zahteve, kontakte i predloge. RLS je uključen na svim tabelama. Prijavljen korisnik vidi svoje kontakte, svoje predloge i zahteve u kojima učestvuje. Tuđi privatni mejl i telefon vidi tek kad baza, posle prihvatanja, upiše kontakt.
- **Edge funkcije** rade ono što telefon ne sme. `match-attendees` računa predloge i zove Gemini. `notify-connection` šalje push. Obe na serveru koriste service role ključ. Taj ključ nije u aplikaciji.

**Spoljni servisi:**

- **Gemini** piše rečenicu „zašto da se upoznate“ i dve prve poruke. Ključ `GEMINI_API_KEY` čita samo Edge funkcija. Ako Gemini ne odgovori, predlozi se ipak sačuvaju, sa lokalnim tekstom iz `score.ts`.
- **Expo Push** jeste urađen. Telefon traži dozvolu, dobije Expo token i upiše ga u `push_tokens`. Slanje ide sa servera, `POST https://exp.host/--/api/v2/push/send`. Funkcija `notify-connection` čeka webhook na tabelu `connections` i proverava zaglavlje `x-webhook-secret`. U migracijama tog webhook-a nema: uključuje se u Supabase projektu. Bez njega i bez `WEBHOOK_SECRET` obaveštenje ne ode, a ostatak aplikacije radi.

## 2. Ekrani

Ruta je putanja fajla. `(auth)` i `(tabs)` su grupe: zagrade se ne vide u adresi.

| Ekran | Šta prikazuje | React Native i Expo | Servisi |
| --- | --- | --- | --- |
| `src/app/_layout.tsx` | Dok se font i sesija ne učitaju, prazan ekran ili indikator. Ako font ili sesija padnu, tekst šta da se uradi. Zatim stek ekrana. | `View`, `Text`, `ActivityIndicator`. `expo-font` (`useFonts`), `expo-splash-screen`, `expo-router` (`Stack`). | `getSession`, `onAuthChange`, `registerForPush`, `listenForNotificationOpens` |
| `src/app/(auth)/_layout.tsx` | Stek prijave, bez svog sadržaja. | `expo-router` (`Stack`) | nijedan |
| `src/app/(auth)/login.tsx` | Mejl, lozinka, „Prijavi se“, link ka registraciji. | `Text`. `expo-router`. Polja i dugme su `TextField` i `Button`. | `signIn` |
| `src/app/(auth)/register.tsx` | Ime, mejl, lozinka, „Napravi nalog“. | `Text`. `expo-router`. | `signUp` |
| `src/app/(tabs)/_layout.tsx` | Donji tab: Početna, Agenda, Ljudi, Profil. | `expo-router` (`Tabs`). Izgled taba je `TabBar` (`Pressable`, `Text`, `View`). | nijedan |
| `src/app/(tabs)/index.tsx` | Ako nema izabranog eventa: lista „Moji eventi“ ili prazno stanje. Ako ima: početna tog eventa (`EventHome`). | `View`, `Text`. `expo-router`. Ikone: `@expo/vector-icons` (`Feather`). | Ekran zove `getMyEvents`. `EventHome` zove `getEventBySlug`, `countLiveSessions`, `countIncoming`, `getMyName`. |
| `src/app/(tabs)/agenda.tsx` | Prazno stanje ako event nije izabran. Inače listu sesija (`Agenda`). | `View`. `expo-router`. `Feather`. | `Agenda` zove `getEventBySlug` i `listSessions`. Dan, sat i „uživo“ računa na telefonu. |
| `src/app/(tabs)/people.tsx` | Prazno stanje ako event nije izabran. Inače tabove Predlozi, Sačuvani, Zahtevi, Povezani (`People`). | `View`. `expo-router`. `Feather`. | `usePeople` zove `getEventBySlug`, `getSuggestions`, `refreshSuggestions`, `getIncoming`, `getOutgoing`, `getConnected`, `sendRequest`, `respond`, `list`, `save`, `unsave`. |
| `src/app/(tabs)/profile.tsx` | Nalog, eventi, kontakti i odjava. Sav sadržaj je u `Profile`. | `expo-router` (čita parametar poruke). | `Profile` zove `getMyProfile`, `updateMyProfile`, `listMyEventStats`, `getEventBySlug`, `getMyEventProfile`, `signOut`. `ContactList` zove `listContacts`. |
| `src/app/scan.tsx` | Kamera, polje „Kod eventa“ i prozor za poruku kad se skenira tuđi bedž. | `View`, `Text`, `Modal`, `Pressable`, `ActivityIndicator`, `KeyboardAvoidingView`. `expo-camera` (`CameraView`), `expo-linking`, `expo-router`. | `getSession`, `getEventBySlug`, `getAttendeeName`, `sendRequest` |
| `src/app/event/[slug]/welcome.tsx` | Kartica eventa: naziv, mesto, broj sesija uživo, dugme „Uđi“. | `View`, `Text`, `Image`. `expo-router`. `Feather`. | `getEventBySlug`, `countLiveSessions`, `getMyAttendance` |
| `src/app/event/[slug]/profile.tsx` | Četiri koraka: zašto si tu, uloga i firma, šta nudiš, šta ti treba. | `View`, `Text`. `expo-router`. `Feather`. Čipovi su u `ProfileChat`. | `getEventBySlug`, `getMyEventProfile`, `saveMyEventProfile` |
| `src/app/event/[slug]/badge.tsx` | Bedž: ime, uloga, firma i QR koji drugi skeniraju. | `View`, `Text`, `Image`. `expo-router`. `Feather`. QR crta `react-native-qrcode-svg`. | `getSession`, `getEventBySlug`, `getMyProfile`, `getMyEventProfile` |
| `src/app/contact/new.tsx` | Forma novog kontakta. | `Text`. `expo-router`. Polja su u `ContactForm` (`TextInput`). | `getEventBySlug`, `createContact` |
| `src/app/contact/[id].tsx` | Jedan kontakt, izmena, brisanje, prekidač „Follow-up poslat“, poziv i mejl. | `View`, `Text`, `Modal`, `ScrollView`, `Switch`, `Pressable`, `Alert`, `Linking`, `KeyboardAvoidingView`. `expo-router`. `Feather`. | `getContact`, `updateContact`, `deleteContact` |

`EventHero` na početnoj i na ljudima koristi `expo-linear-gradient`. Kopiranje prve poruke na predlogu koristi `expo-clipboard`. To su komponente ispod ekrana, ne zasebne rute.

## 3. Servisi

Filteri u putanji su skraćeni. Pravi poziv doda `?select=...` i uslove, na primer `event_id=eq.{id}`. Upsert je `POST` sa zaglavljem `Prefer: resolution=merge-duplicates`.

### `authService.ts`

| Funkcija | Kuda ide |
| --- | --- |
| `signUp` | `POST /auth/v1/signup`. Triger `handle_new_user` zatim upiše `profiles` i `profile_private`. |
| `signIn` | `POST /auth/v1/token?grant_type=password` |
| `signOut` | Prvo `unregisterPush`, pa `POST /auth/v1/logout` |
| `getSession` | Čita sesiju sa telefona. Osvežavanje tokena, kad istekne, jeste `POST /auth/v1/token?grant_type=refresh_token`. |
| `onAuthChange` | Sluša lokalnu sesiju. Nema posebne putanje. |
| `authErrorMessage` | Prevede grešku u rečenicu na srpskom. Nema mreže. |

### `eventService.ts`

| Funkcija | Tabela i poziv |
| --- | --- |
| `getEventBySlug` | `GET /rest/v1/events` |
| `getMyEvents` | `GET /rest/v1/event_attendees`, ugnježdena tabela `events` |
| `getMyAttendance` | `GET /rest/v1/event_attendees` |
| `countLiveSessions` | `GET /rest/v1/events`, pa `GET /rest/v1/event_sessions`. Koje sesije su sada uživo računa telefon. |
| `eventPhase`, `formatStartDate`, `eventInitials`, `eventDateLabel`, `eventPlaceLine`, `eventStatusLine` | Samo račun na telefonu. |

### `sessionService.ts`

| Funkcija | Tabela i poziv |
| --- | --- |
| `listSessions` | `GET /rest/v1/event_sessions` |
| `sessionClock`, `sessionIsLive` | Račun na telefonu. |

### `attendeeService.ts`

| Funkcija | Tabela i poziv |
| --- | --- |
| `getMyEventProfile` | `GET /rest/v1/event_attendees` |
| `getAttendeeName` | `GET /rest/v1/event_attendees`, pa `GET /rest/v1/profiles` |
| `saveMyEventProfile` | `POST /rest/v1/event_attendees` (upsert po `event_id,user_id`) |

### `profileService.ts`

| Funkcija | Tabela i poziv |
| --- | --- |
| `getMyProfile` | `GET /rest/v1/profiles` i `GET /rest/v1/profile_private` |
| `updateMyProfile` | `PATCH /rest/v1/profiles` i `PATCH /rest/v1/profile_private` |
| `getMyName` | `GET /rest/v1/profiles` |
| `listMyEventStats` | Četiri čitanja: `GET /rest/v1/event_attendees`, `GET /rest/v1/contacts`, `GET /rest/v1/connections`, `GET /rest/v1/saved_people`. Zbir kontakata, veza i sačuvanih računa telefon. |

### `matchService.ts`

| Funkcija | Kuda ide |
| --- | --- |
| `getSuggestions` | `GET /rest/v1/match_suggestions`, pa `GET /rest/v1/profiles` i `GET /rest/v1/event_attendees` |
| `refreshSuggestions` | `POST /functions/v1/match-attendees` sa telom `{ event_id }`. Posle toga ponovo `getSuggestions`. |

Telefon predloge samo čita. Upis, brisanje starog spiska i dnevni limit radi Edge funkcija, service role ključem. Iz predloga izbacuje i ljude iz `interests` (zainteresovane i preskočene).

### `interestService.ts`

| Funkcija | Tabela i poziv |
| --- | --- |
| `expressInterest` | `POST /rest/v1/interests` sa `kind = interested` |
| `skipPerson` | `POST /rest/v1/interests` sa `kind = skipped` |
| `removeInterest` | `DELETE /rest/v1/interests` za povlačenje ili „Vrati“ |
| `listMine` | `GET /rest/v1/interests` samo svojih redova, pa profil i učesnik. Otvoreno je `interested` dok nema prihvaćene veze. |

Šesto otvoreno interesovanje ne proverava ekran. Triger `limit_open_interests` baci „Imaš već 5 otvorenih interesovanja. Povuci jedno pa pokušaj ponovo.“ Politika čitanja pušta samo redove gde je `user_id` prijavljeni korisnik, pa tuđi klik ostaje nevidljiv. Kad postoje oba klika, `match_mutual_interest` upiše prihvaćenu vezu. Kontakt i dalje pravi samo `handle_connection_accepted`.

### `connectionService.ts`

| Funkcija | Tabela i poziv |
| --- | --- |
| `sendRequest` | `POST /rest/v1/connections` za QR. Status mora biti `pending`. Dupli red (kod `23505`) postaje „Zahtev je već poslat.“ |
| `getIncoming` | `GET /rest/v1/connections` gde sam ja primalac |
| `getOutgoing` | `GET /rest/v1/connections` gde sam ja pošiljalac |
| `getConnected` | Dva `GET /rest/v1/connections` za status `accepted` |
| `respond` | `PATCH /rest/v1/connections` na `accepted` ili `declined`, samo ako sam primalac i status je još `pending` |
| `countIncoming` | `HEAD /rest/v1/connections` sa brojanjem, status `pending` i izvor `qr` |
| `loadBits` (interno) | `GET /rest/v1/profiles`, `GET /rest/v1/event_attendees`, `GET /rest/v1/contacts` |

Prihvaćen zahtev ne pravi kontakt iz telefona. Triger `handle_connection_accepted` u bazi upiše po jedan red u `contacts` za obe strane i prepiše mejl, telefon i LinkedIn iz `profile_private`.

### `savedService.ts`

| Funkcija | Tabela i poziv |
| --- | --- |
| `list` | `GET /rest/v1/saved_people`, pa `GET /rest/v1/profiles` i `GET /rest/v1/event_attendees` |
| `save` | `POST /rest/v1/saved_people` |
| `unsave` | `DELETE /rest/v1/saved_people` |

### `contactService.ts`

| Funkcija | Tabela i poziv |
| --- | --- |
| `listContacts` | `GET /rest/v1/contacts`, uz ime eventa iz `events` |
| `getContact` | `GET /rest/v1/contacts` |
| `createContact` | `POST /rest/v1/contacts` |
| `updateContact` | `PATCH /rest/v1/contacts` |
| `deleteContact` | `DELETE /rest/v1/contacts` |

RLS pušta samo redove gde je `owner_id` prijavljeni korisnik.

### `notificationService.ts`

| Funkcija | Kuda ide |
| --- | --- |
| `registerForPush` | Dozvola i Expo token preko `expo-notifications`. Upis: `POST /rest/v1/push_tokens` (upsert po tokenu). |
| `unregisterPush` | `DELETE /rest/v1/push_tokens` za token ovog telefona. |
| `listenForNotificationOpens` | Dodir otvori `data.url` u aplikaciji. Nema HTTP poziva. |

Telefon ne zove Expo Push API. To radi `notify-connection`.

## 4. Tri glavna scenarija

### Ulazak na event

1. Korisnik je prijavljen. Koreni raspored je već pozvao `getSession`.
2. Na „Skeniraj“ kamera pročita QR. `readSkriptQr` prepozna `skript://event/{slug}` ili link `/e/{slug}`. Običan QR dobije poruku da to nije Skript kod.
3. Ekran otvori `/event/{slug}/welcome`.
4. `getEventBySlug` uradi `GET /rest/v1/events`. Ako reda nema, piše da event ne postoji.
5. `countLiveSessions` pročita sesije i na telefonu prebroji one koje traju sada. Kartica pokaže naziv, mesto i taj broj.
6. Korisnik pritisne „Uđi“. Slug se sačuva na telefonu (`AsyncStorage`), da tabovi znaju koji je event otvoren.
7. `getMyAttendance` pita `event_attendees`. Ako reda nema, ide četiri koraka profila. `saveMyEventProfile` uradi upsert. Ako red već postoji, odmah ide početna.
8. Početna (`EventHome`) učita event, ime i broj dolaznih zahteva.

Isti ulaz radi i kad se kod ukuca u polje „Kod eventa“.

### AI predlozi

1. Na tabu Ljudi, Predlozi, korisnik pritisne „Napravi predloge“.
2. `refreshSuggestions` pošalje `POST /functions/v1/match-attendees` sa `event_id` i tokenom korisnika.
3. Funkcija proveri token. Odbije poziv ako korisnik nije učesnik, ako event nema uključeno uparivanje, ili ako je danas već bilo pet pokretanja (`match_runs`, zona Europe/Belgrade).
4. Učita ostale učesnike. Iz predloga izbaci ljude sa kojima veza već postoji, ljude koji su već u kontaktima i ljude koje je korisnik označio u `interests`.
5. `scoreCandidate` u `score.ts` da skor od 4 do 10, ili `null` ako nema poklapanja. Pravila su fiksna: ponuda prema potrebi, investitor prema osnivaču koji skuplja novac, dve agencije se ne spajaju. Gemini ovde ne bira ljude. Ostane najviše deset.
6. `writeCopy` pošalje `POST` na `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. Model je `GEMINI_MODEL` ili `gemini-3.6-flash`. Traži jednu rečenicu i dve kratke poruke, samo iz podataka koje je dobio.
7. Ako ključa nema, Gemini vrati grešku, istekne 20 sekundi ili JSON nije ispravan, funkcija zadrži lokalni tekst (`fallbackWhy`, `fallbackOpeners`). Predlozi se i dalje upišu.
8. Stari redovi tog korisnika u `match_suggestions` se obrišu i ubace novi. To radi service role, jer telefon sme samo `SELECT` nad tom tabelom.
9. Telefon ponovo uradi `getSuggestions` i nacrta kartice: skor, razlog, poruke, „Zainteresovan“, „Preskoči“ i čuvanje. Zainteresovane i preskočene sakrije i pre novog uparivanja.

### Povezivanje do kontakta

1. Sa predloga, `expressInterest` uradi `POST /rest/v1/interests`. Druga strana taj red ne može da pročita.
2. Ako i ona ima `interested` za ovog korisnika, `match_mutual_interest` upiše `connections` sa statusom `accepted` i izvorom `match`. Ako za par već postoji veza u bilo kom smeru, stari red ostaje i novi se ne pravi.
3. `handle_connection_accepted` radi i za takav `INSERT`. Upiše vreme odgovora i po jedan kontakt. Isti triger i dalje hvata QR izmenu iz `pending` u `accepted`. Klijent sam ne može da upiše `accepted`: politika `connections_insert` traži `pending`.
4. Na Zahtevima stoji „Na odgovor čeka N od 5 interesovanja.“ `removeInterest` briše svoj klik dok veza nije nastala. Šesti otvoreni klik odbija triger u bazi.
5. QR i dalje zove `sendRequest` sa izvorom `qr` i porukom. RLS pusti insert samo ako su oboje na eventu, pošiljalac je prijavljeni korisnik i status je `pending`.
6. Ako je webhook uključen, QR insert pokrene `notify-connection` i poruku „Novi zahtev za povezivanje“. Obostrani klik šalje oboma „Povezali ste se“.
7. Primalac QR zahteva bira Prihvati ili Ne sada. „Ne sada“ ne deli mejl. Prihvatanje pravi kontakte istim trigerom.
8. Oba telefona na tabu Povezani vide osobu. Mejl i telefon dolaze iz sopstvenog kontakta, ne iz tuđeg `profile_private`.
9. Kontakt ostaje u Profilu. Korisnik može da ga otvori, izmeni, označi follow-up ili obriše.

## 5. Pitanja komisije

1. **Zašto ekran ne zove Supabase direktno?**
   Da se isti poziv ne ponavlja u više ekrana i da se putanja ka bazi vidi na jednom mestu, u servisu.

2. **Šta je anon ključ i zašto sme da bude u aplikaciji?**
   To je javni ključ projekta. On samo otvara vrata do API-ja. Ko šta sme da čita određuje RLS i token prijavljenog korisnika.

3. **Gde je service role ključ?**
   Samo na serveru, u Edge funkcijama (`SUPABASE_SERVICE_ROLE_KEY`). Nije u telefonu, nije u `eas.json` i nije u git repou aplikacije.

4. **Šta je RLS?**
   Pravilo u Postgresu koje se primenjuje na svaki red. Na primer, `contacts_own` dozvoljava rad samo ako je `owner_id` jednak `auth.uid()`.

5. **Mogu li da pročitam tuđe kontakte?**
   Ne. Politika i grant puštaju samo sopstvene redove. Tuđi mejl iz `profile_private` telefon uopšte ne sme da čita.

6. **Kako onda posle prihvatanja vidim mejl?**
   Triger u bazi, koji radi kao `security definer`, prepiše mejl u moj red u `contacts`. Ja čitam svoj kontakt.

7. **Ko bira ljude za predlog, Gemini ili kod?**
   Kod. `scoreCandidate` da skor i odbaci par koji se ne poklapa. Gemini samo napiše rečenicu i dve poruke za već izabrane.

8. **Šta ako Gemini ne radi?**
   Funkcija ulovi grešku i upiše predloge sa spremnim tekstom, na primer „Praviš softver ↔ Treba im razvojni tim“. Korisnik i dalje dobije listu.

9. **Zašto je uparivanje Edge funkcija, a ne kod na telefonu?**
   Telefon ne sme da vidi sve privatne podatke niti da piše u `match_suggestions` i `match_runs`. Na serveru je i Gemini ključ i dnevni limit od pet pokretanja.

10. **Šta zaustavlja šesto pokretanje predloga?**
    Broj redova u `match_runs` od ponoći u Europe/Belgrade. Šesti poziv dobije HTTP 429 i poruku da proba sutra.

11. **Ko sme da prihvati zahtev?**
    Samo primalac, i samo dok je status `pending`. To proverava i servis i politika `connections_update`. Pošiljalac ne može sam sebi da promeni status.

12. **Šta ako kliknem „Zainteresovan“ šesti put?**
    Triger prebroji otvorena interesovanja, ona kod kojih veza još nije prihvaćena. Šesto dobije „Imaš već 5 otvorenih interesovanja. Povuci jedno pa pokušaj ponovo.“ QR zahtev koji se pošalje dvaput i dalje vrati `23505` i tekst „Zahtev je već poslat.“

13. **Zašto QR, a ne pretraga svih korisnika?**
    QR eventa otvara tačan događaj. QR bedža veže zahtev za osobu koja je na tom eventu. Pogrešan kod, sopstveni bedž i bedž sa drugog eventa imaju posebnu poruku i ne prave zahtev.

14. **Da li aplikacija radi bez interneta?**
    Već učitani podaci ostaju na ekranu. Novi poziv koji padne zbog mreže pokaže „Nema interneta. Proveri vezu i pokušaj ponovo.“ Posebna traka za mrežu nije ugrađena.

15. **Kako stiže notifikacija?**
    Telefon upiše Expo token u `push_tokens`. Webhook na `connections` pozove `notify-connection`, a ona `POST` na Expo Push. Telefon taj API ne zove. Webhook nije u SQL migracijama, pa mora biti uključen na projektu.

16. **Šta notifikacija otvara?**
    QR zahtev nosi `data.url` ka zahtevima tog eventa. Obostrano interesovanje nosi adresu ka Povezanima. `listenForNotificationOpens` na dodir uradi `router.push`. Radi i kad je aplikacija bila ugašena. Na emulatoru token često ne postoji, i aplikacija zbog toga ne pukne.

17. **Gde živi sesija?**
    U AsyncStorage, preko Supabase klijenta. `detectSessionInUrl` je isključen jer telefon nema adresu u pregledaču kao veb.

18. **Koje tabele telefon sme da menja?**
    Svoj profil, svoj `profile_private`, svoj red u `event_attendees`, svoje `saved_people`, svoje `contacts`, svoje `push_tokens`, svoje `interests` i `connections` u granicama politika. Prihvaćenu vezu telefon ne upisuje. `events` i `event_sessions` samo čita. `match_suggestions` samo čita. `match_runs` telefon ne dira.

19. **Šta je pokriveno automatskim testom?**
    Čiste funkcije: skor kandidata, provera mejla i lozinke, i datum forme. Mreža, kamera i RLS nisu u Jestu. Za njih je `docs/TEST-SCENARIJI.md`.

20. **Šta aplikacija namerno ne radi?**
    Ne naplaćuje ulaz, ne pravi event iz telefona i ne bira par pomoću Gemija. Skor je pravilo u kodu, da komisija može da ga pročita i da test padne ako se pravilo promeni.

## 6. Podizanje projekta od nule

Sve komande su iz foldera `skript-mobile`. Vrednosti tajni se ne pišu u repou.

1. **Migracije.** `npx supabase db push --remote` pošalje fajlove iz `supabase/migrations` na povezani projekat. Bez `--remote` CLI cilja lokalni Docker. `npx supabase migration list --remote` treba da pokaže iste brojeve u kolonama Local i Remote.
2. **Seed.** Kopiraj `scripts/.env.example` u `scripts/.env` i popuni ga na svom računaru. `npx tsx scripts/seed-test-users.ts` pravi dvanaest test naloga iz `scripts/test-people.ts`. `npx tsx scripts/seed-my-demo.ts` doda slepa interesovanja Marka, Toma i Sofije, vezu sa Jonasom, sačuvane ljude i ručne kontakte nalogu iz `MY_EMAIL`.
3. **Secrets.** U Edge Functions upiši imena `GEMINI_API_KEY`, `GEMINI_MODEL` i `WEBHOOK_SECRET`. Prva dva čita `match-attendees`, treće `notify-connection`.
4. **Funkcije.** `npx supabase functions deploy match-attendees` i `npx supabase functions deploy notify-connection --no-verify-jwt`. Druga nema proveru JWT-a jer je zove webhook, a tajnu nosi zaglavlje.
5. **Webhook.** U dashboardu, Database Webhooks: tabela `connections`, događaji Insert i Update, funkcija `notify-connection`, zaglavlje `x-webhook-secret` sa istom vrednošću kao `WEBHOOK_SECRET`. Webhook nije u SQL migracijama.
6. **EAS, preview build.** Profil `preview` u `eas.json` ima `"environment": "preview"`. Za to okruženje u EAS-u podesi `EXPO_PUBLIC_SUPABASE_URL` i `EXPO_PUBLIC_SUPABASE_ANON_KEY`, pa pokreni build tim profilom. Service role i Gemini ključ ne idu u EAS.
