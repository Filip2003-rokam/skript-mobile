# Ručni test scenariji

Radi se na telefonu, sa dva naloga kad scenario traži drugu osobu. Oba naloga su na istom eventu i imaju dopunjene profile (šta nude i šta im treba). Za razmenu uživo drugi nalog može biti pregledač: u Metro terminalu pritisni `w`, prijavi se i otvori Razmeni kontakt. Poslednja kolona ostaje prazna dok se test ne odradi.

## 1. Registracija

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Otvori aplikaciju dok nisi prijavljen. 2. Pritisni „Napravi nalog“. 3. Unesi ime, novi mejl i lozinku od najmanje 8 znakova. 4. Pritisni „Napravi nalog“. | Aplikacija otvori početnu, ili napiše „Nalog je napravljen. Prijavi se.“ Posle prijave istim podacima vidi se početna sa „Nema eventa na nalogu. Skeniraj QR kod da uđeš.“ | |

## 2. Pogrešna lozinka

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Na prijavi unesi postojeći mejl i pogrešnu lozinku od najmanje 8 znakova. 2. Pritisni „Prijavi se“. | Ostaješ na prijavi. Piše „Pogrešna lozinka. Proveri mejl i lozinku pa pokušaj ponovo.“ | |

## 3. Pogrešan QR

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Prijavi se. 2. Otvori „Skeniraj“. 3. Dozvoli kameru. 4. Skeniraj QR koji nije Skript kod (na primer običan link). | Kamera ostaje otvorena. Piše „Ovo nije Skript QR kod. Skeniraj kod eventa.“ | |

## 4. Ulazak na event

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Skeniraj QR eventa ili u polje „Kod eventa“ unesi tačan kod i pritisni „Uđi“. 2. Na kartici eventa pritisni „Uđi“. | Vidi se naziv eventa. Ako profil za taj event još nije popunjen, otvori se četiri koraka. Ako jeste, otvori se početna tog eventa. | |

## 5. Predlozi kad Gemini ne radi

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Na serveru privremeno skloni ili pokvari `GEMINI_API_KEY`. 2. Na telefonu otvori Ljudi, tab Predlozi. 3. Pritisni „Napravi predloge“. 4. Vrati ključ na server. | Lista se ipak pojavi. Razlog je lokalni tekst, na primer „Praviš softver ↔ Treba im razvojni tim“, a ne „Predlozi trenutno nisu dostupni“. | |

## 6. Interesovanje

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Na predlogu pritisni „Zainteresovan“. 2. Otvori tab Zahtevi. 3. Drugim nalogom otvori Zahteve istog eventa. | Osoba nestane iz predloga. Piše „Na odgovor čeka 1 od 5 interesovanja.“ i dugme „Povuci“. Drugi nalog taj klik ne vidi. | |

## 7. Obostrani klik

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Drugi nalog na predlogu prvog pritisne „Zainteresovan“. 2. Oba otvore Povezane i Profil, kontakte. | Oba vide osobu pod Povezani. U kontaktima su mejl ili telefon. Nema kartice zahteva sa porukom. | |

## 8. Preskok, povlačenje i šesto interesovanje

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Na predlogu pritisni „Preskoči“. 2. Pritisni „Vrati“. 3. Na Zahtevima pritisni „Povuci“. 4. Ostavi pet otvorenih i klikni šesto. | Preskočena osoba nestane, pa se vrati. Povučena nestane sa Zahteva. Šesti klik napiše „Imaš već 5 otvorenih interesovanja. Povuci jedno pa pokušaj ponovo.“ | |

## 9. Razmena uživo

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Oba naloga su na istom eventu. Jedan otvori Razmeni kontakt (na telefonu ili u pregledaču) i ostavi QR na ekranu. 2. Drugi nalog na istom ekranu pritisne „Skeniraj njihov“ i skenira taj kod. 3. Isti kod, posle osvežavanja ili kad se ekran zatvori, skeniraj sa fotografije. 4. Na „Skeniraj QR“ skeniraj kod osobe. | Posle uspešnog skena piše „Kontakt je sačuvan“ i nudi se glasovna beleška ili „Kasnije“. Oba naloga vide jedan drugog u kontaktima. Mejl se ne šalje sam. Stari kod ne prolazi. Na običnom skeneru piše „Ovo je kod osobe. Otvori Razmeni kontakt na eventu.“ | |

## 10. Nov kontakt

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Otvori Profil. 2. Pored pretrage pritisni plus. 3. Unesi ime i pritisni „Sačuvaj“. | Vraća se profil sa porukom „Sačuvano“. Kontakt je u listi, u grupi trenutnog eventa ili „Bez eventa“. | |

## 11. Izmena kontakta

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Otvori kontakt iz liste. 2. Pritisni „Izmeni“. 3. Promeni firmu i pritisni „Sačuvaj“. | Piše „Izmenjeno“. Na kartici se vidi nova firma. | |

## 12. Brisanje kontakta

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Na otvorenom kontaktu pritisni „Obriši“. 2. U dijalogu pritisni „Obriši“. | Vraća se profil sa porukom „Obrisano“. Kontakta nema u listi. | |

## 13. Follow-up označen kao poslat

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Napravi kontakt sa follow-up datumom u obliku DD.MM.GGGG. 2. Otvori ga. 3. Uključi „Follow-up poslat“. | Piše „Izmenjeno“. Prekidač ostaje uključen. U listi piše „Follow-up poslat“. | |

## 14. Notifikacija

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Na fizičkom telefonu prihvati dozvolu za obaveštenja i ostavi aplikaciju u pozadini. 2. Oba naloga na predlogu jedan drugog pritisnu „Zainteresovan“. 3. Dodirni obaveštenje. | Stigne „Povezali ste se“ i otvori Povezane. Razmena uživo to obaveštenje ne šalje. Emulator token često nema, pa tamo obaveštenje ne mora da stigne. | |

## 15. Rad bez interneta

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Otvori event, agendu i ljude dok ima mreže. 2. Isključi internet. 3. Ostani na istom ekranu, pa povuci ili ponovo otvori tab. 4. Pokušaj da sačuvaš kontakt ili da napišeš follow-up. | Već učitani nazivi, sesije i ljudi ostaju na ekranu. Radnja koja traži mrežu napiše „Nema interneta. Proveri vezu i pokušaj ponovo.“ i ne briše listu. | |

## 16. Event pre prijave

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Odjavi se. 2. Pritisni „Imam kod eventa“. 3. U polje „Kod eventa“ unesi `startup-revolution-ai-summit` i pritisni „Uđi“. 4. Na kartici pritisni „Uđi“ i prijavi se nalogom koji je već na tom eventu. | Pre prijave vidi se slika, naziv, grad i datum. Posle prijave otvara se početna tog eventa. Ako profil za event još nije popunjen, otvaraju se četiri koraka. | |

## 17. Pisani follow-up

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Otvori kontakt koji ima pisanu belešku. 2. Pritisni „Napiši follow-up“. 3. Pritisni „Kraće“, pa „Formalnije“. 4. Pritisni „Otvori u mejlu“ i ne šalji poruku. 5. Pritisni „Označi kao poslato“. 6. Na kontaktu bez beleške ponovo pritisni „Napiši follow-up“. | Pojavi se predmet i tekst. Kraće i formalnije napišu nov nacrt. Mejl aplikacija se otvori, a poruka ostane neposlata. Posle oznake piše „Označeno kao poslato. Mejl se ne šalje sam.“ i prekidač „Follow-up poslat“ je uključen. Bez beleške piše „Napiši belešku o razgovoru, pa onda follow-up.“ | |
