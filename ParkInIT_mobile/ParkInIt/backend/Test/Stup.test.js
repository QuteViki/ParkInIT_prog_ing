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

describe("REAL Admin Stup API tests", () => {
  test(
    "GET /api/admin/stup vraca sve stupove za admina",
    async () => {
      const res = await request(BASE_URL)
        .get("/api/admin/stup")
        .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(10);

      const s1 = res.body.find((s) => s.Sifra_stupa === 1);
      const s5 = res.body.find((s) => s.Sifra_stupa === 5);
      const s8 = res.body.find((s) => s.Sifra_stupa === 8);
      const s10 = res.body.find((s) => s.Sifra_stupa === 10);

      expect(s1).toBeTruthy();
      expect(s5).toBeTruthy();
      expect(s8).toBeTruthy();
      expect(s10).toBeTruthy();

      expect(s1.Status_stupa).toBe("aktivan");
      expect(s5.Status_stupa).toBe("kvar");
      expect(s8.Status_stupa).toBe("neaktivan");
      expect(s10.Status_stupa).toBe("aktivan");
    },
    30000
  );

  test("GET /api/admin/stup vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL).get("/api/admin/stup");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });

  test("GET /api/admin/stup vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("POST /api/admin/stup kreira novi stup s default statusom aktivan", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.Sifra_stupa).toBe("number");

    const listRes = await request(BASE_URL)
      .get("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const created = listRes.body.find(
      (s) => s.Sifra_stupa === res.body.Sifra_stupa
    );

    expect(created).toBeTruthy();
    expect(created.Status_stupa).toBe("aktivan");
  });

  test("POST /api/admin/stup kreira novi stup s poslanim statusom", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Status_stupa: "kvar",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.Sifra_stupa).toBe("number");

    const listRes = await request(BASE_URL)
      .get("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const created = listRes.body.find(
      (s) => s.Sifra_stupa === res.body.Sifra_stupa
    );

    expect(created).toBeTruthy();
    expect(created.Status_stupa).toBe("kvar");
  });

  test("POST /api/admin/stup vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .send({
        Status_stupa: "aktivan",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("PUT /api/admin/stup/:id azurira status stupa", async () => {
    const createRes = await request(BASE_URL)
      .post("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Status_stupa: "aktivan",
      });

    expect(createRes.status).toBe(201);

    const updateRes = await request(BASE_URL)
      .put(`/api/admin/stup/${createRes.body.Sifra_stupa}`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Status_stupa: "neaktivan",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toEqual({
      success: true,
    });

    const listRes = await request(BASE_URL)
      .get("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const updated = listRes.body.find(
      (s) => s.Sifra_stupa === createRes.body.Sifra_stupa
    );

    expect(updated).toBeTruthy();
    expect(updated.Status_stupa).toBe("neaktivan");
  });

  test("PUT /api/admin/stup/:id vraca 400 ako Status_stupa nije poslan", async () => {
    const res = await request(BASE_URL)
      .put("/api/admin/stup/1")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Status_stupa je obavezan",
    });
  });

  test("PUT /api/admin/stup/:id vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .put("/api/admin/stup/1")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .send({
        Status_stupa: "kvar",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("DELETE /api/admin/stup/:id brise stup", async () => {
    const createRes = await request(BASE_URL)
      .post("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`)
      .send({
        Status_stupa: "aktivan",
      });

    expect(createRes.status).toBe(201);

    const deleteRes = await request(BASE_URL)
      .delete(`/api/admin/stup/${createRes.body.Sifra_stupa}`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({
      success: true,
    });

    const listRes = await request(BASE_URL)
      .get("/api/admin/stup")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    const found = listRes.body.find(
      (s) => s.Sifra_stupa === createRes.body.Sifra_stupa
    );

    expect(found).toBeUndefined();
  });

  test("DELETE /api/admin/stup/:id vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .delete("/api/admin/stup/1")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });
});