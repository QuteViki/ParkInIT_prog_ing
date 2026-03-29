require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const QRCode = require("qrcode");

const app = express();
app.use(cors());
app.use(express.json());

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { sub, role, email, iat, exp }
    return next();
  } catch (e) {
    return res.status(401).json({ error: "unauthorized" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "forbidden" });
  }
  return next();
}

// VAŽNO: memoryStorage da dobiješ buffer (za BLOB)
const upload = multer({ storage: multer.memoryStorage() });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

app.get("/api/ping", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email i password su obavezni" });
    }

    const normEmail = String(email).trim().toLowerCase();

    // Query Korisnik table (merged with Administrator)
    const [rows] = await pool.execute(
      "SELECT ID_korisnika, Email_adresa_korisnika, Password_hash, Role, Ime_korisnika, Prezime_korisnika FROM Korisnik WHERE Email_adresa_korisnika = ? LIMIT 1",
      [normEmail],
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Neispravan email ili lozinka" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.Password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Neispravan email ili lozinka" });
    }

    const token = jwt.sign(
      {
        sub: user.ID_korisnika,
        role: user.Role,
        email: user.Email_adresa_korisnika,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      token,
      user: {
        id: user.ID_korisnika,
        email: user.Email_adresa_korisnika,
        role: user.Role,
        ime: user.Ime_korisnika,
        prezime: user.Prezime_korisnika,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// ==================== USER PROFILE ====================

// GET /api/user/profile - Get user profile data
app.get("/api/user/profile", authRequired, async (req, res) => {
  try {
    const userId = req.user.sub;

    const [rows] = await pool.execute(
      "SELECT ID_korisnika, Email_adresa_korisnika, OIB_korisnika, Ime_korisnika, Prezime_korisnika, Telefonski_broj_korisnika, Role FROM Korisnik WHERE ID_korisnika = ? LIMIT 1",
      [userId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    return res.json({
      id: user.ID_korisnika,
      email: user.Email_adresa_korisnika,
      oib: user.OIB_korisnika,
      ime: user.Ime_korisnika,
      prezime: user.Prezime_korisnika,
      telefonski_broj: user.Telefonski_broj_korisnika,
      role: user.Role,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// PUT /api/user/profile - Update user profile
app.put("/api/user/profile", authRequired, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { email, ime, prezime, telefonski_broj } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normEmail = String(email).trim().toLowerCase();

    await pool.execute(
      "UPDATE Korisnik SET Email_adresa_korisnika = ?, Ime_korisnika = ?, Prezime_korisnika = ?, Telefonski_broj_korisnika = ? WHERE ID_korisnika = ?",
      [
        normEmail,
        ime || null,
        prezime || null,
        telefonski_broj || null,
        userId,
      ],
    );

    return res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// POST /api/user/change-password - Change password
app.post("/api/user/change-password", authRequired, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters" });
    }

    const [rows] = await pool.execute(
      "SELECT Password_hash FROM Korisnik WHERE ID_korisnika = ? LIMIT 1",
      [userId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(
      String(currentPassword),
      user.Password_hash,
    );
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    await pool.execute(
      "UPDATE Korisnik SET Password_hash = ? WHERE ID_korisnika = ?",
      [hashedPassword, userId],
    );

    return res.json({ success: true, message: "Password changed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// ==================== PARKING AVAILABILITY PROXY ====================
// Proxy endpoint to avoid CORS issues with Rijeka Plus API
app.get("/api/parking/availability", async (req, res) => {
  try {
    console.log("Fetching parking data from Rijeka Plus API...");

    const response = await axios.get(
      "https://www.rijeka-plus.hr/wp-json/restAPI/v1/parkingAPI",
      {
        timeout: 15000,
        headers: {
          "User-Agent": "ParkInIT/1.0",
        },
      },
    );

    console.log("Parking data received successfully");
    console.log("Number of parking lots:", response.data.length);
    res.json(response.data);
  } catch (error) {
    console.error("Parking API error:", error.message);
    res.status(500).json({
      error: "Failed to fetch parking data",
      message: error.message,
    });
  }
});

// ==================== PARKING MANAGEMENT ====================

// GET /api/parking - List all parking lots from database
// Optional query params: start_time, end_time (ISO strings) to filter availability by time window
app.get("/api/parking", async (req, res) => {
  try {
    const { start_time, end_time } = req.query;
    const startTime = start_time ? new Date(start_time) : null;
    const endTime = end_time ? new Date(end_time) : null;
    const filterByTime =
      startTime && endTime && !isNaN(startTime) && !isNaN(endTime);

    const [parkings] = await pool.execute(
      "SELECT Sifra_parkinga, Adresa_parkinga, Kapacitet_parkinga, Cijena_parkinga FROM Parking ORDER BY Sifra_parkinga",
    );

    // Calculate available spaces for each parking
    const result = [];
    for (const parking of parkings) {
      const [spaceCounts] = await pool.execute(
        "SELECT COUNT(*) as total FROM Parkirno_mjesto WHERE Sifra_parkinga = ?",
        [parking.Sifra_parkinga],
      );

      let occupiedCount = 0;
      if (filterByTime) {
        const [occupiedCounts] = await pool.execute(
          `SELECT COUNT(DISTINCT pm.Broj_parkirnog_mjesta) as occupied
           FROM Parkirno_mjesto pm
           JOIN Rezervacija r ON pm.Broj_parkirnog_mjesta = r.Broj_parkirnog_mjesta
           WHERE pm.Sifra_parkinga = ?
             AND r.Status_rezervacije IN ('aktivna', 'placena')
             AND r.Vrijeme_pocetka < ? AND r.Vrijeme_isteka > ?`,
          [parking.Sifra_parkinga, endTime, startTime],
        );
        occupiedCount = occupiedCounts[0].occupied;
      } else {
        const [occupiedCounts] = await pool.execute(
          `SELECT COUNT(DISTINCT pm.Broj_parkirnog_mjesta) as occupied
           FROM Parkirno_mjesto pm
           JOIN Rezervacija r ON pm.Broj_parkirnog_mjesta = r.Broj_parkirnog_mjesta
           WHERE pm.Sifra_parkinga = ?
             AND r.Status_rezervacije IN ('aktivna', 'placena')`,
          [parking.Sifra_parkinga],
        );
        occupiedCount = occupiedCounts[0].occupied;
      }

      const [disabledCounts] = await pool.execute(
        "SELECT COUNT(*) as disabled FROM Parkirno_mjesto WHERE Sifra_parkinga = ? AND Vrsta_parkirnog_mjesta = 'invalidsko'",
        [parking.Sifra_parkinga],
      );
      const disabledSpaces = disabledCounts[0].disabled;

      result.push({
        ...parking,
        total_spaces: spaceCounts[0].total,
        available_spaces: spaceCounts[0].total - occupiedCount,
        disabled_spaces: disabledSpaces,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// GET /api/parking/:id/spaces - Get all spaces for a parking lot with availability for given timeframe
app.get("/api/parking/:id/spaces", async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time } = req.query;

    const parkingId = parseInt(id);
    if (!Number.isFinite(parkingId)) {
      return res.status(400).json({ error: "Invalid parking ID" });
    }

    // Get all parking spaces for this parking
    const [spaces] = await pool.execute(
      `SELECT 
        Broj_parkirnog_mjesta, Sifra_parkinga, Sifra_stupa, Sifra_kamere, 
        Status_parkirnog_mjesta, Vrsta_parkirnog_mjesta 
       FROM Parkirno_mjesto 
       WHERE Sifra_parkinga = ?
       ORDER BY Broj_parkirnog_mjesta`,
      [parkingId],
    );

    // For each space, check if it's available for the requested timeframe
    if (start_time && end_time) {
      const startTime = new Date(start_time);
      const endTime = new Date(end_time);

      for (const space of spaces) {
        // Check for overlapping reservations
        const [conflicts] = await pool.execute(
          `SELECT COUNT(*) as count FROM Rezervacija 
           WHERE Broj_parkirnog_mjesta = ? 
           AND Status_rezervacije IN ('aktivna', 'placena')
           AND (
             (Vrijeme_pocetka < ? AND Vrijeme_isteka > ?)
           )`,
          [space.Broj_parkirnog_mjesta, endTime, startTime],
        );

        space.is_available = conflicts[0].count === 0;
      }
    } else {
      // If no time range specified, just check current status
      for (const space of spaces) {
        space.is_available = space.Status_parkirnog_mjesta === "slobodno";
      }
    }

    res.json(spaces);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

// ==================== RESERVATIONS CRUD ====================
// Što očekuje: Rezervacija.ID_korisnika (INT) FK -> Korisnik.ID_korisnika

// GET /api/reservations - List user's reservations
app.get("/api/reservations", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user.sub);

    const [rows] = await pool.execute(
      `SELECT r.Br_rezervacije, r.Vrijeme_pocetka, r.Vrijeme_isteka,
              r.Broj_parkirnog_mjesta, r.Registracija, r.Status_rezervacije,
              p.Adresa_parkinga,
              pm.Vrsta_parkirnog_mjesta
       FROM Rezervacija r
       LEFT JOIN Parkirno_mjesto pm ON pm.Broj_parkirnog_mjesta = r.Broj_parkirnog_mjesta
       LEFT JOIN Parking p ON p.Sifra_parkinga = pm.Sifra_parkinga
       WHERE r.ID_korisnika = ?
       ORDER BY r.Vrijeme_pocetka DESC`,
      [userId],
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// GET /api/reservations/:id/ekarta - Get e-karta for a reservation
app.get("/api/reservations/:id/ekarta", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.user.sub);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Neispravan ID rezervacije" });
    }

    const [rows] = await pool.execute(
      `SELECT r.Br_rezervacije, r.Vrijeme_pocetka, r.Vrijeme_isteka,
              r.Broj_parkirnog_mjesta, r.Registracija, r.Status_rezervacije,
              r.ID_korisnika,
              e.QR_kod, e.Poslana_na_mail,
              p.Adresa_parkinga,
              pm.Vrsta_parkirnog_mjesta,
              k.Ime_korisnika, k.Prezime_korisnika
       FROM Rezervacija r
       LEFT JOIN Ekarta e ON e.Br_rezervacije = r.Br_rezervacije
       LEFT JOIN Parkirno_mjesto pm ON pm.Broj_parkirnog_mjesta = r.Broj_parkirnog_mjesta
       LEFT JOIN Parking p ON p.Sifra_parkinga = pm.Sifra_parkinga
       LEFT JOIN Korisnik k ON k.ID_korisnika = r.ID_korisnika
       WHERE r.Br_rezervacije = ? AND r.ID_korisnika = ?`,
      [id, userId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Rezervacija nije pronađena" });
    }

    const row = rows[0];
    const bookingCode =
      row.QR_kod ||
      `PKIT-${new Date().getFullYear()}-RE${String(id).padStart(5, "0")}`;

    // Regenerate QR code from booking code
    const qrData = JSON.stringify({
      kod: bookingCode,
      rezervacija: row.Br_rezervacije,
      parking: row.Broj_parkirnog_mjesta,
      od: row.Vrijeme_pocetka,
      do: row.Vrijeme_isteka,
      registracija: row.Registracija,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
    });

    const spaceType = row.Vrsta_parkirnog_mjesta || "standardno";

    return res.json({
      success: true,
      bookingCode,
      brRezervacije: row.Br_rezervacije,
      qrCode: qrCodeDataUrl,
      ekarta: {
        parking: row.Adresa_parkinga || "",
        spaceNumber: row.Broj_parkirnog_mjesta,
        spaceType: spaceType === "invalidsko" ? "Invalidsko" : "Standardno",
        startDateTime: row.Vrijeme_pocetka,
        endDateTime: row.Vrijeme_isteka,
        vehicle: row.Registracija || "",
        userName:
          `${row.Ime_korisnika || ""} ${row.Prezime_korisnika || ""}`.trim(),
        userId: row.ID_korisnika,
        statusRezervacije: row.Status_rezervacije,
        poslanaNamail: row.Poslana_na_mail,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// POST /api/reservations - Create new reservation
app.post("/api/reservations", authRequired, async (req, res) => {
  try {
    const {
      Vrijeme_pocetka,
      Vrijeme_isteka,
      Broj_parkirnog_mjesta,
      Registracija,
    } = req.body || {};
    const userId = Number(req.user.sub);

    if (!Vrijeme_pocetka || !Vrijeme_isteka || Broj_parkirnog_mjesta == null) {
      return res.status(400).json({
        error:
          "Vrijeme_pocetka, Vrijeme_isteka i Broj_parkirnog_mjesta su obavezni",
      });
    }

    // Validate time fields
    const startTime = new Date(Vrijeme_pocetka);
    const endTime = new Date(Vrijeme_isteka);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({ error: "Neispravni format vremena" });
    }

    if (endTime <= startTime) {
      return res
        .status(400)
        .json({ error: "Vrijeme isteka mora biti nakon vremena početka" });
    }

    // Don't allow bookings in the past
    if (startTime < new Date()) {
      return res
        .status(400)
        .json({ error: "Ne možete rezervirati parkirno mjesto u prošlosti" });
    }

    // Check for maximum duration (max 24 hours)
    const durationMs = endTime - startTime;
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours > 24) {
      return res
        .status(400)
        .json({ error: "Maksimalno trajanje rezervacije je 24 sata" });
    }

    const slot = Number(Broj_parkirnog_mjesta);
    if (!Number.isFinite(slot)) {
      return res
        .status(400)
        .json({ error: "Broj_parkirnog_mjesta mora biti broj" });
    }

    // Check if parking space exists and is available in the requested timeframe
    const [spaceExists] = await pool.execute(
      "SELECT Broj_parkirnog_mjesta, Status_parkirnog_mjesta FROM Parkirno_mjesto WHERE Broj_parkirnog_mjesta = ?",
      [slot],
    );

    if (!spaceExists.length) {
      return res.status(404).json({ error: "Parkirno mjesto nije pronađeno" });
    }

    if (
      spaceExists[0].Status_parkirnog_mjesta === "zauzeto" ||
      spaceExists[0].Status_parkirnog_mjesta === "rezervirano"
    ) {
      return res
        .status(400)
        .json({ error: "Parkirno mjesto je zauzeto ili rezervirano" });
    }

    // Check for overlapping reservations (CRITICAL: Prevent double-booking)
    const [conflicts] = await pool.execute(
      `SELECT COUNT(*) as count FROM Rezervacija 
       WHERE Broj_parkirnog_mjesta = ? 
       AND Status_rezervacije IN ('aktivna', 'placena')
       AND (
         (Vrijeme_pocetka < ? AND Vrijeme_isteka > ?)
       )`,
      [slot, endTime, startTime],
    );

    if (conflicts[0].count > 0) {
      return res.status(409).json({
        error:
          "Parkirno mjesto je već rezervirano za odabrani vremenski period",
      });
    }

    // Ensure the vehicle (Registracija) exists in Vozilo before inserting Rezervacija (FK constraint)
    const regPlate = Registracija || "";
    if (regPlate) {
      await pool.execute(
        `INSERT IGNORE INTO Vozilo (Registracija, ID_korisnika, Marka_vozila) VALUES (?, ?, 'Nepoznato')`,
        [regPlate, userId],
      );
    }

    // Insert reservation with correct field names (ID_korisnika, not user_id)
    const [result] = await pool.execute(
      `INSERT INTO Rezervacija (ID_korisnika, Broj_parkirnog_mjesta, Registracija, Vrijeme_pocetka, Vrijeme_isteka, Status_rezervacije, Admin_override, ID_admina)
       VALUES (?, ?, ?, ?, ?, 'aktivna', 0, NULL)`,
      [userId, slot, regPlate, Vrijeme_pocetka, Vrijeme_isteka],
    );

    return res.status(201).json({
      success: true,
      Br_rezervacije: result.insertId,
      message: "Rezervacija uspješno kreirana",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// PUT /api/reservations/:id - Update reservation
app.put("/api/reservations/:id", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.user.sub);
    const { Vrijeme_pocetka, Vrijeme_isteka, Broj_parkirnog_mjesta } =
      req.body || {};

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Neispravan ID rezervacije" });
    }

    if (!Vrijeme_pocetka || !Vrijeme_isteka || Broj_parkirnog_mjesta == null) {
      return res.status(400).json({ error: "Sva polja su obavezna" });
    }

    const slot = Number(Broj_parkirnog_mjesta);
    if (!Number.isFinite(slot)) {
      return res
        .status(400)
        .json({ error: "Broj_parkirnog_mjesta mora biti broj" });
    }

    // Check if reservation belongs to user
    const [existing] = await pool.execute(
      "SELECT ID_korisnika FROM Rezervacija WHERE Br_rezervacije = ?",
      [id],
    );

    if (!existing.length) {
      return res.status(404).json({ error: "Rezervacija nije pronađena" });
    }

    if (Number(existing[0].ID_korisnika) !== userId) {
      return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
    }

    await pool.execute(
      `UPDATE Rezervacija
       SET Vrijeme_pocetka = ?, Vrijeme_isteka = ?, Broj_parkirnog_mjesta = ?
       WHERE Br_rezervacije = ?`,
      [Vrijeme_pocetka, Vrijeme_isteka, slot, id],
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// DELETE /api/reservations/:id - Delete reservation
app.delete("/api/reservations/:id", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.user.sub);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Neispravan ID rezervacije" });
    }

    // Check if reservation belongs to user
    const [existing] = await pool.execute(
      "SELECT ID_korisnika FROM Rezervacija WHERE Br_rezervacije = ?",
      [id],
    );

    if (!existing.length) {
      return res.status(404).json({ error: "Rezervacija nije pronađena" });
    }

    if (Number(existing[0].ID_korisnika) !== userId) {
      return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
    }

    await pool.execute("DELETE FROM Rezervacija WHERE Br_rezervacije = ?", [
      id,
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// ==================== REPORTS ====================

// POST /api/reports -> upis u parking_reports (image kao BLOB)
app.post(
  "/api/reports",
  authRequired,
  upload.single("image"),
  async (req, res) => {
    try {
      const { parking_id, description, latitude, longitude } = req.body;

      if (!parking_id)
        return res.status(400).json({ error: "parking_id je obavezan" });
      if (!req.file)
        return res.status(400).json({ error: "image je obavezna" });

      const buf = req.file.buffer;
      const mime = req.file.mimetype || "image/jpeg";
      const name = req.file.originalname || "report.jpg";

      const userId = req.user?.sub || null;

      const [result] = await pool.execute(
        `INSERT INTO parking_reports
       (user_id, parking_id, image, image_mime, image_name, description, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          String(parking_id),
          buf,
          mime,
          name,
          description || null,
          latitude != null ? Number(latitude) : null,
          longitude != null ? Number(longitude) : null,
        ],
      );

      return res.json({ success: true, id: result.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

// Admin: lista reportova (bez slika)
app.get("/api/reports", authRequired, adminOnly, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, user_id, parking_id, description, latitude, longitude, created_at
     FROM parking_reports
     ORDER BY id DESC
     LIMIT 200`,
  );
  return res.json(rows);
});

// Admin: dohvat slike po ID-u
app.get("/api/reports/:id/image", authRequired, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.execute(
    `SELECT image, image_mime FROM parking_reports WHERE id = ?`,
    [id],
  );
  if (!rows.length || !rows[0].image) return res.status(404).end();

  res.setHeader("Content-Type", rows[0].image_mime || "image/jpeg");
  return res.send(rows[0].image);
});

app.delete("/api/reports/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.execute("DELETE FROM parking_reports WHERE id = ?", [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// ==================== PAYMENTS ====================
// WSPay Payment Integration
// SETUP: Set WSPAY_MODE, WSPAY_MERCHANT_ID, WSPAY_KEY in .env
// TEST MODE: Uses mock payment page for development
// PROD MODE: Redirects to WSPay secure server (set WSPAY_MODE=production)

// POST /api/payments/initiate - Create Rezervacija, mark as paid, generate Ekarta with QR code
app.post("/api/payments/initiate", authRequired, async (req, res) => {
  try {
    const { bookingCode, amount, reservation } = req.body || {};
    const userId = Number(req.user.sub);

    if (!bookingCode || !amount || !reservation) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { spaceNumber, vehicle, startDateTime, endDateTime } = reservation;
    if (!spaceNumber || !vehicle || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: "Missing reservation details" });
    }

    // Ensure the vehicle exists in Vozilo (FK constraint)
    await pool.execute(
      `INSERT IGNORE INTO Vozilo (Registracija, ID_korisnika, Marka_vozila) VALUES (?, ?, 'Nepoznato')`,
      [vehicle, userId],
    );

    // Check for overlapping reservations to prevent double-booking
    const [conflicts] = await pool.execute(
      `SELECT COUNT(*) as count FROM Rezervacija
       WHERE Broj_parkirnog_mjesta = ?
       AND Status_rezervacije IN ('aktivna', 'placena')
       AND Vrijeme_pocetka < ? AND Vrijeme_isteka > ?`,
      [spaceNumber, endDateTime, startDateTime],
    );
    if (conflicts[0].count > 0) {
      return res.status(409).json({
        error:
          "Parkirno mjesto je već rezervirano za odabrani vremenski period",
      });
    }

    // Create reservation directly as 'placena'
    const [result] = await pool.execute(
      `INSERT INTO Rezervacija (ID_korisnika, Broj_parkirnog_mjesta, Registracija, Vrijeme_pocetka, Vrijeme_isteka, Status_rezervacije, Admin_override, ID_admina)
       VALUES (?, ?, ?, ?, ?, 'placena', 0, NULL)`,
      [userId, spaceNumber, vehicle, startDateTime, endDateTime],
    );

    const brRezervacije = result.insertId;
    const orderId = `RES-${brRezervacije}`;
    console.log(`[PAYMENT] Reservation ${orderId} created and paid`);

    // Generate QR code as data URL (base64 PNG)
    const qrData = JSON.stringify({
      kod: bookingCode,
      rezervacija: brRezervacije,
      parking: spaceNumber,
      od: startDateTime,
      do: endDateTime,
      registracija: vehicle,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
    });

    // Insert Ekarta record
    await pool.execute(
      `INSERT INTO Ekarta (Br_rezervacije, QR_kod, Vrijeme_pocetka, Vrijeme_isteka, Poslana_na_mail)
       VALUES (?, ?, ?, ?, 0)`,
      [brRezervacije, bookingCode, startDateTime, endDateTime],
    );

    // Get user info for the ticket
    const [userRows] = await pool.execute(
      "SELECT Ime_korisnika, Prezime_korisnika, Email_adresa_korisnika FROM Korisnik WHERE ID_korisnika = ?",
      [userId],
    );
    const user = userRows[0] || {};

    // Get parking address
    const [parkingRows] = await pool.execute(
      `SELECT p.Adresa_parkinga FROM Parking p
       JOIN Parkirno_mjesto pm ON pm.Sifra_parkinga = p.Sifra_parkinga
       WHERE pm.Broj_parkirnog_mjesta = ?`,
      [spaceNumber],
    );
    const parkingAddress =
      parkingRows[0]?.Adresa_parkinga || reservation.address || "";

    // Get space type
    const [spaceRows] = await pool.execute(
      "SELECT Vrsta_parkirnog_mjesta FROM Parkirno_mjesto WHERE Broj_parkirnog_mjesta = ?",
      [spaceNumber],
    );
    const spaceType = spaceRows[0]?.Vrsta_parkirnog_mjesta || "standardno";

    return res.json({
      success: true,
      orderId,
      bookingCode,
      brRezervacije,
      qrCode: qrCodeDataUrl,
      ekarta: {
        parking: parkingAddress,
        spaceNumber,
        spaceType: spaceType === "invalidsko" ? "Invalidsko" : "Standardno",
        startDateTime,
        endDateTime,
        vehicle,
        userName:
          `${user.Ime_korisnika || ""} ${user.Prezime_korisnika || ""}`.trim(),
        userId,
        statusRezervacije: "placena",
      },
    });
  } catch (err) {
    console.error("Payment initiation error:", err);
    return res.status(500).json({ error: "Failed to process payment" });
  }
});

// POST /api/payments/verify - Mark Rezervacija as 'placena' after payment callback
app.post("/api/payments/verify", authRequired, async (req, res) => {
  try {
    const { paymentCode, status, transactionId } = req.body || {};
    const userId = Number(req.user.sub);
    const paymentMode = process.env.WSPAY_MODE || "test";

    if (!paymentCode) {
      return res.status(400).json({ error: "Payment code is required" });
    }

    if (!paymentCode.startsWith("RES-")) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment code" });
    }

    const brRezervacije = parseInt(paymentCode.replace("RES-", ""), 10);
    if (isNaN(brRezervacije)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment code format" });
    }

    if (paymentMode === "production") {
      console.log(`[PRODUCTION] Verifying payment for ${paymentCode}`);
    } else {
      console.log(`[TEST] Accepting mock payment for ${paymentCode}`);
    }

    const [rows] = await pool.execute(
      "SELECT * FROM Rezervacija WHERE Br_rezervacije = ? AND ID_korisnika = ?",
      [brRezervacije, userId],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Reservation not found" });
    }

    await pool.execute(
      "UPDATE Rezervacija SET Status_rezervacije = 'placena' WHERE Br_rezervacije = ?",
      [brRezervacije],
    );

    console.log(`[SUCCESS] Rezervacija ${brRezervacije} marked as placena`);

    return res.json({
      success: true,
      transactionId: transactionId || `TRX-${Date.now()}`,
      orderId: paymentCode,
      Br_rezervacije: brRezervacije,
      status: "approved",
      message: "Payment verified and reservation confirmed",
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    return res.status(500).json({ error: "Payment verification failed" });
  }
});

// POST /api/payments/notify - WSpay server-to-server notification (optional)
app.post("/api/payments/notify", async (req, res) => {
  try {
    const { OrderNumber, Status } = req.body || {};

    if (!OrderNumber) {
      return res.status(400).json({ error: "OrderNumber is required" });
    }

    if (OrderNumber.startsWith("RES-")) {
      const brRezervacije = parseInt(OrderNumber.replace("RES-", ""), 10);
      if (!isNaN(brRezervacije)) {
        const newStatus = Status === "success" ? "placena" : "otkazana";
        await pool.execute(
          "UPDATE Rezervacija SET Status_rezervacije = ? WHERE Br_rezervacije = ?",
          [newStatus, brRezervacije],
        );
        console.log(
          `[NOTIFY] Rezervacija ${brRezervacije} status → ${newStatus}`,
        );
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Payment notification error:", err);
    return res.status(500).json({ error: "Notification processing failed" });
  }
});

// ==================== ADMIN PANEL CRUD ENDPOINTS ====================

// --- PARKING ---
app.get("/api/admin/parking", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT Sifra_parkinga, Adresa_parkinga, Kapacitet_parkinga, Cijena_parkinga FROM Parking ORDER BY Sifra_parkinga",
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.post("/api/admin/parking", authRequired, adminOnly, async (req, res) => {
  try {
    const { Adresa_parkinga, Kapacitet_parkinga, Cijena_parkinga } =
      req.body || {};
    if (
      !Adresa_parkinga ||
      Kapacitet_parkinga == null ||
      Cijena_parkinga == null
    ) {
      return res.status(400).json({
        error:
          "Adresa_parkinga, Kapacitet_parkinga i Cijena_parkinga su obavezni",
      });
    }
    const [result] = await pool.execute(
      "INSERT INTO Parking (Adresa_parkinga, Kapacitet_parkinga, Cijena_parkinga) VALUES (?, ?, ?)",
      [Adresa_parkinga, Number(Kapacitet_parkinga), Number(Cijena_parkinga)],
    );
    return res
      .status(201)
      .json({ success: true, Sifra_parkinga: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.put("/api/admin/parking/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { Adresa_parkinga, Kapacitet_parkinga, Cijena_parkinga } =
      req.body || {};
    if (
      !Adresa_parkinga ||
      Kapacitet_parkinga == null ||
      Cijena_parkinga == null
    ) {
      return res.status(400).json({ error: "Sva polja su obavezna" });
    }
    await pool.execute(
      "UPDATE Parking SET Adresa_parkinga = ?, Kapacitet_parkinga = ?, Cijena_parkinga = ? WHERE Sifra_parkinga = ?",
      [
        Adresa_parkinga,
        Number(Kapacitet_parkinga),
        Number(Cijena_parkinga),
        id,
      ],
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.delete(
  "/api/admin/parking/:id",
  authRequired,
  adminOnly,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await pool.execute("DELETE FROM Parking WHERE Sifra_parkinga = ?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

// --- PARKIRNO MJESTO ---
app.get(
  "/api/admin/parkirno-mjesto",
  authRequired,
  adminOnly,
  async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT pm.Broj_parkirnog_mjesta, pm.Sifra_parkinga, pm.Sifra_stupa, pm.Sifra_kamere,
              pm.Status_parkirnog_mjesta, pm.Vrsta_parkirnog_mjesta,
              p.Adresa_parkinga
       FROM Parkirno_mjesto pm
       LEFT JOIN Parking p ON pm.Sifra_parkinga = p.Sifra_parkinga
       ORDER BY pm.Broj_parkirnog_mjesta`,
      );
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

app.post(
  "/api/admin/parkirno-mjesto",
  authRequired,
  adminOnly,
  async (req, res) => {
    try {
      const {
        Sifra_parkinga,
        Sifra_stupa,
        Sifra_kamere,
        Status_parkirnog_mjesta,
        Vrsta_parkirnog_mjesta,
      } = req.body || {};
      if (Sifra_parkinga == null) {
        return res.status(400).json({ error: "Sifra_parkinga je obavezna" });
      }
      const [result] = await pool.execute(
        `INSERT INTO Parkirno_mjesto (Sifra_parkinga, Sifra_stupa, Sifra_kamere, Status_parkirnog_mjesta, Vrsta_parkirnog_mjesta)
       VALUES (?, ?, ?, ?, ?)`,
        [
          Number(Sifra_parkinga),
          Sifra_stupa ? Number(Sifra_stupa) : null,
          Sifra_kamere ? Number(Sifra_kamere) : null,
          Status_parkirnog_mjesta || "slobodno",
          Vrsta_parkirnog_mjesta || "standardno",
        ],
      );
      return res
        .status(201)
        .json({ success: true, Broj_parkirnog_mjesta: result.insertId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

app.put(
  "/api/admin/parkirno-mjesto/:id",
  authRequired,
  adminOnly,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const {
        Sifra_parkinga,
        Sifra_stupa,
        Sifra_kamere,
        Status_parkirnog_mjesta,
        Vrsta_parkirnog_mjesta,
      } = req.body || {};
      if (Sifra_parkinga == null) {
        return res.status(400).json({ error: "Sifra_parkinga je obavezna" });
      }
      await pool.execute(
        `UPDATE Parkirno_mjesto
       SET Sifra_parkinga = ?, Sifra_stupa = ?, Sifra_kamere = ?,
           Status_parkirnog_mjesta = ?, Vrsta_parkirnog_mjesta = ?
       WHERE Broj_parkirnog_mjesta = ?`,
        [
          Number(Sifra_parkinga),
          Sifra_stupa ? Number(Sifra_stupa) : null,
          Sifra_kamere ? Number(Sifra_kamere) : null,
          Status_parkirnog_mjesta || "slobodno",
          Vrsta_parkirnog_mjesta || "standardno",
          id,
        ],
      );
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

app.delete(
  "/api/admin/parkirno-mjesto/:id",
  authRequired,
  adminOnly,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await pool.execute(
        "DELETE FROM Parkirno_mjesto WHERE Broj_parkirnog_mjesta = ?",
        [id],
      );
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

// --- RAMPA ---
app.get("/api/admin/rampa", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.Sifra_rampe, r.Sifra_parkinga, r.Vrsta_rampe, r.Status_rampe, p.Adresa_parkinga
       FROM Rampa r
       LEFT JOIN Parking p ON r.Sifra_parkinga = p.Sifra_parkinga
       ORDER BY r.Sifra_rampe`,
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.post("/api/admin/rampa", authRequired, adminOnly, async (req, res) => {
  try {
    const { Sifra_parkinga, Vrsta_rampe, Status_rampe } = req.body || {};
    if (Sifra_parkinga == null || !Vrsta_rampe) {
      return res
        .status(400)
        .json({ error: "Sifra_parkinga i Vrsta_rampe su obavezni" });
    }
    const [result] = await pool.execute(
      "INSERT INTO Rampa (Sifra_parkinga, Vrsta_rampe, Status_rampe) VALUES (?, ?, ?)",
      [Number(Sifra_parkinga), Vrsta_rampe, Status_rampe || "zatvorena"],
    );
    return res
      .status(201)
      .json({ success: true, Sifra_rampe: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.put("/api/admin/rampa/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { Sifra_parkinga, Vrsta_rampe, Status_rampe } = req.body || {};
    if (Sifra_parkinga == null || !Vrsta_rampe) {
      return res.status(400).json({ error: "Sva polja su obavezna" });
    }
    await pool.execute(
      "UPDATE Rampa SET Sifra_parkinga = ?, Vrsta_rampe = ?, Status_rampe = ? WHERE Sifra_rampe = ?",
      [Number(Sifra_parkinga), Vrsta_rampe, Status_rampe || "zatvorena", id],
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.delete(
  "/api/admin/rampa/:id",
  authRequired,
  adminOnly,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await pool.execute("DELETE FROM Rampa WHERE Sifra_rampe = ?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

// --- KAMERA ---
app.get("/api/admin/kamera", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT Sifra_kamere, Status_kamere FROM Kamera ORDER BY Sifra_kamere",
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.post("/api/admin/kamera", authRequired, adminOnly, async (req, res) => {
  try {
    const { Status_kamere } = req.body || {};
    const [result] = await pool.execute(
      "INSERT INTO Kamera (Status_kamere) VALUES (?)",
      [Status_kamere || "on"],
    );
    return res
      .status(201)
      .json({ success: true, Sifra_kamere: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.put("/api/admin/kamera/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { Status_kamere } = req.body || {};
    if (!Status_kamere) {
      return res.status(400).json({ error: "Status_kamere je obavezan" });
    }
    await pool.execute(
      "UPDATE Kamera SET Status_kamere = ? WHERE Sifra_kamere = ?",
      [Status_kamere, id],
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.delete(
  "/api/admin/kamera/:id",
  authRequired,
  adminOnly,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      await pool.execute("DELETE FROM Kamera WHERE Sifra_kamere = ?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

// --- STUP ---
app.get("/api/admin/stup", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT Sifra_stupa, Status_stupa FROM Stup ORDER BY Sifra_stupa",
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.post("/api/admin/stup", authRequired, adminOnly, async (req, res) => {
  try {
    const { Status_stupa } = req.body || {};
    const [result] = await pool.execute(
      "INSERT INTO Stup (Status_stupa) VALUES (?)",
      [Status_stupa || "aktivan"],
    );
    return res
      .status(201)
      .json({ success: true, Sifra_stupa: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.put("/api/admin/stup/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { Status_stupa } = req.body || {};
    if (!Status_stupa) {
      return res.status(400).json({ error: "Status_stupa je obavezan" });
    }
    await pool.execute(
      "UPDATE Stup SET Status_stupa = ? WHERE Sifra_stupa = ?",
      [Status_stupa, id],
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.delete("/api/admin/stup/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.execute("DELETE FROM Stup WHERE Sifra_stupa = ?", [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// ==================== ADMIN TICKETS ====================

// GET /api/admin/tickets - All ekarte, filterable by name/date
app.get("/api/admin/tickets", authRequired, adminOnly, async (req, res) => {
  try {
    const { search, date } = req.query;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(
        "CONCAT(k.Ime_korisnika, ' ', k.Prezime_korisnika) LIKE ?",
      );
      params.push(`%${search}%`);
    }
    if (date) {
      conditions.push("DATE(e.Vrijeme_pocetka) = ?");
      params.push(date);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const [rows] = await pool.execute(
      `SELECT e.Br_rezervacije, e.QR_kod, e.Vrijeme_pocetka, e.Vrijeme_isteka, e.Poslana_na_mail,
              r.Broj_parkirnog_mjesta, r.Registracija, r.Status_rezervacije,
              r.ID_korisnika, r.Admin_override,
              k.Ime_korisnika, k.Prezime_korisnika, k.Email_adresa_korisnika,
              p.Adresa_parkinga, pm.Vrsta_parkirnog_mjesta
       FROM Ekarta e
       JOIN Rezervacija r ON r.Br_rezervacije = e.Br_rezervacije
       JOIN Korisnik k ON k.ID_korisnika = r.ID_korisnika
       LEFT JOIN Parkirno_mjesto pm ON pm.Broj_parkirnog_mjesta = r.Broj_parkirnog_mjesta
       LEFT JOIN Parking p ON p.Sifra_parkinga = pm.Sifra_parkinga
       ${where}
       ORDER BY e.Br_rezervacije DESC
       LIMIT 500`,
      params,
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// GET /api/admin/tickets/:id/ekarta - View any ekarta (admin sees all)
app.get(
  "/api/admin/tickets/:id/ekarta",
  authRequired,
  adminOnly,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id))
        return res.status(400).json({ error: "Neispravan ID" });

      const [rows] = await pool.execute(
        `SELECT r.Br_rezervacije, r.Vrijeme_pocetka, r.Vrijeme_isteka,
              r.Broj_parkirnog_mjesta, r.Registracija, r.Status_rezervacije,
              r.ID_korisnika, r.Admin_override,
              e.QR_kod, p.Adresa_parkinga,
              pm.Vrsta_parkirnog_mjesta,
              k.Ime_korisnika, k.Prezime_korisnika
       FROM Rezervacija r
       LEFT JOIN Ekarta e ON e.Br_rezervacije = r.Br_rezervacije
       LEFT JOIN Parkirno_mjesto pm ON pm.Broj_parkirnog_mjesta = r.Broj_parkirnog_mjesta
       LEFT JOIN Parking p ON p.Sifra_parkinga = pm.Sifra_parkinga
       LEFT JOIN Korisnik k ON k.ID_korisnika = r.ID_korisnika
       WHERE r.Br_rezervacije = ?`,
        [id],
      );
      if (!rows.length)
        return res.status(404).json({ error: "Nije pronadjeno" });

      const row = rows[0];
      const bookingCode =
        row.QR_kod ||
        `PKIT-${new Date().getFullYear()}-RE${String(id).padStart(5, "0")}`;
      const qrData = JSON.stringify({
        kod: bookingCode,
        rezervacija: row.Br_rezervacije,
        parking: row.Broj_parkirnog_mjesta,
        od: row.Vrijeme_pocetka,
        do: row.Vrijeme_isteka,
        registracija: row.Registracija,
      });
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
      });

      return res.json({
        success: true,
        bookingCode,
        brRezervacije: row.Br_rezervacije,
        qrCode: qrCodeDataUrl,
        ekarta: {
          parking: row.Adresa_parkinga || "",
          spaceNumber: row.Broj_parkirnog_mjesta,
          spaceType:
            row.Vrsta_parkirnog_mjesta === "invalidsko"
              ? "Invalidsko"
              : "Standardno",
          startDateTime: row.Vrijeme_pocetka,
          endDateTime: row.Vrijeme_isteka,
          vehicle: row.Registracija || "",
          userName:
            `${row.Ime_korisnika || ""} ${row.Prezime_korisnika || ""}`.trim(),
          userId: row.ID_korisnika,
          statusRezervacije: row.Status_rezervacije,
          adminOverride: !!row.Admin_override,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

// GET /api/admin/users - List all users (for override dialog dropdown)
app.get("/api/admin/users", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT ID_korisnika, Ime_korisnika, Prezime_korisnika, Email_adresa_korisnika FROM Korisnik ORDER BY Ime_korisnika, Prezime_korisnika",
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// POST /api/admin/tickets/override - Admin force-create reservation + ekarta
app.post(
  "/api/admin/tickets/override",
  authRequired,
  adminOnly,
  async (req, res) => {
    try {
      const {
        userId,
        spaceNumber,
        startDateTime,
        endDateTime,
        vehicle,
        forceOverride,
      } = req.body || {};
      const adminId = Number(req.user.sub);

      if (
        !userId ||
        spaceNumber == null ||
        !startDateTime ||
        !endDateTime ||
        !vehicle
      ) {
        return res.status(400).json({
          error:
            "userId, spaceNumber, startDateTime, endDateTime i vehicle su obavezni",
        });
      }

      const [userRows] = await pool.execute(
        "SELECT ID_korisnika, Ime_korisnika, Prezime_korisnika FROM Korisnik WHERE ID_korisnika = ?",
        [Number(userId)],
      );
      if (!userRows.length)
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      const user = userRows[0];

      const [spaceRows] = await pool.execute(
        "SELECT Broj_parkirnog_mjesta, Vrsta_parkirnog_mjesta FROM Parkirno_mjesto WHERE Broj_parkirnog_mjesta = ?",
        [Number(spaceNumber)],
      );
      if (!spaceRows.length)
        return res
          .status(404)
          .json({ error: "Parkirno mjesto nije pronađeno" });
      const space = spaceRows[0];

      if (!forceOverride) {
        const [conflicts] = await pool.execute(
          `SELECT COUNT(*) as count FROM Rezervacija
         WHERE Broj_parkirnog_mjesta = ?
         AND Status_rezervacije IN ('aktivna', 'placena')
         AND Vrijeme_pocetka < ? AND Vrijeme_isteka > ?`,
          [Number(spaceNumber), endDateTime, startDateTime],
        );
        if (conflicts[0].count > 0) {
          return res.status(409).json({
            error:
              "Parkirno mjesto je već rezervirano za taj period. Uključite Force Override da biste prepisali.",
          });
        }
      } else {
        // Cancel conflicting active reservations when force-overriding
        await pool.execute(
          `UPDATE Rezervacija SET Status_rezervacije = 'otkazana'
         WHERE Broj_parkirnog_mjesta = ?
         AND Status_rezervacije IN ('aktivna', 'placena')
         AND Vrijeme_pocetka < ? AND Vrijeme_isteka > ?`,
          [Number(spaceNumber), endDateTime, startDateTime],
        );
      }

      await pool.execute(
        `INSERT IGNORE INTO Vozilo (Registracija, ID_korisnika, Marka_vozila) VALUES (?, ?, 'Nepoznato')`,
        [vehicle, Number(userId)],
      );

      const year = new Date().getFullYear();
      const random = String(Math.floor(Math.random() * 100000)).padStart(
        5,
        "0",
      );
      const bookingCode = `PKIT-${year}-RE${random}`;

      const [result] = await pool.execute(
        `INSERT INTO Rezervacija (ID_korisnika, Broj_parkirnog_mjesta, Registracija, Vrijeme_pocetka, Vrijeme_isteka, Status_rezervacije, Admin_override, ID_admina)
       VALUES (?, ?, ?, ?, ?, 'placena', 1, ?)`,
        [
          Number(userId),
          Number(spaceNumber),
          vehicle,
          startDateTime,
          endDateTime,
          adminId,
        ],
      );
      const brRezervacije = result.insertId;

      const qrData = JSON.stringify({
        kod: bookingCode,
        rezervacija: brRezervacije,
        parking: spaceNumber,
        od: startDateTime,
        do: endDateTime,
        registracija: vehicle,
      });
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
      });

      await pool.execute(
        `INSERT INTO Ekarta (Br_rezervacije, QR_kod, Vrijeme_pocetka, Vrijeme_isteka, Poslana_na_mail)
       VALUES (?, ?, ?, ?, 0)`,
        [brRezervacije, bookingCode, startDateTime, endDateTime],
      );

      const [parkingRows] = await pool.execute(
        `SELECT p.Adresa_parkinga FROM Parking p
       JOIN Parkirno_mjesto pm ON pm.Sifra_parkinga = p.Sifra_parkinga
       WHERE pm.Broj_parkirnog_mjesta = ?`,
        [Number(spaceNumber)],
      );

      return res.json({
        success: true,
        bookingCode,
        brRezervacije,
        qrCode: qrCodeDataUrl,
        ekarta: {
          parking: parkingRows[0]?.Adresa_parkinga || "",
          spaceNumber: Number(spaceNumber),
          spaceType:
            space.Vrsta_parkirnog_mjesta === "invalidsko"
              ? "Invalidsko"
              : "Standardno",
          startDateTime,
          endDateTime,
          vehicle,
          userName: `${user.Ime_korisnika} ${user.Prezime_korisnika}`.trim(),
          userId: user.ID_korisnika,
          statusRezervacije: "placena",
          adminOverride: true,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  },
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on http://0.0.0.0:${PORT}`);
});
