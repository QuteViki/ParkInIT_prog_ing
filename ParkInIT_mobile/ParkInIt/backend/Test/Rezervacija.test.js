const request = require("supertest");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const BASE_URL = "http://127.0.0.1:3000";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET nije postavljen u .env");
}

const USER_4 = {
  id: 4,
  email: "ivan.peric@gmail.com",
  role: "user",
};

const USER_5 = {
  id: 5,
  email: "maja.novak@gmail.com",
  role: "user",
};

function tokenFor(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toMysqlDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function futureRange(daysAhead = 7, startHour = 9, durationHours = 2) {
  const start = new Date();
  start.setDate(start.getDate() + daysAhead);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + durationHours);

  return {
    startSql: toMysqlDateTime(start),
    endSql: toMysqlDateTime(end),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

async function getFreeSlotForTime(parkingId, startIso, endIso) {
  const res = await request(BASE_URL).get(
    `/api/parking/${parkingId}/spaces?start_time=${encodeURIComponent(startIso)}&end_time=${encodeURIComponent(endIso)}`
  );

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);

  const free = res.body.find(
    (s) => s.Status_parkirnog_mjesta === "slobodno" && s.is_available === true
  );

  expect(free).toBeTruthy();
  return free.Broj_parkirnog_mjesta;
}

describe("REAL Reservations API tests", () => {
  test("GET /api/reservations vraca listu korisnikovih rezervacija", async () => {
    const res = await request(BASE_URL)
      .get("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const hasOwnReservation = res.body.some(
      (r) => r.Registracija === "RI-123-AB" || r.Registracija === "RI-456-CD"
    );

    expect(hasOwnReservation).toBe(true);
  });

  test("POST /api/reservations kreira novu rezervaciju", async () => {
    const time = futureRange(10, 9, 2);
    const slot = await getFreeSlotForTime(1, time.startIso, time.endIso);

    const res = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot,
        Registracija: "RI-123-AB",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Rezervacija uspješno kreirana");
    expect(typeof res.body.Br_rezervacije).toBe("number");
  });

  test("GET /api/reservations vraca novokreiranu rezervaciju korisnika", async () => {
    const time = futureRange(11, 10, 2);
    const slot = await getFreeSlotForTime(2, time.startIso, time.endIso);

    const createRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot,
        Registracija: "RI-456-CD",
      });

    expect(createRes.status).toBe(201);

    const listRes = await request(BASE_URL)
      .get("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    const found = listRes.body.find(
      (r) => r.Br_rezervacije === createRes.body.Br_rezervacije
    );

    expect(found).toBeTruthy();
    expect(found.Registracija).toBe("RI-456-CD");
    expect(found.Broj_parkirnog_mjesta).toBe(slot);
  });

  test("POST /api/reservations vraca 400 ako fale obavezna polja", async () => {
    const res = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: "",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error:
        "Vrijeme_pocetka, Vrijeme_isteka i Broj_parkirnog_mjesta su obavezni",
    });
  });

  test("POST /api/reservations vraca 400 za neispravan format vremena", async () => {
    const res = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: "nije-datum",
        Vrijeme_isteka: "takoder-nije-datum",
        Broj_parkirnog_mjesta: 1,
        Registracija: "RI-123-AB",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Neispravni format vremena",
    });
  });

  test("POST /api/reservations vraca 400 ako je kraj prije pocetka", async () => {
    const time = futureRange(12, 12, 2);

    const res = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.endSql,
        Vrijeme_isteka: time.startSql,
        Broj_parkirnog_mjesta: 1,
        Registracija: "RI-123-AB",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Vrijeme isteka mora biti nakon vremena početka",
    });
  });

  test("POST /api/reservations vraca 400 ako je rezervacija u proslosti", async () => {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(9, 0, 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    const res = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: toMysqlDateTime(start),
        Vrijeme_isteka: toMysqlDateTime(end),
        Broj_parkirnog_mjesta: 1,
        Registracija: "RI-123-AB",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Ne možete rezervirati parkirno mjesto u prošlosti",
    });
  });

  test("POST /api/reservations vraca 400 ako trajanje prelazi 24 sata", async () => {
    const start = new Date();
    start.setDate(start.getDate() + 13);
    start.setHours(8, 0, 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + 25);

    const res = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: toMysqlDateTime(start),
        Vrijeme_isteka: toMysqlDateTime(end),
        Broj_parkirnog_mjesta: 1,
        Registracija: "RI-123-AB",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Maksimalno trajanje rezervacije je 24 sata",
    });
  });

  test("POST /api/reservations vraca 400 ako Broj_parkirnog_mjesta nije broj", async () => {
    const time = futureRange(14, 9, 2);

    const res = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: "abc",
        Registracija: "RI-123-AB",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Broj_parkirnog_mjesta mora biti broj",
    });
  });

  test("POST /api/reservations vraca 404 za nepostojece parkirno mjesto", async () => {
    const time = futureRange(15, 9, 2);

    const res = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: 99999,
        Registracija: "RI-123-AB",
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Parkirno mjesto nije pronađeno",
    });
  });

  test("POST /api/reservations vraca 400 za vec zauzeto ili rezervirano mjesto po statusu", async () => {
    const time = futureRange(16, 9, 2);

    const res = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: 3,
        Registracija: "RI-123-AB",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Parkirno mjesto je zauzeto ili rezervirano",
    });
  });

  test("POST /api/reservations vraca 409 ako isto vozilo vec ima rezervaciju u tom periodu", async () => {
    const time = futureRange(17, 9, 2);
    const slot1 = await getFreeSlotForTime(1, time.startIso, time.endIso);
    const slot2 = await getFreeSlotForTime(2, time.startIso, time.endIso);

    const firstRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot1,
        Registracija: "RI-123-AB",
      });

    expect(firstRes.status).toBe(201);

    const secondRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot2,
        Registracija: "RI-123-AB",
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error).toMatch(/već ima rezervaciju za taj period/i);
  });

  test("POST /api/reservations vraca 409 za dupli booking istog mjesta u istom terminu", async () => {
    const time = futureRange(18, 9, 2);
    const slot = await getFreeSlotForTime(3, time.startIso, time.endIso);

    const firstRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot,
        Registracija: "RI-123-AB",
      });

    expect(firstRes.status).toBe(201);

    const secondRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_5)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot,
        Registracija: "ZG-789-EF",
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body).toEqual({
      error: "Parkirno mjesto je već rezervirano za odabrani vremenski period",
    });
  });

  test("GET /api/reservations/:id/ekarta vraca e-kartu za korisnikovu rezervaciju", async () => {
    const res = await request(BASE_URL)
      .get("/api/reservations/1/ekarta")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.brRezervacije).toBe(1);
    expect(res.body.bookingCode).toBeTruthy();
    expect(res.body.qrCode).toBeTruthy();
    expect(res.body.ekarta.vehicle).toBe("RI-123-AB");
  });

  test("GET /api/reservations/:id/ekarta vraca 404 za tudju ili nepostojecu rezervaciju", async () => {
    const res = await request(BASE_URL)
      .get("/api/reservations/1/ekarta")
      .set("Authorization", `Bearer ${tokenFor(USER_5)}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Rezervacija nije pronađena",
    });
  });

  test("PUT /api/reservations/:id azurira korisnikovu rezervaciju", async () => {
    const createTime = futureRange(21, 9, 2);
    const slot = await getFreeSlotForTime(3, createTime.startIso, createTime.endIso);

    const createRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: createTime.startSql,
        Vrijeme_isteka: createTime.endSql,
        Broj_parkirnog_mjesta: slot,
        Registracija: "RI-456-CD",
      });

    expect(createRes.status).toBe(201);

    const newTime = futureRange(21, 13, 2);

    const updateRes = await request(BASE_URL)
      .put(`/api/reservations/${createRes.body.Br_rezervacije}`)
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: newTime.startSql,
        Vrijeme_isteka: newTime.endSql,
        Broj_parkirnog_mjesta: slot,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toEqual({ success: true });
  });

  test("PUT /api/reservations/:id vraca 403 za tudju rezervaciju", async () => {
    const time = futureRange(22, 9, 2);

    const res = await request(BASE_URL)
      .put("/api/reservations/1")
      .set("Authorization", `Bearer ${tokenFor(USER_5)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: 3,
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Nemate dozvolu za ovu akciju",
    });
  });

  test("PATCH /api/reservations/:id/cancel otkazuje aktivnu rezervaciju", async () => {
    const time = futureRange(23, 9, 2);
    const slot = await getFreeSlotForTime(2, time.startIso, time.endIso);

    const createRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot,
        Registracija: "RI-123-AB",
      });

    expect(createRes.status).toBe(201);

    const cancelRes = await request(BASE_URL)
      .patch(`/api/reservations/${createRes.body.Br_rezervacije}/cancel`)
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body).toEqual({ success: true });
  });

  test("PATCH /api/reservations/:id/cancel vraca 403 za tudju rezervaciju", async () => {
    const time = futureRange(24, 9, 2);
    const slot = await getFreeSlotForTime(3, time.startIso, time.endIso);

    const createRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot,
        Registracija: "RI-456-CD",
      });

    expect(createRes.status).toBe(201);

    const cancelRes = await request(BASE_URL)
      .patch(`/api/reservations/${createRes.body.Br_rezervacije}/cancel`)
      .set("Authorization", `Bearer ${tokenFor(USER_5)}`);

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body).toEqual({
      error: "Nemate dozvolu za ovu akciju",
    });
  });

  test("DELETE /api/reservations/:id brise korisnikovu rezervaciju", async () => {
    const time = futureRange(25, 9, 2);
    const slot = await getFreeSlotForTime(1, time.startIso, time.endIso);

    const createRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot,
        Registracija: "RI-123-AB",
      });

    expect(createRes.status).toBe(201);

    const deleteRes = await request(BASE_URL)
      .delete(`/api/reservations/${createRes.body.Br_rezervacije}`)
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({ success: true });
  });

  test("DELETE /api/reservations/:id vraca 403 za tudju rezervaciju", async () => {
    const time = futureRange(26, 9, 2);
    const slot = await getFreeSlotForTime(2, time.startIso, time.endIso);

    const createRes = await request(BASE_URL)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${tokenFor(USER_4)}`)
      .send({
        Vrijeme_pocetka: time.startSql,
        Vrijeme_isteka: time.endSql,
        Broj_parkirnog_mjesta: slot,
        Registracija: "RI-456-CD",
      });

    expect(createRes.status).toBe(201);

    const deleteRes = await request(BASE_URL)
      .delete(`/api/reservations/${createRes.body.Br_rezervacije}`)
      .set("Authorization", `Bearer ${tokenFor(USER_5)}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body).toEqual({
      error: "Nemate dozvolu za ovu akciju",
    });
  });

  test("GET /api/reservations vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL).get("/api/reservations");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });
});