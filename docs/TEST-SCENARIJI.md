# Ručni test scenariji

Radi se na telefonu, sa dva naloga kad scenario traži drugu osobu. Oba naloga su na istom eventu i imaju dopunjene profile (šta nude i šta im treba). Poslednja kolona ostaje prazna dok se test ne odradi.

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
| 1. Prijavi se. 2. Otvori „Skeniraj“. 3. Dozvoli kameru. 4. Skeniraj QR koji nije Skript kod (na primer običan link). | Kamera ostaje otvorena. Piše „Ovo nije Skript QR kod. Skeniraj kod eventa ili bedž.“ | |

## 4. Ulazak na event

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Skeniraj QR eventa ili u polje „Kod eventa“ unesi tačan kod i pritisni „Uđi“. 2. Na kartici eventa pritisni „Uđi“. | Vidi se naziv eventa. Ako profil za taj event još nije popunjen, otvori se četiri koraka. Ako jeste, otvori se početna tog eventa. | |

## 5. Predlozi kad Gemini ne radi

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Na serveru privremeno skloni ili pokvari `GEMINI_API_KEY`. 2. Na telefonu otvori Ljudi, tab Predlozi. 3. Pritisni „Napravi predloge“. 4. Vrati ključ na server. | Lista se ipak pojavi. Razlog je lokalni tekst, na primer „Praviš softver ↔ Treba im razvojni tim“, a ne „Predlozi trenutno nisu dostupni“. | |

## 6. Zahtev

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Na predlogu pritisni „Poveži se“. 2. Po želji dopiši poruku. 3. Pritisni „Pošalji zahtev“. 4. Otvori tab Zahtevi. | Dugme predloga postane „Zahtev poslat“. U poslati zahtevi stoji ta osoba sa statusom „čeka“. | |

## 7. Prihvatanje

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Drugim nalogom otvori Ljudi, tab Zahtevi. 2. Na kartici pritisni „Prihvati“. 3. Otvori tab Povezani. 4. Na prvom nalogu osveži Povezane. | Na kartici piše „Sačuvano u kontakte“ i vide se mejl ili telefon. Oba naloga vide osobu pod Povezani. | |

## 8. Odbijanje

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Sa trećim nalogom, ili novim zahtevom, otvori Zahtevi. 2. Pritisni „Ne sada“. | Kartica kaže „Odbijeno. Kontakt podaci se ne dele.“ Mejl i telefon se ne prikazuju. | |

## 9. Dupli zahtev

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Osobi kojoj je zahtev već poslat ili koja je već povezana pošalji zahtev još jednom (predlog ili sken bedža). | Pojavi se „Zahtev je već poslat.“ Novi red se ne pravi. | |

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
| 1. Na fizičkom telefonu prihvati dozvolu za obaveštenja i ostavi aplikaciju u pozadini. 2. Drugim nalogom pošalji zahtev za povezivanje. 3. Dodirni obaveštenje. | Stigne „Novi zahtev za povezivanje“ sa imenom pošiljaoca i eventa. Dodir otvori tab Zahtevi tog eventa. Emulator token često nema, pa tamo obaveštenje ne mora da stigne. | |

## 15. Rad bez interneta

| Koraci | Očekivano | Stvarni rezultat |
| --- | --- | --- |
| 1. Otvori event, agendu i ljude dok ima mreže. 2. Isključi internet. 3. Ostani na istom ekranu, pa povuci ili ponovo otvori tab. 4. Pokušaj da pošalješ zahtev ili sačuvaš kontakt. | Već učitani nazivi, sesije i ljudi ostaju na ekranu. Radnja koja traži mrežu napiše „Nema interneta. Proveri vezu i pokušaj ponovo.“ i ne briše listu. | |
