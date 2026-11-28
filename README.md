# Skript, mobilna aplikacija

Skript pomaže ljudima na konferenciji da upoznaju prave ljude i da posle toga ne izgube kontakt. Učesnik uđe na event preko QR koda, popuni kratak profil (zašto je tu, šta nudi, šta mu treba) i dobija predloge koga da upozna. Kontakt se deli tek kad obe strane pristanu. Posle razgovora snimi glasovnu belešku od 30 sekundi, a Skript od nje napravi kontakt i nacrt follow-up mejla.

Ovo je diplomski rad. Aplikacija je napisana u React Native-u (Expo SDK 58), a server je Supabase: Postgres sa RLS pravilima, Auth i Edge funkcije. Ima svoj Supabase projekat, odvojen od produkcije Skripta na webu.

## Šta aplikacija radi

- **Ulazak na event:** QR kod eventa ili kod ukucan ručno. Pre prijave se vidi kartica eventa.
- **Profil za event:** četiri koraka kroz razgovor (zašto si tu, uloga i firma, šta nudiš, šta ti treba).
- **Predlozi koga da upoznaš:** pravila u kodu biraju ljude, a Gemini piše zašto da se upoznate i dve prve poruke.
- **Slepo interesovanje:** „Zainteresovan“ druga strana ne vidi. Kad su oboje zainteresovani, veza nastaje sama i kontakt ide obema stranama.
- **Razmena uživo:** jedan pokaže QR, drugi ga skenira i kontakt je odmah razmenjen. Kod važi 5 minuta i samo jednom.
- **Sastanci:** predlog vremena i mesta. Važi tek kad druga strana prihvati.
- **Agenda i Moj dan:** sva predavanja i, odvojeno, sačuvana predavanja i dogovoreni sastanci.
- **Zvonce:** zahtevi, nove veze i odgovori na sastanke na jednom mestu.
- **Glasovna beleška i follow-up:** snimak od 30 sekundi postaje beleška na kontaktu i nacrt mejla. Mejl se ne šalje sam.
- **Kontakti:** pretraga, izmena, podsetnik za follow-up, čuvanje u imenik telefona.
- **Dva jezika:** srpski i engleski, po jeziku telefona i prekidaču u profilu. Push obaveštenja stižu na jeziku primaoca.

Neke stvari radi samo telefon:
- podsetnik 10 minuta pred sačuvano predavanje i sastanak;
- dodavanje u kalendar telefona;
- čuvanje kontakta u imenik;
- snimanje beleške i kad se ekran zaključa;
- prikaz već učitanih podataka bez interneta.

Detalji su u [docs/IDEJA.md](docs/IDEJA.md).

## Dokumentacija

| Fajl | Šta je u njemu |
| --- | --- |
| [docs/IDEJA.md](docs/IDEJA.md) | Problem, ideja, ko koristi aplikaciju, zašto mobilna, šta nije u obimu rada |
| [docs/ARHITEKTURA.md](docs/ARHITEKTURA.md) | Slojevi, ekrani, servisi, baza i RLS, Edge funkcije, glavni tokovi, pitanja komisije, podizanje od nule |
| [docs/TEST-SCENARIJI.md](docs/TEST-SCENARIJI.md) | Ručni test scenariji za telefon |
| [docs/Demo-popis.md](docs/Demo-popis.md) | Popis web demoa po kome je urađen izgled |

## Pokretanje

Treba Node 20+ i telefon sa development build-om (Expo Go nema sve module koje aplikacija koristi: kalendar, imenik, snimanje u pozadini).

```bash
npm install
cp .env.example .env          # upiši EXPO_PUBLIC_SUPABASE_URL i EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start                # dev server
npx expo run:android          # ili run:ios, prvi put pravi development build
```

U `.env` idu samo javna adresa projekta i anon ključ. Service role ključ i Gemini ključ su samo na serveru, u Edge funkcijama.

Kako se podiže Supabase projekat od nule (migracije, seed, tajne, funkcije, webhook-ovi) piše u [docs/ARHITEKTURA.md](docs/ARHITEKTURA.md#7-podizanje-projekta-od-nule).

## Provere

```bash
npm test                      # Jest: čiste funkcije, prevodi, podsetnici, keš bez mreže, QR
npm run test:db               # Postgres u testu (PGlite) sa svim migracijama: RLS, trigeri, privatnost
npx tsc --noEmit              # TypeScript
npx expo lint                 # ESLint
```

`test:db` ne treba Docker ni pravi Supabase. Svaki test dobije praznu bazu sa svim migracijama iz `supabase/migrations` i radi kao pravi korisnik (uloga `authenticated` i `auth.uid()`), pa se proverava baš ono što vidi telefon.

## Struktura

```text
src/app/              ekrani (Expo Router, putanja fajla je ruta)
components/           veće celine (početna, agenda, ljudi, profil) i zajednički izgled (ui/)
lib/services/         jedino mesto odakle aplikacija priča sa serverom
lib/i18n/             srpski i engleski
constants/theme.ts    boje, slova, razmaci
supabase/migrations/  šema baze, RLS pravila, trigeri
supabase/functions/   match-attendees, notify-connection, voice-note
supabase/tests/       testovi baze (PGlite)
scripts/              seed test naloga i demo podataka
```

## Veza sa Skriptom na webu

Skript u produkciji je web aplikacija (connectlog.app) koju organizator koristi za snimanje sesija, beleške, pitanja publike i mreženje. Ova mobilna aplikacija je urađena za diplomski rad i pokriva mreženje i kontakte. Izgled prati Skript demo. Ima svoju bazu, pa se podaci ne mešaju sa produkcijom. Kako bi se mobilna aplikacija kasnije spojila sa produkcijom opisano je u [docs/IDEJA.md](docs/IDEJA.md#6-šta-dalje).
