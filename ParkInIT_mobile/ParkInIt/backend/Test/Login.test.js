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

describe("REAL Auth API tests", () => {
  test("register treba kreirati pravog korisnika u bazi", async () => {
    const res = await request(BASE_URL)
      .post("/api/auth/register")
      .send({
        firstName: "Unit",
        lastName: "Register",
        personalId: uniqueOib(),
        phone: uniquePhone(),
        email: uniqueEmail("unit.register"),
        password: "12345678",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      message: "Account created",
    });
  });

  test("login treba raditi s pravim korisnikom iz baze", async () => {
    const email = uniqueEmail("unit.login");
    const password = "12345678";

    const registerRes = await request(BASE_URL)
      .post("/api/auth/register")
      .send({
        firstName: "Unit",
        lastName: "Login",
        personalId: uniqueOib(),
        phone: uniquePhone(),
        email: email,
        password: password,
      });

    expect(registerRes.status).toBe(201);

    const res = await request(BASE_URL)
      .post("/api/auth/login")
      .send({
        email: email,
        password: password,
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toBeTruthy();
    expect(res.body.user.email).toBe(email.toLowerCase());
  });

  test("login treba vratiti 401 za krivu lozinku", async () => {
    const email = uniqueEmail("unit.wrongpass");

    const registerRes = await request(BASE_URL)
      .post("/api/auth/register")
      .send({
        firstName: "Unit",
        lastName: "WrongPass",
        personalId: uniqueOib(),
        phone: uniquePhone(),
        email: email,
        password: "12345678",
      });

    expect(registerRes.status).toBe(201);

    const res = await request(BASE_URL)
      .post("/api/auth/login")
      .send({
        email: email,
        password: "kriva_lozinka_123",
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "Neispravan email ili lozinka",
    });
  });

  test("register treba vratiti 400 ako fale polja", async () => {
    const res = await request(BASE_URL)
      .post("/api/auth/register")
      .send({
        firstName: "A",
        email: "a@test.com",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Sva polja su obavezna",
    });
  });

  test("login treba vratiti 400 ako fale email ili password", async () => {
    const res = await request(BASE_URL)
      .post("/api/auth/login")
      .send({
        email: "",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "email i password su obavezni",
    });
  });
});