# Ideja

## 1. Problem

Na konferenciji je stotine ljudi, a čovek za dva dana stvarno razgovara sa desetak. Većinu bira slučajno: ko je stajao pored kafe, ko je sedeo do njega. Ljudi zbog kojih je došao (investitor koji ulaže baš u njegovu oblast, firma kojoj treba ono što on radi) često odu kući a da se nisu ni sreli.

Drugi problem dolazi posle eventa. Vizit karte se izgube. Broj u telefonu ostane bez imena firme i bez reči o čemu se pričalo. Follow-up mejl se piše nedelju dana kasnije, kad se razgovor više ne pamti, ili se ne napiše uopšte.

Postojeće event aplikacije uglavnom imaju spisak učesnika i čet. Spisak od 500 imena ne kaže koga da upoznaš. Čet sa nepoznatom osobom je neprijatan, a poruka „Ćao, da se upoznamo?“ ostane bez odgovora.

## 2. Ideja

Skript radi tri stvari:

1. **Kaže koga vredi upoznati, i zašto.** Učesnik u četiri koraka kaže zašto je tu, šta nudi i šta mu treba. Pravila u kodu spoje ponudu sa potrebom: ko pravi softver sa onim kome treba razvojni tim, investitora sa osnivačem koji skuplja novac. Za svaki predlog stoji rečenica zašto i dve prve poruke, pa nije neprijatno javiti se.
2. **Deli kontakt tek kad obe strane pristanu.** „Zainteresovan“ druga strana ne vidi. Ako je i ona zainteresovana, veza nastaje sama. Ako nije, niko ne zna da je bilo odbijanja. Uživo je još brže: jedan pokaže QR, drugi skenira, i oba imaju kontakt.
3. **Ne da razgovoru da se izgubi.** Posle razgovora 30 sekundi glasovne beleške postaje beleška na kontaktu i nacrt follow-up mejla. Telefon podseti na follow-up. Mejl šalje korisnik iz svoje pošte, Skript ga ne šalje sam.

## 3. Ko koristi aplikaciju

- **Učesnik:** dolazi na event da nađe klijente, partnere, investitora ili posao. Ovo je glavni korisnik mobilne aplikacije.
- **Organizator:** pravi event i agendu. U ovom radu organizator nema ekran u aplikaciji: event i sesije se unose u bazu (seed skripta). U produkciji organizator radi na webu.

## 4. Zašto mobilna aplikacija

Isti proizvod već postoji kao web aplikacija (Skript na connectlog.app). Web je dobar za ulazak bez instalacije: gost skenira QR i odmah je unutra. Ali neke stvari web ne može ili radi loše, a na konferenciji su važne:

| Šta | Web | Mobilna |
| --- | --- | --- |
| Obaveštenje kad neko prihvati ili predloži sastanak | Samo dok je tab otvoren; na iPhone-u web push traži da se sajt doda na početni ekran | Push stiže i kad je aplikacija zatvorena |
| Podsetnik pred predavanje i sastanak | Nema pouzdanog načina | Lokalna notifikacija 10 minuta ranije, radi i bez mreže |
| Kalendar | Preuzimanje .ics fajla | Popunjena forma kalendara telefona, korisnik samo potvrdi; aplikacija ne čita njegov kalendar |
| Kontakt u imenik | vCard fajl | Forma za novi kontakt u imeniku telefona |
| Glasovna beleška | Prekida se kad se ekran zaključa | Snimanje nastavlja i sa zaključanim ekranom |
| Loša mreža u sali | Prazan ekran | Već učitana agenda, sastanci i kontakti ostaju |
| Skeniranje QR koda | Kamera kroz pregledač, sporije | Kamera u aplikaciji |

Mobilna aplikacija je zato rađena za ono što se dešava na samom eventu i odmah posle njega: upoznavanje, sastanci, beleške i follow-up.

## 5. Obim rada

**U radu:**
- nalog, prijava, dva jezika;
- ulazak na event, profil za event, agenda, Moj dan;
- predlozi, slepo interesovanje, razmena uživo, sastanci, zvonce;
- kontakti, glasovna beleška, nacrt follow-up mejla, podsetnici;
- ono što radi samo telefon (tabela iznad);
- RLS pravila u bazi i testovi koji ih proveravaju.

**Namerno van rada:**
- **Snimanje sesija i beleške sa predavanja.** To je glavni deo Skripta na webu, ali ga radi laptop u sali, ne telefon učesnika.
- **Organizatorski deo:** pravljenje eventa, agenda, statistika.
- **Plaćanje i ulaznice.** Skript radi pored event aplikacije koju organizator već ima.
- **Gemini ne bira ljude.** Skor je pravilo u kodu (`score.ts`), da se može pročitati i testirati. Gemini samo piše rečenicu i prve poruke za već izabrane parove.

## 6. Šta dalje

Kad se mobilna aplikacija bude spajala sa produkcijom:

1. **Jedna baza.** Mobilna aplikacija prelazi na produkcijski Supabase projekat. Na webu gosti mogu da uđu bez naloga, preko tokena sesije, pa mobilna treba isti put: ulazak bez naloga, a nalog tek kad korisnik želi da sačuva kontakte za sledeći event.
2. **Isti tokovi kao na webu.** Interesovanje, sastanci i kontakti na webu već rade preko SECURITY DEFINER funkcija. Mobilna bi zvala te iste funkcije, umesto sopstvenih tabela.
3. **Šta ostaje samo na telefonu:** push, podsetnici, kalendar, imenik, snimanje u pozadini i rad bez mreže. Zbog toga vredi imati aplikaciju pored weba.
4. **Standovi:** na webu je dodata kartica pečata za standove izlagača. Na telefonu bi tu pomogao push („Stand ti je odgovorio“), jer web nema pouzdan način da javi odgovor.
