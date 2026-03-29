-- ============================================================
--  ParkInIT Database Schema (Merged Administrator into Korisnik)
--  Updated: March 2025
-- ============================================================

-- 1. KORISNIK
--    Merged with Administrator.
--    Role values: 'user', 'admin'
--    Admin-specific fields (Ime, Prezime, Email, Password_hash)
--    are already present in the user fields.
--    Fields that only admins need (OIB, phone) are nullable
--    so admin accounts do not require them.
-- ============================================================
CREATE TABLE IF NOT EXISTS Korisnik (
    ID_korisnika                INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    OIB_korisnika               VARCHAR(11)     UNIQUE,                      -- nullable for admin accounts
    Ime_korisnika               VARCHAR(32)     NOT NULL,
    Prezime_korisnika           VARCHAR(64)     NOT NULL,
    Telefonski_broj_korisnika   VARCHAR(15),                                 -- nullable for admin accounts
    Email_adresa_korisnika      VARCHAR(64)     NOT NULL UNIQUE,
    Password_hash               VARCHAR(255)    NOT NULL,
    Role                        VARCHAR(20)     NOT NULL DEFAULT 'user'
    -- moguće vrijednosti: 'user', 'admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. VOZILO
-- ============================================================
CREATE TABLE IF NOT EXISTS Vozilo (
    Registracija    VARCHAR(18)     NOT NULL PRIMARY KEY,
    ID_korisnika    INT             NOT NULL,
    Marka_vozila    VARCHAR(32)     NOT NULL,
    Tip_vozila      VARCHAR(32),
    CONSTRAINT FK_Vozilo_Korisnik
        FOREIGN KEY (ID_korisnika)
        REFERENCES Korisnik(ID_korisnika)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PARKING
-- ============================================================
CREATE TABLE IF NOT EXISTS Parking (
    Sifra_parkinga      INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Adresa_parkinga     VARCHAR(128)    NOT NULL,
    Kapacitet_parkinga  INT             NOT NULL,
    Cijena_parkinga     DECIMAL(7,2)    NOT NULL    -- cijena po satu (EUR)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. STUP
-- ============================================================
CREATE TABLE IF NOT EXISTS Stup (
    Sifra_stupa     INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Status_stupa    VARCHAR(16)     NOT NULL DEFAULT 'aktivan'
    -- moguće vrijednosti: 'aktivan', 'neaktivan', 'kvar'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. KAMERA
-- ============================================================
CREATE TABLE IF NOT EXISTS Kamera (
    Sifra_kamere    INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Status_kamere   VARCHAR(16)     NOT NULL DEFAULT 'on'
    -- moguće vrijednosti: 'on', 'off', 'idle'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PARKIRNO_MJESTO
-- ============================================================
CREATE TABLE IF NOT EXISTS Parkirno_mjesto (
    Broj_parkirnog_mjesta       INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Sifra_parkinga              INT             NOT NULL,
    Sifra_stupa                 INT,
    Sifra_kamere                INT,
    Status_parkirnog_mjesta     VARCHAR(16)     NOT NULL DEFAULT 'slobodno',
    -- moguće vrijednosti: 'slobodno', 'zauzeto', 'rezervirano'
    Vrsta_parkirnog_mjesta      VARCHAR(16)     NOT NULL DEFAULT 'standardno',
    -- moguće vrijednosti: 'standardno', 'invalidsko'
    CONSTRAINT FK_ParkMjesto_Parking
        FOREIGN KEY (Sifra_parkinga)
        REFERENCES Parking(Sifra_parkinga),
    CONSTRAINT FK_ParkMjesto_Stup
        FOREIGN KEY (Sifra_stupa)
        REFERENCES Stup(Sifra_stupa),
    CONSTRAINT FK_ParkMjesto_Kamera
        FOREIGN KEY (Sifra_kamere)
        REFERENCES Kamera(Sifra_kamere)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. RAMPA
-- ============================================================
CREATE TABLE IF NOT EXISTS Rampa (
    Sifra_rampe     INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Sifra_parkinga  INT             NOT NULL,
    Vrsta_rampe     VARCHAR(16)     NOT NULL,
    -- moguće vrijednosti: 'ulazna', 'izlazna'
    Status_rampe    VARCHAR(16)     NOT NULL DEFAULT 'zatvorena',
    -- moguće vrijednosti: 'otvorena', 'zatvorena', 'kvar'
    CONSTRAINT FK_Rampa_Parking
        FOREIGN KEY (Sifra_parkinga)
        REFERENCES Parking(Sifra_parkinga)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. REZERVACIJA
--    Admin_override: 1 = admin kreirao/prebacio rezervaciju.
--    ID_admina references Korisnik (role='admin').
-- ============================================================
CREATE TABLE IF NOT EXISTS Rezervacija (
    Br_rezervacije          INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ID_korisnika            INT             NOT NULL,
    Broj_parkirnog_mjesta   INT             NOT NULL,
    Registracija            VARCHAR(18)     NOT NULL,
    Vrijeme_pocetka         DATETIME        NOT NULL,
    Vrijeme_isteka          DATETIME        NOT NULL,
    Status_rezervacije      VARCHAR(16)     NOT NULL DEFAULT 'aktivna',
    -- moguće vrijednosti: 'aktivna', 'placena', 'istekla', 'otkazana'
    Admin_override          TINYINT(1)      NOT NULL DEFAULT 0,
    -- 0 = standardni tijek, 1 = admin je kreirao/prebacio rezervaciju
    ID_admina               INT             DEFAULT NULL,
    -- popunjava se samo kad je Admin_override = 1; referencira Korisnik s role='admin'
    CONSTRAINT FK_Rezervacija_Korisnik
        FOREIGN KEY (ID_korisnika)
        REFERENCES Korisnik(ID_korisnika),
    CONSTRAINT FK_Rezervacija_ParkMjesto
        FOREIGN KEY (Broj_parkirnog_mjesta)
        REFERENCES Parkirno_mjesto(Broj_parkirnog_mjesta),
    CONSTRAINT FK_Rezervacija_Vozilo
        FOREIGN KEY (Registracija)
        REFERENCES Vozilo(Registracija),
    CONSTRAINT FK_Rezervacija_Admin
        FOREIGN KEY (ID_admina)
        REFERENCES Korisnik(ID_korisnika)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. EKARTA
-- ============================================================
CREATE TABLE IF NOT EXISTS Ekarta (
    Broj_ekarte         INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Br_rezervacije      INT             NOT NULL UNIQUE,
    QR_kod              VARCHAR(512)    NOT NULL,
    Vrijeme_pocetka     DATETIME        NOT NULL,
    Vrijeme_isteka      DATETIME        NOT NULL,
    Poslana_na_mail     TINYINT(1)      NOT NULL DEFAULT 0,
    -- 0 = nije poslana, 1 = uspješno poslana na mail korisnika
    CONSTRAINT FK_Ekarta_Rezervacija
        FOREIGN KEY (Br_rezervacije)
        REFERENCES Rezervacija(Br_rezervacije)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  INDEKSI
-- ============================================================
CREATE INDEX IDX_Korisnik_Role            ON Korisnik(Role);
CREATE INDEX IDX_Vozilo_Korisnik          ON Vozilo(ID_korisnika);
CREATE INDEX IDX_ParkMjesto_Parking       ON Parkirno_mjesto(Sifra_parkinga);
CREATE INDEX IDX_ParkMjesto_Status        ON Parkirno_mjesto(Status_parkirnog_mjesta);
CREATE INDEX IDX_ParkMjesto_Vrsta         ON Parkirno_mjesto(Vrsta_parkirnog_mjesta);
CREATE INDEX IDX_Rampa_Parking            ON Rampa(Sifra_parkinga);
CREATE INDEX IDX_Rezervacija_Korisnik     ON Rezervacija(ID_korisnika);
CREATE INDEX IDX_Rezervacija_ParkMjesto   ON Rezervacija(Broj_parkirnog_mjesta);
CREATE INDEX IDX_Rezervacija_Status       ON Rezervacija(Status_rezervacije);
CREATE INDEX IDX_Ekarta_Rezervacija       ON Ekarta(Br_rezervacije);

-- ============================================================
--  INSERT -- Testni podaci
-- ============================================================

-- 1. KORISNIK
--    Admini (role='admin') su uneseni prvi kako bi njihovi
--    ID-evi bili poznati prije FK referenci u Rezervaciji.
--    Admini nemaju OIB ni telefonski broj (nullable).
--    Lozinka admina: Admin123!
--    Lozinka korisnika: Korisnik123!
-- ============================================================
INSERT INTO Korisnik (OIB_korisnika, Ime_korisnika, Prezime_korisnika, Telefonski_broj_korisnika, Email_adresa_korisnika, Password_hash, Role) VALUES
-- Admini (ID 1, 2, 3)
(NULL, 'Marko',    'Horvat', NULL, 'marko.horvat@parkinit.hr',   '$2b$10$xJ8zQ1kL9mN3pR5tV7wY0uOeA2cF4hI6jK8lM0nP2qS4uW6yZ8bD0', 'admin'),
(NULL, 'Ana',      'Kovač',  NULL, 'ana.kovac@parkinit.hr',      '$2b$10$xJ8zQ1kL9mN3pR5tV7wY0uOeA2cF4hI6jK8lM0nP2qS4uW6yZ8bD0', 'admin'),
(NULL, 'Tomislav', 'Babić',  NULL, 'tomislav.babic@parkinit.hr', '$2b$10$xJ8zQ1kL9mN3pR5tV7wY0uOeA2cF4hI6jK8lM0nP2qS4uW6yZ8bD0', 'admin'),
-- Korisnici (ID 4, 5, 6, 7, 8, 9)
('12345678901', 'Ivan',  'Perić',    '+38591234567', 'ivan.peric@gmail.com',     '$2b$10$aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4cD5eF6gH7iJ8', 'user'),
('23456789012', 'Maja',  'Novak',    '+38592345678', 'maja.novak@gmail.com',     '$2b$10$aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4cD5eF6gH7iJ8', 'user'),
('34567890123', 'Luka',  'Jurić',    '+38593456789', 'luka.juric@gmail.com',     '$2b$10$aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4cD5eF6gH7iJ8', 'user'),
('45678901234', 'Sara',  'Blažević', '+38594567890', 'sara.blazevic@gmail.com',  '$2b$10$aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4cD5eF6gH7iJ8', 'user'),
('56789012345', 'Petra', 'Marković', '+38595678901', 'petra.markovic@gmail.com', '$2b$10$aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4cD5eF6gH7iJ8', 'user'),
('67890123456', 'Dino',  'Šimić',    '+38596789012', 'dino.simic@gmail.com',     '$2b$10$aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4cD5eF6gH7iJ8', 'user');

-- 2. VOZILO
--    ID-evi korisnika su sada pomaknuti za 3 (admini zauzimaju 1-3).
--    Ivan (stari ID 1) -> novi ID 4
--    Maja (stari ID 2) -> novi ID 5
--    Luka (stari ID 3) -> novi ID 6
--    Sara (stari ID 4) -> novi ID 7
--    Petra(stari ID 5) -> novi ID 8
--    Dino (stari ID 6) -> novi ID 9
-- ============================================================
INSERT INTO Vozilo (Registracija, ID_korisnika, Marka_vozila, Tip_vozila) VALUES
('RI-123-AB', 4, 'Volkswagen', 'Golf 7'),
('RI-456-CD', 4, 'Škoda',      'Octavia'),
('ZG-789-EF', 5, 'Toyota',     'Yaris'),
('ZG-111-GH', 6, 'Ford',       'Focus'),
('ST-222-IJ', 7, 'Renault',    'Clio'),
('RI-333-KL', 8, 'BMW',        '320d'),
('OS-444-MN', 9, 'Opel',       'Astra');

-- 3. PARKING
-- ============================================================
INSERT INTO Parking (Adresa_parkinga, Kapacitet_parkinga, Cijena_parkinga) VALUES
('Ul. Ante Starčevića 1, Rijeka', 120, 1.50),
('Korzo 2, Rijeka',                80, 2.00),
('Ul. Ružićeva 5, Rijeka',         60, 1.20);

-- 4. STUP
-- ============================================================
INSERT INTO Stup (Status_stupa) VALUES
('aktivan'),
('aktivan'),
('aktivan'),
('aktivan'),
('kvar'),
('aktivan'),
('aktivan'),
('neaktivan'),
('aktivan'),
('aktivan');

-- 5. KAMERA
-- ============================================================
INSERT INTO Kamera (Status_kamere) VALUES
('on'),
('on'),
('on'),
('idle'),
('on'),
('off'),
('on'),
('on'),
('on'),
('idle');

-- 6. PARKIRNO_MJESTO
-- ============================================================
INSERT INTO Parkirno_mjesto (Sifra_parkinga, Sifra_stupa, Sifra_kamere, Status_parkirnog_mjesta, Vrsta_parkirnog_mjesta) VALUES
-- Parking 1 (Starčevića): mjesta 1-10
(1, 1,    1,    'slobodno',    'standardno'),
(1, 2,    2,    'slobodno',    'standardno'),
(1, 3,    3,    'rezervirano', 'standardno'),
(1, 4,    4,    'zauzeto',     'standardno'),
(1, 5,    5,    'slobodno',    'invalidsko'),
(1, 6,    6,    'slobodno',    'invalidsko'),
(1, 7,    7,    'slobodno',    'standardno'),
(1, 8,    8,    'zauzeto',     'standardno'),
(1, 9,    9,    'slobodno',    'standardno'),
(1, 10,   10,   'slobodno',    'standardno'),
-- Parking 2 (Korzo): mjesta 11-18
(2, NULL, NULL, 'slobodno',    'standardno'),
(2, NULL, NULL, 'slobodno',    'standardno'),
(2, NULL, NULL, 'zauzeto',     'standardno'),
(2, NULL, NULL, 'slobodno',    'invalidsko'),
(2, NULL, NULL, 'slobodno',    'invalidsko'),
(2, NULL, NULL, 'rezervirano', 'standardno'),
(2, NULL, NULL, 'slobodno',    'standardno'),
(2, NULL, NULL, 'slobodno',    'standardno'),
-- Parking 3 (Ružićeva): mjesta 19-24
(3, NULL, NULL, 'slobodno',    'standardno'),
(3, NULL, NULL, 'slobodno',    'standardno'),
(3, NULL, NULL, 'zauzeto',     'standardno'),
(3, NULL, NULL, 'slobodno',    'invalidsko'),
(3, NULL, NULL, 'slobodno',    'standardno'),
(3, NULL, NULL, 'rezervirano', 'standardno');

-- 7. RAMPA
-- ============================================================
INSERT INTO Rampa (Sifra_parkinga, Vrsta_rampe, Status_rampe) VALUES
(1, 'ulazna',  'zatvorena'),
(1, 'izlazna', 'zatvorena'),
(2, 'ulazna',  'zatvorena'),
(2, 'izlazna', 'zatvorena'),
(3, 'ulazna',  'zatvorena'),
(3, 'izlazna', 'zatvorena');

-- 8. REZERVACIJA
--    ID_korisnika i ID_admina su ažurirani (offset +3).
--    Admin Marko Horvat (stari admin ID 1) -> novi Korisnik ID 1.
-- ============================================================
INSERT INTO Rezervacija (ID_korisnika, Broj_parkirnog_mjesta, Registracija, Vrijeme_pocetka, Vrijeme_isteka, Status_rezervacije, Admin_override, ID_admina) VALUES
(4, 3,  'RI-123-AB', '2025-06-01 08:00:00', '2025-06-01 10:00:00', 'placena',  0, NULL),
(5, 16, 'ZG-789-EF', '2025-06-01 09:00:00', '2025-06-01 11:00:00', 'placena',  0, NULL),
(6, 24, 'ZG-111-GH', '2025-06-02 07:30:00', '2025-06-02 09:30:00', 'placena',  0, NULL),
(7, 5,  'ST-222-IJ', '2025-06-03 10:00:00', '2025-06-03 12:00:00', 'otkazana', 0, NULL),
(8, 7,  'RI-333-KL', '2025-06-04 14:00:00', '2025-06-04 16:00:00', 'aktivna',  0, NULL),
(9, 11, 'OS-444-MN', '2025-06-05 08:00:00', '2025-06-05 10:00:00', 'aktivna',  0, NULL),
(4, 19, 'RI-456-CD', '2025-06-06 09:00:00', '2025-06-06 11:00:00', 'aktivna',  0, NULL),
-- Admin override: Marko Horvat (ID 1) prebacuje Luku (ID 6) na novo mjesto
(6, 9,  'ZG-111-GH', '2025-06-03 10:00:00', '2025-06-03 12:00:00', 'placena',  1, 1);

-- 9. EKARTA
-- ============================================================
INSERT INTO Ekarta (Br_rezervacije, QR_kod, Vrijeme_pocetka, Vrijeme_isteka, Poslana_na_mail) VALUES
(1, 'PKIT-2025-RES001-A7F3K9X2M4Q8W1', '2025-06-01 08:00:00', '2025-06-01 10:00:00', 1),
(2, 'PKIT-2025-RES002-B8G4L0Y3N5R9X2', '2025-06-01 09:00:00', '2025-06-01 11:00:00', 1),
(3, 'PKIT-2025-RES003-C9H5M1Z4O6S0Y3', '2025-06-02 07:30:00', '2025-06-02 09:30:00', 1),
(5, 'PKIT-2025-RES005-D0I6N2A5P7T1Z4', '2025-06-04 14:00:00', '2025-06-04 16:00:00', 0),
(6, 'PKIT-2025-RES006-E1J7O3B6Q8U2A5', '2025-06-05 08:00:00', '2025-06-05 10:00:00', 1),
(7, 'PKIT-2025-RES007-F2K8P4C7R9V3B6', '2025-06-06 09:00:00', '2025-06-06 11:00:00', 1),
(8, 'PKIT-2025-RES008-G3L9Q5D8S0W4C7', '2025-06-03 10:00:00', '2025-06-03 12:00:00', 1);
-- Rezervacija 4 (otkazana) nema e-kartu -- ispravno, nije plaćena
