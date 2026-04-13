const request = require("supertest");
const crypto = require("crypto");

const BASE_URL = "http://127.0.0.1:3000";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${crypto.randomInt(100000, 999999)}@example.com`;
}

function uniqueOib() {
  let result = "";
  for (let i = 0; i < 11; i++) {
    result += crypto.randomInt(0, 10).toString();
  }
  return result;
}

function uniquePhone() {
  let result = "09";
  for (let i = 0; i < 8; i++) {
    result += crypto.randomInt(0, 10).toString();
  }
  return result;
}

function uniqueRegistration(prefix = "RI") {
  return `${prefix}-${crypto.randomInt(100, 999)}-${String.fromCharCode(
    crypto.randomInt(65, 91)
  )}${String.fromCharCode(crypto.randomInt(65, 91))}`;
}

async function registerAndLogin(label) {
  const email = uniqueEmail(`vozilo.${label}`);
  const password = "12345678";

  const registerRes = await request(BASE_URL)
    .post("/api/auth/register")
    .send({
      firstName: "Test",
      lastName: `User_${label}`,
      personalId: uniqueOib(),
      phone: uniquePhone(),
      email,
      password,
    });

  expect(registerRes.status).toBe(201);

  const loginRes = await request(BASE_URL)
    .post("/api/auth/login")
    .send({
      email,
      password,
    });

  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toBeTruthy();

  return {
    token: loginRes.body.token,
    user: loginRes.body.user,
    email,
    password,
  };
}

describe("REAL Vehicle API tests", () => {
  test("GET /api/user/vehicles vraca praznu listu za novog korisnika", async () => {
    const auth = await registerAndLogin("get-empty");

    const res = await request(BASE_URL)
      .get("/api/user/vehicles")
      .set("Authorization", `Bearer ${auth.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual([]);
  });

  test("POST /api/user/vehicles dodaje novo vozilo", async () => {
    const auth = await registerAndLogin("add-vehicle");
    const registracija = uniqueRegistration();

    const res = await request(BASE_URL)
      .post("/api/user/vehicles")
      .set("Authorization", `Bearer ${auth.token}`)
      .send({
        registracija,
        marka: "Volkswagen",
        tip: "Golf 7",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      registracija: registracija.toUpperCase(),
    });
  });

  test("GET /api/user/vehicles vraca dodano vozilo", async () => {
    const auth = await registerAndLogin("get-after-add");
    const registracija = uniqueRegistration();

    const addRes = await request(BASE_URL)
      .post("/api/user/vehicles")
      .set("Authorization", `Bearer ${auth.token}`)
      .send({
        registracija,
        marka: "Audi",
        tip: "A3",
      });

    expect(addRes.status).toBe(201);

    const getRes = await request(BASE_URL)
      .get("/api/user/vehicles")
      .set("Authorization", `Bearer ${auth.token}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);

    const found = getRes.body.find(
      (v) => v.registracija === registracija.toUpperCase()
    );

    expect(found).toBeTruthy();
    expect(found).toEqual({
      registracija: registracija.toUpperCase(),
      marka: "Audi",
      tip: "A3",
    });
  });

  test("POST /api/user/vehicles vraca 400 ako fale registracija ili marka", async () => {
    const auth = await registerAndLogin("validation");

    const res = await request(BASE_URL)
      .post("/api/user/vehicles")
      .set("Authorization", `Bearer ${auth.token}`)
      .send({
        registracija: "",
        marka: "",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Registracija i marka su obavezni",
    });
  });

  test("POST /api/user/vehicles vraca 409 za duplu registraciju", async () => {
    const auth = await registerAndLogin("duplicate");
    const registracija = uniqueRegistration();

    const firstRes = await request(BASE_URL)
      .post("/api/user/vehicles")
      .set("Authorization", `Bearer ${auth.token}`)
      .send({
        registracija,
        marka: "BMW",
        tip: "320d",
      });

    expect(firstRes.status).toBe(201);

    const secondRes = await request(BASE_URL)
      .post("/api/user/vehicles")
      .set("Authorization", `Bearer ${auth.token}`)
      .send({
        registracija,
        marka: "BMW",
        tip: "320d",
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body).toEqual({
      error: "Vozilo s tom registracijom već postoji",
    });
  });

  test("DELETE /api/user/vehicles/:registration brise vozilo", async () => {
    const auth = await registerAndLogin("delete-ok");
    const registracija = uniqueRegistration();

    const addRes = await request(BASE_URL)
      .post("/api/user/vehicles")
      .set("Authorization", `Bearer ${auth.token}`)
      .send({
        registracija,
        marka: "Skoda",
        tip: "Octavia",
      });

    expect(addRes.status).toBe(201);

    const deleteRes = await request(BASE_URL)
      .delete(`/api/user/vehicles/${encodeURIComponent(registracija)}`)
      .set("Authorization", `Bearer ${auth.token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({ success: true });

    const getRes = await request(BASE_URL)
      .get("/api/user/vehicles")
      .set("Authorization", `Bearer ${auth.token}`);

    expect(getRes.status).toBe(200);

    const found = getRes.body.find(
      (v) => v.registracija === registracija.toUpperCase()
    );

    expect(found).toBeUndefined();
  });

  test("DELETE /api/user/vehicles/:registration vraca 404 ako vozilo ne postoji", async () => {
    const auth = await registerAndLogin("delete-missing");

    const res = await request(BASE_URL)
      .delete(`/api/user/vehicles/${encodeURIComponent(uniqueRegistration("ZZ"))}`)
      .set("Authorization", `Bearer ${auth.token}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Vozilo nije pronađeno",
    });
  });

  test("GET /api/user/vehicles vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL).get("/api/user/vehicles");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });

  test("POST /api/user/vehicles vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL)
      .post("/api/user/vehicles")
      .send({
        registracija: uniqueRegistration(),
        marka: "Ford",
        tip: "Focus",
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });

  test("DELETE /api/user/vehicles/:registration vraca 401 bez tokena", async () => {
    const res = await request(BASE_URL)
      .delete(`/api/user/vehicles/${encodeURIComponent(uniqueRegistration())}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "unauthorized",
    });
  });
});