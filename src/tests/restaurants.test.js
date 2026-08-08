import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import {
  registerAndLogin,
  createAdmin,
  createRestaurant,
  clearTestDatabase,
  server,
} from "./helpers/testHelpers.js";

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

describe("GET /restaurants", () => {
  it("should return 200 with an array, no auth required", async () => {
    const { token } = await registerAndLogin();
    await createRestaurant(token);

    const response = await request(server).get("/restaurants");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe("POST /restaurants", () => {
  it("should create a restaurant as any authenticated user and return 201", async () => {
    const { token } = await registerAndLogin();

    const response = await request(server)
      .post("/restaurants")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Pizza Place", city: "Lahore" });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Restaurant created! ");
    expect(response.body.restaurant.name).toBe("Pizza Place");
    expect(response.body.restaurant.city).toBe("Lahore");
  });

  it("should reject with 401 when no token is provided", async () => {
    const response = await request(server)
      .post("/restaurants")
      .send({ name: "No Auth Place", city: "Karachi" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Not authorized, no token");
  });

  it("should reject with 400 when name/city are missing", async () => {
    const { token } = await registerAndLogin();

    const response = await request(server)
      .post("/restaurants")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(
      expect.arrayContaining([
        "Restaurant name is required",
        "City is required",
      ]),
    );
  });
});

describe("PUT /restaurants/:id", () => {
  it("should update as the creator and return 200", async () => {
    const { token } = await registerAndLogin();
    const restaurant = await createRestaurant(token);

    const response = await request(server)
      .put(`/restaurants/${restaurant._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ city: "Updated City" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Restaurant updated successfully! ");
    expect(response.body.updated.city).toBe("Updated City");
  });

  it("should reject with 403 for a non-owner, non-admin user", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);
    const stranger = await registerAndLogin();

    const response = await request(server)
      .put(`/restaurants/${restaurant._id}`)
      .set("Authorization", `Bearer ${stranger.token}`)
      .send({ city: "Hijacked City" });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("You can only edit your own restaurant");
  });

  it("should reject with 403 for an admin who isn't the creator (creator-only rule)", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);
    const admin = await createAdmin();

    const response = await request(server)
      .put(`/restaurants/${restaurant._id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ city: "Admin City" });

    expect(response.status).toBe(403);
  });

  it("should return 404 for an unknown restaurant id", async () => {
    const { token } = await registerAndLogin();
    const unknownId = new mongoose.Types.ObjectId();

    const response = await request(server)
      .put(`/restaurants/${unknownId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ city: "Nowhere" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Restaurant not found");
  });

  it("should return 400 for a malformed restaurant id", async () => {
    const { token } = await registerAndLogin();

    const response = await request(server)
      .put("/restaurants/not-a-valid-id")
      .set("Authorization", `Bearer ${token}`)
      .send({ city: "Nowhere" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid ID format");
  });

  it("should reject with 401 when no token is provided", async () => {
    const { token } = await registerAndLogin();
    const restaurant = await createRestaurant(token);

    const response = await request(server)
      .put(`/restaurants/${restaurant._id}`)
      .send({ city: "No Auth City" });

    expect(response.status).toBe(401);
  });
});

describe("DELETE /restaurants/:id", () => {
  it("should delete as an admin and return 204", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);
    const admin = await createAdmin();

    const response = await request(server)
      .delete(`/restaurants/${restaurant._id}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(204);
  });

  it("should reject with 403 for a non-admin, even the restaurant's own creator", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);

    const response = await request(server)
      .delete(`/restaurants/${restaurant._id}`)
      .set("Authorization", `Bearer ${owner.token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      "You do not have permission for this action",
    );
  });

  it("should return 404 for an unknown restaurant id", async () => {
    const admin = await createAdmin();
    const unknownId = new mongoose.Types.ObjectId();

    const response = await request(server)
      .delete(`/restaurants/${unknownId}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Restaurant not found");
  });

  it("should reject with 401 when no token is provided", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);

    const response = await request(server).delete(
      `/restaurants/${restaurant._id}`,
    );

    expect(response.status).toBe(401);
  });
});
