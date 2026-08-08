import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { uniqueEmail, clearTestDatabase, server } from "./helpers/testHelpers.js";

// These hit a real Atlas cluster over the network; retry a test a couple of
// times before failing it, to absorb occasional transient network hiccups
// rather than deterministic bugs.
jest.retryTimes(2, { logErrorsBeforeRetry: true });

beforeAll(async () => {
  await connectDB(process.env.TEST_MONGO_URI);
  server.listen();
});

afterAll(async () => {
  try {
    await clearTestDatabase();
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
});

describe("POST /user/register", () => {
  it("should register a new user and return 201", async () => {
    //Arrnage
    const newUser = {
      name: "Test User",
      email: uniqueEmail(),
      password: "Password123!",
    };

    //Act
    const response = await request(server).post("/user/register").send(newUser);

    //Assert
    expect(response.status).toBe(201);
    expect(response.body.email).toBe(newUser.email);
    expect(response.body.name).toBe(newUser.name);
    expect(response.body.role).toBe("user");
    expect(response.body.password).toBeUndefined();
  });

  it("should not register user with missing password", async () => {
    const response = await request(server)
      .post("/user/register")
      .send({ name: "no pass", email: uniqueEmail() });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Password is required");
  });

  it("should not register user with missing name", async () => {
    const response = await request(server)
      .post("/user/register")
      .send({ email: uniqueEmail(), password: "Password123!" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Name is required");
  });

  it("should not register user with an invalid email", async () => {
    const response = await request(server)
      .post("/user/register")
      .send({ name: "Bad Email", email: "not-an-email", password: "Password123!" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("A valid email address is required");
  });

  it("should not register user with a password under 8 characters", async () => {
    const response = await request(server)
      .post("/user/register")
      .send({ name: "Short Pass", email: uniqueEmail(), password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain(
      "Password must be at least 8 characters",
    );
  });

  it("should reject registering a duplicate email with 409", async () => {
    const newUser = {
      name: "Dup User",
      email: uniqueEmail(),
      password: "Password123!",
    };
    await request(server).post("/user/register").send(newUser);

    const response = await request(server).post("/user/register").send(newUser);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Email is already registered");
  });

  it("should ignore role:admin in the request body (regression: self-elevation fix)", async () => {
    const response = await request(server).post("/user/register").send({
      name: "Wannabe Admin",
      email: uniqueEmail(),
      password: "Password123!",
      role: "admin",
    });

    expect(response.status).toBe(201);
    expect(response.body.role).toBe("user");
  });
});

describe("POST /user/login", () => {
  it("should log in with correct credentials and return matching name/email (regression: swap fix)", async () => {
    const credentials = {
      name: "Login User",
      email: uniqueEmail(),
      password: "Password123!",
    };
    await request(server).post("/user/register").send(credentials);

    const response = await request(server).post("/user/login").send({
      email: credentials.email,
      password: credentials.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(credentials.email);
    expect(response.body.user.name).toBe(credentials.name);
    expect(response.body.user.role).toBe("user");
  });

  it("should reject login for an unknown email with 401", async () => {
    const response = await request(server).post("/user/login").send({
      email: uniqueEmail("nobody"),
      password: "Password123!",
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalide email or password");
  });

  it("should reject login with the wrong password with 401 (same message as unknown email)", async () => {
    const credentials = {
      name: "Wrong Pass User",
      email: uniqueEmail(),
      password: "Password123!",
    };
    await request(server).post("/user/register").send(credentials);

    const response = await request(server).post("/user/login").send({
      email: credentials.email,
      password: "WrongPassword123!",
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalide email or password");
  });

  it("should reject login with a missing password with 400", async () => {
    const response = await request(server)
      .post("/user/login")
      .send({ email: uniqueEmail() });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Password is required");
  });
});
