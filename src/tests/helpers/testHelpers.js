import http from "http";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../../app.js";
import User from "../../models/UserModels.js";

// Shared HTTP server for the whole test file: passing supertest a raw
// Express app makes it bind+tear down a fresh ephemeral server on every
// single request, which under heavy request volume + real network I/O can
// cause intermittent socket/parser errors. Each test file listens this once
// in beforeAll and closes it in afterAll instead.
export const server = http.createServer(app);

// The Atlas test-DB user only has readWrite (no dbAdmin), so dropDatabase()
// isn't available for cleanup — clear every collection's documents instead.
export async function clearTestDatabase() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

let counter = 0;
function unique(prefix) {
  counter += 1;
  return `${prefix}${Date.now()}${counter}`;
}

export function uniqueEmail(prefix = "user") {
  return `${unique(prefix)}@example.com`;
}

export async function registerUser(overrides = {}) {
  const body = {
    name: "Test User",
    email: uniqueEmail(),
    password: "Password123!",
    ...overrides,
  };
  const response = await request(server).post("/user/register").send(body);
  return { response, credentials: body };
}

export async function registerAndLogin(overrides = {}) {
  const { credentials } = await registerUser(overrides);
  const loginResponse = await request(server)
    .post("/user/login")
    .send({ email: credentials.email, password: credentials.password });
  return {
    token: loginResponse.body.token,
    user: loginResponse.body.user,
    credentials,
  };
}

// Public registration can no longer grant role:"admin" (fixed bug), so this
// is the one deliberate exception to black-box-only setup: it inserts an
// admin user directly, mirroring what UserServices.Register/login do.
export async function createAdmin(overrides = {}) {
  const credentials = {
    name: "Test Admin",
    email: uniqueEmail("admin"),
    password: "Password123!",
    ...overrides,
  };
  const hashedPassword = await bcrypt.hash(credentials.password, 10);
  const user = await User.create({
    name: credentials.name,
    email: credentials.email,
    password: hashedPassword,
    role: "admin",
  });
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "10d" },
  );
  return { token, user, credentials };
}

export async function createRestaurant(token, overrides = {}) {
  const body = {
    name: "Test Restaurant",
    city: "Test City",
    ...overrides,
  };
  const response = await request(server)
    .post("/restaurants")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
  return response.body.restaurant;
}

export async function addMenuItem(token, restaurantId, overrides = {}) {
  const body = {
    name: "Test Item",
    price: 10,
    ...overrides,
  };
  const response = await request(server)
    .post(`/restaurants/${restaurantId}/menu`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
  return response.body.restaurant;
}
