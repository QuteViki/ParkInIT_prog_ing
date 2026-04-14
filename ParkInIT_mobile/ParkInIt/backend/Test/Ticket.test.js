const request = require("supertest");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const BASE_URL = "http://127.0.0.1:3000";
const JWT_SECRET = process.env.JWT_SECRET || "parkinit_super_secret_2026";

const ADMIN_USER = {
  id: 1,
  email: "marko.horvat@parkinit.hr",
  role: "admin",
};

const NORMAL_USER = {
  id: 4,
  email: "m3225500eda@gmail.com",
  role: "user",
};

function tokenFor(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toMysqlDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

function futureRange(daysAhead = 10, startHour = 9, durationHours = 2) {
  const start = new Date();
  start.setDate(start.getDate() + daysAhead);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + durationHours);

  return {
    startSql: toMysqlDateTime(start),
    endSql: toMysqlDateTime(end),
    dateOnly: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(
      start.getDate()
    )}`,
  };
}

function uniqueRegistration(prefix = "TS") {
  const n = Math.floor(Math.random() * 900 + 100);
  const a = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const b = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}-${n}-${a}${b}`;
}

jest.setTimeout(30000);

beforeAll(async () => {
  await request(BASE_URL).get("/api/ping");
});

describe("REAL Admin Tickets API tests", () => {
  test(
    "GET /api/admin/tickets vraca listu ekarti za admina",
    async () => {
      const res = await request(BASE_URL)
        .get("/api/admin/tickets")
        .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const t1 = res.body.find((t) => t.Br_rezervacije === 1);
      const t2 = res.body.find((t) => t.Br_rezervacije === 2);
      const t3 = res.body.find((t) => t.Br_rezervacije === 3);

      expect(t1).toBeTruthy();
      expect(t2).toBeTruthy();
      expect(t3).toBeTruthy();

      expect(t1.Registracija).toBe("RI-123-AB");
      expect(t1.Ime_korisnika).toBe("Ivan");
      expect(t1.Prezime_korisnika).toBe("Perić");
      expect(t1.Adresa_parkinga).toBe("Ul. Ante Starčevića 1, Rijeka");

      expect(t2.Registracija).toBe("ZG-789-EF");
      expect(t3.Registracija).toBe("ZG-111-GH");
    },
    30000
  );

  test("GET /api/admin/tickets vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL).get("/api/admin/tickets");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });

  test("GET /api/admin/tickets vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/tickets")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("GET /api/admin/tickets?search=Ivan filtrira po imenu korisnika", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/tickets?search=Ivan")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    for (const ticket of res.body) {
      const fullName =
        `${ticket.Ime_korisnika || ""} ${ticket.Prezime_korisnika || ""}`.trim();
      expect(fullName).toMatch(/Ivan/i);
    }
  });

  test("GET /api/admin/tickets?date=2025-06-01 filtrira po datumu", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/tickets?date=2025-06-01")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    for (const ticket of res.body) {
      const dt = String(ticket.Vrijeme_pocetka);
      expect(dt.startsWith("2025-06-01")).toBe(true);
    }
  });

  test("GET /api/admin/tickets/:id/ekarta vraca e-kartu za postojecu rezervaciju", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/tickets/1/ekarta")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.brRezervacije).toBe(1);
    expect(res.body.bookingCode).toBeTruthy();
    expect(res.body.qrCode).toBeTruthy();

    expect(res.body.ekarta.vehicle).toBe("RI-123-AB");
    expect(res.body.ekarta.userName).toMatch(/Ivan Perić/i);
    expect(res.body.ekarta.parking).toBe("Ul. Ante Starčevića 1, Rijeka");
  });

  test("GET /api/admin/tickets/:id/ekarta vraca 400 za neispravan ID", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/tickets/abc/ekarta")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Neispravan ID",
    });
  });

  test("GET /api/admin/tickets/:id/ekarta vraca 404 za nepostojeci ID", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/tickets/999999/ekarta")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Nije pronadjeno",
    });
  });

  test("GET /api/admin/tickets/:id/ekarta vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/tickets/1/ekarta")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("GET /api/admin/users vraca listu korisnika za admina", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const u4 = res.body.find((u) => u.ID_korisnika === 4);
    const u5 = res.body.find((u) => u.ID_korisnika === 5);

    expect(u4).toBeTruthy();
    expect(u5).toBeTruthy();

    expect(u4.Ime_korisnika).toBe("Ivan");
    expect(u4.Prezime_korisnika).toBe("Perić");
    expect(u4.Email_adresa_korisnika).toBeTruthy();
    expect(u4.Email_adresa_korisnika).toContain("@");

    expect(u5.Ime_korisnika).toBe("Maja");
    expect(u5.Prezime_korisnika).toBe("Novak");
    expect(u5.Email_adresa_korisnika).toBeTruthy();
    expect(u5.Email_adresa_korisnika).toContain("@");
  });

  test("GET /api/admin/users vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("POST /api/admin/tickets/override vraca 400 ako fale polja", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/tickets/override")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        userId: 4,
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error:
        "userId, spaceNumber, startDateTime, endDateTime i vehicle su obavezni",
    });
  });

  test("POST /api/admin/tickets/override vraca 404 za nepostojec korisnik", async () => {
    const time = futureRange(30, 9, 2);

    const res = await request(BASE_URL)
      .post("/api/admin/tickets/override")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        userId: 999999,
        spaceNumber: 1,
        startDateTime: time.startSql,
        endDateTime: time.endSql,
        vehicle: "RI-123-AB",
        forceOverride: false,
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Korisnik nije pronađen",
    });
  });

  test("POST /api/admin/tickets/override vraca 404 za nepostojece parkirno mjesto", async () => {
    const time = futureRange(31, 9, 2);

    const res = await request(BASE_URL)
      .post("/api/admin/tickets/override")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        userId: 4,
        spaceNumber: 999999,
        startDateTime: time.startSql,
        endDateTime: time.endSql,
        vehicle: "RI-123-AB",
        forceOverride: false,
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Parkirno mjesto nije pronađeno",
    });
  });

  test("POST /api/admin/tickets/override vraca 409 za konflikt bez forceOverride", async () => {
    const time = futureRange(32, 9, 2);

    const parkingRes = await request(BASE_URL)
      .get("/api/parking/1/spaces")
      .query({
        start_time: time.startSql,
        end_time: time.endSql,
      });

    expect(parkingRes.status).toBe(200);
    expect(Array.isArray(parkingRes.body)).toBe(true);

    const freeSpace = parkingRes.body.find((s) => s.is_available === true);
    expect(freeSpace).toBeTruthy();

    const slot = freeSpace.Broj_parkirnog_mjesta;

    const firstRes = await request(BASE_URL)
      .post("/api/admin/tickets/override")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        userId: 4,
        spaceNumber: slot,
        startDateTime: time.startSql,
        endDateTime: time.endSql,
        vehicle: "RI-123-AB",
        forceOverride: false,
      });

    expect(firstRes.status).toBe(200);
    expect(firstRes.body.success).toBe(true);

    const secondRes = await request(BASE_URL)
      .post("/api/admin/tickets/override")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        userId: 5,
        spaceNumber: slot,
        startDateTime: time.startSql,
        endDateTime: time.endSql,
        vehicle: "ZG-789-EF",
        forceOverride: false,
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body).toEqual({
      error:
        "Parkirno mjesto je već rezervirano za taj period. Uključite Force Override da biste prepisali.",
    });
  });

  test(
    "POST /api/admin/tickets/override kreira override ticket s forceOverride=true",
    async () => {
      const time = futureRange(33, 9, 2);
      const vehicle = uniqueRegistration("OV");

      const res = await request(BASE_URL)
        .post("/api/admin/tickets/override")
        .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
        .send({
          userId: 4,
          spaceNumber: 11,
          startDateTime: time.startSql,
          endDateTime: time.endSql,
          vehicle,
          forceOverride: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bookingCode).toBeTruthy();
      expect(res.body.brRezervacije).toBeTruthy();
      expect(res.body.qrCode).toBeTruthy();

      expect(res.body.ekarta.spaceNumber).toBe(11);
      expect(res.body.ekarta.vehicle).toBe(vehicle);
      expect(res.body.ekarta.userId).toBe(4);
      expect(res.body.ekarta.statusRezervacije).toBe("placena");
      expect(res.body.ekarta.adminOverride).toBe(true);

      const ticketRes = await request(BASE_URL)
        .get(`/api/admin/tickets/${res.body.brRezervacije}/ekarta`)
        .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

      expect(ticketRes.status).toBe(200);
      expect(ticketRes.body.success).toBe(true);
      expect(ticketRes.body.brRezervacije).toBe(res.body.brRezervacije);
      expect(ticketRes.body.ekarta.vehicle).toBe(vehicle);
      expect(ticketRes.body.ekarta.adminOverride).toBe(true);
    },
    30000
  );

  test("POST /api/admin/tickets/override vraca 403 za obicnog usera", async () => {
    const time = futureRange(34, 9, 2);

    const res = await request(BASE_URL)
      .post("/api/admin/tickets/override")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .send({
        userId: 4,
        spaceNumber: 1,
        startDateTime: time.startSql,
        endDateTime: time.endSql,
        vehicle: "RI-123-AB",
        forceOverride: false,
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });
});