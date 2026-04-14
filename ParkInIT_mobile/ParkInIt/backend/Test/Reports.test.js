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

function fakeImageBuffer() {
  // Minimal PNG header-ish content, dovoljno za upload test
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
}

jest.setTimeout(30000);

beforeAll(async () => {
  await request(BASE_URL).get("/api/ping");
});

describe("REAL Reports API tests", () => {
  test("POST /api/reports kreira report s pravim podacima", async () => {
    const res = await request(BASE_URL)
      .post("/api/reports")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .field("parking_id", "1")
      .field("description", "Test report upload")
      .field("latitude", "45.3271")
      .field("longitude", "14.4422")
      .attach("image", fakeImageBuffer(), {
        filename: "report.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.id).toBe("number");
  });

  test("POST /api/reports vraca 400 ako parking_id nije poslan", async () => {
    const res = await request(BASE_URL)
      .post("/api/reports")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .field("description", "Missing parking id")
      .attach("image", fakeImageBuffer(), {
        filename: "report.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "parking_id je obavezan",
    });
  });

  test("POST /api/reports vraca 400 ako image nije poslana", async () => {
    const res = await request(BASE_URL)
      .post("/api/reports")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .field("parking_id", "1")
      .field("description", "No image");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "image je obavezna",
    });
  });

  test("POST /api/reports vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL)
      .post("/api/reports")
      .field("parking_id", "1")
      .attach("image", fakeImageBuffer(), {
        filename: "report.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });

  test("GET /api/reports vraca listu reportova adminu", async () => {
    // prvo kreiraj jedan report da imamo svjez podatak
    const createRes = await request(BASE_URL)
      .post("/api/reports")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .field("parking_id", "2")
      .field("description", "Admin list test")
      .field("latitude", "45.3300")
      .field("longitude", "14.4400")
      .attach("image", fakeImageBuffer(), {
        filename: "admin-list.png",
        contentType: "image/png",
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);

    const res = await request(BASE_URL)
      .get("/api/reports")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const found = res.body.find((r) => r.id === createRes.body.id);
    expect(found).toBeTruthy();
    expect(String(found.parking_id)).toBe("2");
    expect(found.description).toBe("Admin list test");
  });

  test("GET /api/reports vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL).get("/api/reports");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });

  test("GET /api/reports vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .get("/api/reports")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("GET /api/reports/:id/image vraca sliku reporta adminu", async () => {
    const createRes = await request(BASE_URL)
      .post("/api/reports")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .field("parking_id", "3")
      .field("description", "Image fetch test")
      .attach("image", fakeImageBuffer(), {
        filename: "fetch-image.png",
        contentType: "image/png",
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);

    const res = await request(BASE_URL)
      .get(`/api/reports/${createRes.body.id}/image`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/png|image\/jpeg/);
    expect(res.body).toBeTruthy();
  });

  test("GET /api/reports/:id/image vraca 404 za nepostojeci report", async () => {
    const res = await request(BASE_URL)
      .get("/api/reports/999999/image")
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(res.status).toBe(404);
  });

  test("GET /api/reports/:id/image vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .get("/api/reports/1/image")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("DELETE /api/reports/:id brise report adminu", async () => {
    const createRes = await request(BASE_URL)
      .post("/api/reports")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`)
      .field("parking_id", "1")
      .field("description", "Delete report test")
      .attach("image", fakeImageBuffer(), {
        filename: "delete-image.png",
        contentType: "image/png",
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);

    const deleteRes = await request(BASE_URL)
      .delete(`/api/reports/${createRes.body.id}`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({
      success: true,
    });

    const imageRes = await request(BASE_URL)
      .get(`/api/reports/${createRes.body.id}/image`)
      .set("Authorization", `Bearer ${tokenFor(ADMIN_USER)}`);

    expect(imageRes.status).toBe(404);
  });

  test("DELETE /api/reports/:id vraca 403 za obicnog usera", async () => {
    const res = await request(BASE_URL)
      .delete("/api/reports/1")
      .set("Authorization", `Bearer ${tokenFor(NORMAL_USER)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "forbidden",
    });
  });

  test("DELETE /api/reports/:id vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL).delete("/api/reports/1");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });
});