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
  email: "ivan.peric@gmail.com",
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

jest.setTimeout(15000);

describe("REAL Admin Rampa API tests", () => {
  test("GET /api/admin/rampa vraca sve rampe za admina", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(6);

    const r1 = res.body.find((r) => r.Sifra_rampe === 1);
    const r2 = res.body.find((r) => r.Sifra_rampe === 2);
    const r3 = res.body.find((r) => r.Sifra_rampe === 3);
    const r4 = res.body.find((r) => r.Sifra_rampe === 4);
    const r5 = res.body.find((r) => r.Sifra_rampe === 5);
    const r6 = res.body.find((r) => r.Sifra_rampe === 6);

    expect(r1).toBeTruthy();
    expect(r2).toBeTruthy();
    expect(r3).toBeTruthy();
    expect(r4).toBeTruthy();
    expect(r5).toBeTruthy();
    expect(r6).toBeTruthy();

    expect(r1.Sifra_parkinga).toBe(1);
    expect(r1.Vrsta_rampe).toBe("ulazna");
    expect(r1.Status_rampe).toBe("zatvorena");
    expect(r1.Adresa_parkinga).toBe("Ul. Ante Starčevića 1, Rijeka");

    expect(r2.Sifra_parkinga).toBe(1);
    expect(r2.Vrsta_rampe).toBe("izlazna");
    expect(r2.Status_rampe).toBe("zatvorena");

    expect(r3.Sifra_parkinga).toBe(2);
    expect(r3.Vrsta_rampe).toBe("ulazna");
    expect(r3.Status_rampe).toBe("zatvorena");
    expect(r3.Adresa_parkinga).toBe("Korzo 2, Rijeka");

    expect(r4.Sifra_parkinga).toBe(2);
    expect(r4.Vrsta_rampe).toBe("izlazna");
    expect(r4.Status_rampe).toBe("zatvorena");

    expect(r5.Sifra_parkinga).toBe(3);
    expect(r5.Vrsta_rampe).toBe("ulazna");
    expect(r5.Status_rampe).toBe("zatvorena");
    expect(r5.Adresa_parkinga).toBe("Ul. Ružićeva 5, Rijeka");

    expect(r6.Sifra_parkinga).toBe(3);
    expect(r6.Vrsta_rampe).toBe("izlazna");
    expect(r6.Status_rampe).toBe("zatvorena");
  });

  test("GET /api/admin/rampa vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL).get("/api/admin/rampa");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });

  test("GET /api/admin/rampa vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("POST /api/admin/rampa kreira novu rampu", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Sifra_parkinga: 1,
        Vrsta_rampe: "ulazna",
        Status_rampe: "zatvorena",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.Sifra_rampe).toBe("number");

    const listRes = await request(BASE_URL)
      .get("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(listRes.status).toBe(200);

    const created = listRes.body.find(
      (r) => r.Sifra_rampe === res.body.Sifra_rampe
    );

    expect(created).toBeTruthy();
    expect(created.Sifra_parkinga).toBe(1);
    expect(created.Vrsta_rampe).toBe("ulazna");
    expect(created.Status_rampe).toBe("zatvorena");
  });

  test("POST /api/admin/rampa vraca 400 ako fale obavezna polja", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Sifra_parkinga: null,
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Sifra_parkinga i Vrsta_rampe su obavezni",
    });
  });

  test("POST /api/admin/rampa vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .send({
        Sifra_parkinga: 1,
        Vrsta_rampe: "ulazna",
        Status_rampe: "zatvorena",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("PUT /api/admin/rampa/:id azurira rampu", async () => {
    const createRes = await request(BASE_URL)
      .post("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Sifra_parkinga: 2,
        Vrsta_rampe: "ulazna",
        Status_rampe: "zatvorena",
      });

    expect(createRes.status).toBe(201);

    const updateRes = await request(BASE_URL)
      .put(`/api/admin/rampa/${createRes.body.Sifra_rampe}`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Sifra_parkinga: 3,
        Vrsta_rampe: "izlazna",
        Status_rampe: "otvorena",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toEqual({
      success: true,
    });

    const listRes = await request(BASE_URL)
      .get("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const updated = listRes.body.find(
      (r) => r.Sifra_rampe === createRes.body.Sifra_rampe
    );

    expect(updated).toBeTruthy();
    expect(updated.Sifra_parkinga).toBe(3);
    expect(updated.Vrsta_rampe).toBe("izlazna");
    expect(updated.Status_rampe).toBe("otvorena");
  });

  test("PUT /api/admin/rampa/:id vraca 400 ako fale polja", async () => {
    const res = await request(BASE_URL)
      .put("/api/admin/rampa/1")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Sifra_parkinga: null,
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Sva polja su obavezna",
    });
  });

  test("PUT /api/admin/rampa/:id vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .put("/api/admin/rampa/1")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .send({
        Sifra_parkinga: 1,
        Vrsta_rampe: "ulazna",
        Status_rampe: "otvorena",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("DELETE /api/admin/rampa/:id brise rampu", async () => {
    const createRes = await request(BASE_URL)
      .post("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Sifra_parkinga: 2,
        Vrsta_rampe: "izlazna",
        Status_rampe: "zatvorena",
      });

    expect(createRes.status).toBe(201);

    const deleteRes = await request(BASE_URL)
      .delete(`/api/admin/rampa/${createRes.body.Sifra_rampe}`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({
      success: true,
    });

    const listRes = await request(BASE_URL)
      .get("/api/admin/rampa")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const found = listRes.body.find(
      (r) => r.Sifra_rampe === createRes.body.Sifra_rampe
    );

    expect(found).toBeUndefined();
  });

  test("DELETE /api/admin/rampa/:id vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .delete("/api/admin/rampa/1")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });
});