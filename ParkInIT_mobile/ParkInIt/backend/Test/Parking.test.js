const request = require("supertest");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const BASE_URL = "http://127.0.0.1:3000";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET nije postavljen u .env");
}

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
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function uniqueAddress() {
  return `Test Ulica ${Date.now()} ${Math.floor(Math.random() * 10000)}, Rijeka`;
}

describe("REAL Admin Parking API tests", () => {
  test("GET /api/admin/parking vraca sva parking mjesta za admina", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);

    const p1 = res.body.find((p) => p.Sifra_parkinga === 1);
    const p2 = res.body.find((p) => p.Sifra_parkinga === 2);
    const p3 = res.body.find((p) => p.Sifra_parkinga === 3);

    expect(p1).toBeTruthy();
    expect(p2).toBeTruthy();
    expect(p3).toBeTruthy();

    expect(p1.Adresa_parkinga).toBe("Ul. Ante Starčevića 1, Rijeka");
    expect(Number(p1.Kapacitet_parkinga)).toBe(120);
    expect(Number(p1.Cijena_parkinga)).toBe(1.5);

    expect(p2.Adresa_parkinga).toBe("Korzo 2, Rijeka");
    expect(Number(p2.Kapacitet_parkinga)).toBe(80);
    expect(Number(p2.Cijena_parkinga)).toBe(2.0);

    expect(p3.Adresa_parkinga).toBe("Ul. Ružićeva 5, Rijeka");
    expect(Number(p3.Kapacitet_parkinga)).toBe(60);
    expect(Number(p3.Cijena_parkinga)).toBe(1.2);
  });

  test("GET /api/admin/parking vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL).get("/api/admin/parking");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });

  test("GET /api/admin/parking vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("POST /api/admin/parking kreira novi parking", async () => {
    const adresa = uniqueAddress();

    const res = await request(BASE_URL)
      .post("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Adresa_parkinga: adresa,
        Kapacitet_parkinga: 50,
        Cijena_parkinga: 2.5,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.Sifra_parkinga).toBe("number");

    const listRes = await request(BASE_URL)
      .get("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(listRes.status).toBe(200);

    const created = listRes.body.find(
      (p) => p.Sifra_parkinga === res.body.Sifra_parkinga
    );

    expect(created).toBeTruthy();
    expect(created.Adresa_parkinga).toBe(adresa);
    expect(Number(created.Kapacitet_parkinga)).toBe(50);
    expect(Number(created.Cijena_parkinga)).toBe(2.5);
  });

  test("POST /api/admin/parking vraca 400 ako fale polja", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Adresa_parkinga: "",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Adresa_parkinga, Kapacitet_parkinga i Cijena_parkinga su obavezni",
    });
  });

  test("POST /api/admin/parking vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .send({
        Adresa_parkinga: uniqueAddress(),
        Kapacitet_parkinga: 25,
        Cijena_parkinga: 1.8,
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("PUT /api/admin/parking/:id azurira parking", async () => {
    const adresa = uniqueAddress();

    const createRes = await request(BASE_URL)
      .post("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Adresa_parkinga: adresa,
        Kapacitet_parkinga: 40,
        Cijena_parkinga: 2.2,
      });

    expect(createRes.status).toBe(201);

    const updatedAddress = `${adresa} - UPDATE`;

    const updateRes = await request(BASE_URL)
      .put(`/api/admin/parking/${createRes.body.Sifra_parkinga}`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Adresa_parkinga: updatedAddress,
        Kapacitet_parkinga: 55,
        Cijena_parkinga: 3.1,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toEqual({
      success: true,
    });

    const listRes = await request(BASE_URL)
      .get("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const updated = listRes.body.find(
      (p) => p.Sifra_parkinga === createRes.body.Sifra_parkinga
    );

    expect(updated).toBeTruthy();
    expect(updated.Adresa_parkinga).toBe(updatedAddress);
    expect(Number(updated.Kapacitet_parkinga)).toBe(55);
    expect(Number(updated.Cijena_parkinga)).toBe(3.1);
  });

  test("PUT /api/admin/parking/:id vraca 400 ako fale polja", async () => {
    const res = await request(BASE_URL)
      .put("/api/admin/parking/1")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Adresa_parkinga: "",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Sva polja su obavezna",
    });
  });

  test("PUT /api/admin/parking/:id vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .put("/api/admin/parking/1")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .send({
        Adresa_parkinga: "Nova adresa",
        Kapacitet_parkinga: 10,
        Cijena_parkinga: 1.1,
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("DELETE /api/admin/parking/:id brise parking", async () => {
    const createRes = await request(BASE_URL)
      .post("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Adresa_parkinga: uniqueAddress(),
        Kapacitet_parkinga: 33,
        Cijena_parkinga: 2.9,
      });

    expect(createRes.status).toBe(201);

    const deleteRes = await request(BASE_URL)
      .delete(`/api/admin/parking/${createRes.body.Sifra_parkinga}`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({
      success: true,
    });

    const listRes = await request(BASE_URL)
      .get("/api/admin/parking")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const found = listRes.body.find(
      (p) => p.Sifra_parkinga === createRes.body.Sifra_parkinga
    );

    expect(found).toBeUndefined();
  });

  test("DELETE /api/admin/parking/:id vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .delete("/api/admin/parking/1")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });
});