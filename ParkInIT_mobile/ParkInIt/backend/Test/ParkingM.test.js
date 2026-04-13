const request = require("supertest");

const BASE_URL = "http://127.0.0.1:3000";

describe("REAL Parking API tests", () => {
  test("GET /api/parking vraca sva 3 parkinga s tocnim osnovnim podacima", async () => {
    const res = await request(BASE_URL).get("/api/parking");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);

    const parking1 = res.body.find((p) => p.Sifra_parkinga === 1);
    const parking2 = res.body.find((p) => p.Sifra_parkinga === 2);
    const parking3 = res.body.find((p) => p.Sifra_parkinga === 3);

    expect(parking1).toBeTruthy();
    expect(parking2).toBeTruthy();
    expect(parking3).toBeTruthy();

    expect(parking1.Adresa_parkinga).toBe("Ul. Ante Starčevića 1, Rijeka");
    expect(Number(parking1.Cijena_parkinga)).toBe(1.5);
    expect(parking1.total_spaces).toBe(10);
    expect(parking1.disabled_spaces).toBe(2);
    expect(parking1.available_spaces).toBeLessThanOrEqual(parking1.total_spaces);

    expect(parking2.Adresa_parkinga).toBe("Korzo 2, Rijeka");
    expect(Number(parking2.Cijena_parkinga)).toBe(2.0);
    expect(parking2.total_spaces).toBe(8);
    expect(parking2.disabled_spaces).toBe(2);
    expect(parking2.available_spaces).toBeLessThanOrEqual(parking2.total_spaces);

    expect(parking3.Adresa_parkinga).toBe("Ul. Ružićeva 5, Rijeka");
    expect(Number(parking3.Cijena_parkinga)).toBe(1.2);
    expect(parking3.total_spaces).toBe(6);
    expect(parking3.disabled_spaces).toBe(1);
    expect(parking3.available_spaces).toBeLessThanOrEqual(parking3.total_spaces);
  });

  test("GET /api/parking/1/spaces vraca 10 mjesta za parking 1", async () => {
    const res = await request(BASE_URL).get("/api/parking/1/spaces");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(10);

    const s1 = res.body.find((s) => s.Broj_parkirnog_mjesta === 1);
    const s3 = res.body.find((s) => s.Broj_parkirnog_mjesta === 3);
    const s4 = res.body.find((s) => s.Broj_parkirnog_mjesta === 4);
    const s5 = res.body.find((s) => s.Broj_parkirnog_mjesta === 5);
    const s6 = res.body.find((s) => s.Broj_parkirnog_mjesta === 6);
    const s8 = res.body.find((s) => s.Broj_parkirnog_mjesta === 8);

    expect(s1).toBeTruthy();
    expect(s3).toBeTruthy();
    expect(s4).toBeTruthy();
    expect(s5).toBeTruthy();
    expect(s6).toBeTruthy();
    expect(s8).toBeTruthy();

    expect(s1.Sifra_parkinga).toBe(1);
    expect(s1.Status_parkirnog_mjesta).toBe("slobodno");
    expect(s1.Vrsta_parkirnog_mjesta).toBe("standardno");
    expect(s1.is_available).toBe(true);

    expect(s3.Status_parkirnog_mjesta).toBe("rezervirano");
    expect(s3.is_available).toBe(false);

    expect(s4.Status_parkirnog_mjesta).toBe("zauzeto");
    expect(s4.is_available).toBe(false);

    expect(s5.Vrsta_parkirnog_mjesta).toBe("invalidsko");
    expect(s5.Status_parkirnog_mjesta).toBe("slobodno");
    expect(s5.is_available).toBe(true);

    expect(s6.Vrsta_parkirnog_mjesta).toBe("invalidsko");
    expect(s6.Status_parkirnog_mjesta).toBe("slobodno");
    expect(s6.is_available).toBe(true);

    expect(s8.Status_parkirnog_mjesta).toBe("zauzeto");
    expect(s8.is_available).toBe(false);
  });

  test("GET /api/parking/2/spaces vraca 8 mjesta za parking 2", async () => {
    const res = await request(BASE_URL).get("/api/parking/2/spaces");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(8);

    const s11 = res.body.find((s) => s.Broj_parkirnog_mjesta === 11);
    const s13 = res.body.find((s) => s.Broj_parkirnog_mjesta === 13);
    const s14 = res.body.find((s) => s.Broj_parkirnog_mjesta === 14);
    const s15 = res.body.find((s) => s.Broj_parkirnog_mjesta === 15);
    const s16 = res.body.find((s) => s.Broj_parkirnog_mjesta === 16);

    expect(s11).toBeTruthy();
    expect(s13).toBeTruthy();
    expect(s14).toBeTruthy();
    expect(s15).toBeTruthy();
    expect(s16).toBeTruthy();

    expect(s11.Sifra_parkinga).toBe(2);
    expect(s11.Status_parkirnog_mjesta).toBe("slobodno");
    expect(s11.is_available).toBe(true);

    expect(s13.Status_parkirnog_mjesta).toBe("zauzeto");
    expect(s13.is_available).toBe(false);

    expect(s14.Vrsta_parkirnog_mjesta).toBe("invalidsko");
    expect(s14.Status_parkirnog_mjesta).toBe("slobodno");
    expect(s14.is_available).toBe(true);

    expect(s15.Vrsta_parkirnog_mjesta).toBe("invalidsko");
    expect(s15.Status_parkirnog_mjesta).toBe("slobodno");
    expect(s15.is_available).toBe(true);

    expect(s16.Status_parkirnog_mjesta).toBe("rezervirano");
    expect(s16.is_available).toBe(false);
  });

  test("GET /api/parking/3/spaces vraca 6 mjesta za parking 3", async () => {
    const res = await request(BASE_URL).get("/api/parking/3/spaces");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(6);

    const s19 = res.body.find((s) => s.Broj_parkirnog_mjesta === 19);
    const s21 = res.body.find((s) => s.Broj_parkirnog_mjesta === 21);
    const s22 = res.body.find((s) => s.Broj_parkirnog_mjesta === 22);
    const s24 = res.body.find((s) => s.Broj_parkirnog_mjesta === 24);

    expect(s19).toBeTruthy();
    expect(s21).toBeTruthy();
    expect(s22).toBeTruthy();
    expect(s24).toBeTruthy();

    expect(s19.Sifra_parkinga).toBe(3);
    expect(s19.Status_parkirnog_mjesta).toBe("slobodno");
    expect(s19.is_available).toBe(true);

    expect(s21.Status_parkirnog_mjesta).toBe("zauzeto");
    expect(s21.is_available).toBe(false);

    expect(s22.Vrsta_parkirnog_mjesta).toBe("invalidsko");
    expect(s22.Status_parkirnog_mjesta).toBe("slobodno");
    expect(s22.is_available).toBe(true);

    expect(s24.Status_parkirnog_mjesta).toBe("rezervirano");
    expect(s24.is_available).toBe(false);
  });

  test("GET /api/parking/:id/spaces vraca 400 za neispravan id", async () => {
    const res = await request(BASE_URL).get("/api/parking/abc/spaces");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Invalid parking ID",
    });
  });

  test("GET /api/parking/1/spaces sa time range-om vraca mjesta i is_available boolean", async () => {
    const res = await request(BASE_URL).get(
      "/api/parking/1/spaces?start_time=2030-01-01T10:00:00.000Z&end_time=2030-01-01T12:00:00.000Z"
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(10);

    for (const space of res.body) {
      expect(typeof space.Broj_parkirnog_mjesta).toBe("number");
      expect(typeof space.is_available).toBe("boolean");
    }
  });

  test("GET /api/parking vraca trazena polja za svaki parking", async () => {
    const res = await request(BASE_URL).get("/api/parking");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    for (const parking of res.body) {
      expect(parking).toHaveProperty("Sifra_parkinga");
      expect(parking).toHaveProperty("Adresa_parkinga");
      expect(parking).toHaveProperty("Kapacitet_parkinga");
      expect(parking).toHaveProperty("Cijena_parkinga");
      expect(parking).toHaveProperty("total_spaces");
      expect(parking).toHaveProperty("available_spaces");
      expect(parking).toHaveProperty("disabled_spaces");

      expect(typeof parking.total_spaces).toBe("number");
      expect(typeof parking.available_spaces).toBe("number");
      expect(typeof parking.disabled_spaces).toBe("number");
    }
  });
});