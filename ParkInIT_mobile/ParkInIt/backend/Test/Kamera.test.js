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

jest.setTimeout(30000);

beforeAll(async () => {
  await request(BASE_URL).get("/api/ping");
});

describe("REAL Admin Kamera API tests", () => {
  test(
    "GET /api/admin/kamera vraca sve kamere za admina",
    async () => {
      const res = await request(BASE_URL)
        .get("/api/admin/kamera")
        .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(10);

      const k1 = res.body.find((k) => k.Sifra_kamere === 1);
      const k4 = res.body.find((k) => k.Sifra_kamere === 4);
      const k6 = res.body.find((k) => k.Sifra_kamere === 6);
      const k10 = res.body.find((k) => k.Sifra_kamere === 10);

      expect(k1).toBeTruthy();
      expect(k4).toBeTruthy();
      expect(k6).toBeTruthy();
      expect(k10).toBeTruthy();

      expect(k1.Status_kamere).toBe("on");
      expect(k4.Status_kamere).toBe("idle");
      expect(k6.Status_kamere).toBe("off");
      expect(k10.Status_kamere).toBe("idle");
    },
    30000
  );

  test("GET /api/admin/kamera vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL).get("/api/admin/kamera");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });

  test("GET /api/admin/kamera vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("POST /api/admin/kamera kreira novu kameru s default statusom on", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.Sifra_kamere).toBe("number");

    const listRes = await request(BASE_URL)
      .get("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const created = listRes.body.find(
      (k) => k.Sifra_kamere === res.body.Sifra_kamere
    );

    expect(created).toBeTruthy();
    expect(created.Status_kamere).toBe("on");
  });

  test("POST /api/admin/kamera kreira novu kameru s poslanim statusom", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Status_kamere: "idle",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.Sifra_kamere).toBe("number");

    const listRes = await request(BASE_URL)
      .get("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const created = listRes.body.find(
      (k) => k.Sifra_kamere === res.body.Sifra_kamere
    );

    expect(created).toBeTruthy();
    expect(created.Status_kamere).toBe("idle");
  });

  test("POST /api/admin/kamera vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .send({
        Status_kamere: "on",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("PUT /api/admin/kamera/:id azurira status kamere", async () => {
    const createRes = await request(BASE_URL)
      .post("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Status_kamere: "on",
      });

    expect(createRes.status).toBe(201);

    const updateRes = await request(BASE_URL)
      .put(`/api/admin/kamera/${createRes.body.Sifra_kamere}`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Status_kamere: "off",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toEqual({
      success: true,
    });

    const listRes = await request(BASE_URL)
      .get("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const updated = listRes.body.find(
      (k) => k.Sifra_kamere === createRes.body.Sifra_kamere
    );

    expect(updated).toBeTruthy();
    expect(updated.Status_kamere).toBe("off");
  });

  test("PUT /api/admin/kamera/:id vraca 400 ako Status_kamere nije poslan", async () => {
    const res = await request(BASE_URL)
      .put("/api/admin/kamera/1")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Status_kamere je obavezan",
    });
  });

  test("PUT /api/admin/kamera/:id vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .put("/api/admin/kamera/1")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .send({
        Status_kamere: "off",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("DELETE /api/admin/kamera/:id brise kameru", async () => {
    const createRes = await request(BASE_URL)
      .post("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Status_kamere: "idle",
      });

    expect(createRes.status).toBe(201);

    const deleteRes = await request(BASE_URL)
      .delete(`/api/admin/kamera/${createRes.body.Sifra_kamere}`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({
      success: true,
    });

    const listRes = await request(BASE_URL)
      .get("/api/admin/kamera")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const found = listRes.body.find(
      (k) => k.Sifra_kamere === createRes.body.Sifra_kamere
    );

    expect(found).toBeUndefined();
  });

  test("DELETE /api/admin/kamera/:id vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .delete("/api/admin/kamera/1")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });
});