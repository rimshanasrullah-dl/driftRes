import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import {
  registerAndLogin,
  createAdmin,
  createRestaurant,
  addMenuItem,
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

describe("GET /restaurants/:id/menu", () => {
  it("should return 200 with the menu array, no auth required", async () => {
    const { token } = await registerAndLogin();
    const restaurant = await createRestaurant(token);
    await addMenuItem(token, restaurant._id);

    const response = await request(server).get(
      `/restaurants/${restaurant._id}/menu`,
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
  });

  it("should return 404 for an unknown restaurant id", async () => {
    const unknownId = new mongoose.Types.ObjectId();

    const response = await request(server).get(`/restaurants/${unknownId}/menu`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Restaurant not found");
  });
});

describe("POST /restaurants/:id/menu", () => {
  it("should add a menu item as the owner and return 201", async () => {
    const { token } = await registerAndLogin();
    const restaurant = await createRestaurant(token);

    const response = await request(server)
      .post(`/restaurants/${restaurant._id}/menu`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Burger", price: 5 });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Menu item added!");
    expect(response.body.restaurant.menu).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Burger", price: 5 })]),
    );
  });

  it("should add a menu item as an admin who isn't the owner and return 201", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);
    const admin = await createAdmin();

    const response = await request(server)
      .post(`/restaurants/${restaurant._id}/menu`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Admin Item", price: 7 });

    expect(response.status).toBe(201);
  });

  it("should reject with 403 for an unrelated non-admin user", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);
    const stranger = await registerAndLogin();

    const response = await request(server)
      .post(`/restaurants/${restaurant._id}/menu`)
      .set("Authorization", `Bearer ${stranger.token}`)
      .send({ name: "Sneaky Item", price: 1 });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      "You can only edit your own restaurant's menu",
    );
  });

  it("should reject with 400 when name/price are missing", async () => {
    const { token } = await registerAndLogin();
    const restaurant = await createRestaurant(token);

    const response = await request(server)
      .post(`/restaurants/${restaurant._id}/menu`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("should return 404 for an unknown restaurant id", async () => {
    const { token } = await registerAndLogin();
    const unknownId = new mongoose.Types.ObjectId();

    const response = await request(server)
      .post(`/restaurants/${unknownId}/menu`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ghost Item", price: 1 });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Restaurant not found");
  });
});

describe("PUT /restaurants/:id/menu/:itemId", () => {
  it("should partially update a menu item and return 200", async () => {
    const { token } = await registerAndLogin();
    const restaurant = await createRestaurant(token);
    const withItem = await addMenuItem(token, restaurant._id, {
      name: "Original",
      price: 3,
    });
    const itemId = withItem.menu[0]._id;

    const response = await request(server)
      .put(`/restaurants/${restaurant._id}/menu/${itemId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 9 });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Menu item updated!");
    const updatedItem = response.body.restaurant.menu.find(
      (item) => item._id === itemId,
    );
    expect(updatedItem.price).toBe(9);
    expect(updatedItem.name).toBe("Original");
  });

  it("should reject with 403 for an unrelated non-admin user", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);
    const withItem = await addMenuItem(owner.token, restaurant._id);
    const itemId = withItem.menu[0]._id;
    const stranger = await registerAndLogin();

    const response = await request(server)
      .put(`/restaurants/${restaurant._id}/menu/${itemId}`)
      .set("Authorization", `Bearer ${stranger.token}`)
      .send({ price: 100 });

    expect(response.status).toBe(403);
  });

  it("should return 404 for an unknown menu item id", async () => {
    const { token } = await registerAndLogin();
    const restaurant = await createRestaurant(token);
    const unknownItemId = new mongoose.Types.ObjectId();

    const response = await request(server)
      .put(`/restaurants/${restaurant._id}/menu/${unknownItemId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 5 });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Menu item not found");
  });

  it("should return 404 for an unknown restaurant id", async () => {
    const { token } = await registerAndLogin();
    const unknownId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();

    const response = await request(server)
      .put(`/restaurants/${unknownId}/menu/${itemId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 5 });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Restaurant not found");
  });
});

describe("DELETE /restaurants/:id/menu/:itemId", () => {
  it("should delete a menu item as an admin and return 204", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);
    const withItem = await addMenuItem(owner.token, restaurant._id);
    const itemId = withItem.menu[0]._id;
    const admin = await createAdmin();

    const response = await request(server)
      .delete(`/restaurants/${restaurant._id}/menu/${itemId}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(204);
  });

  it("should reject with 403 for the restaurant's own creator (admin-only rule, no owner bypass)", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);
    const withItem = await addMenuItem(owner.token, restaurant._id);
    const itemId = withItem.menu[0]._id;

    const response = await request(server)
      .delete(`/restaurants/${restaurant._id}/menu/${itemId}`)
      .set("Authorization", `Bearer ${owner.token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      "You do not have permission for this action",
    );
  });

  it("should return 404 for an unknown menu item id", async () => {
    const owner = await registerAndLogin();
    const restaurant = await createRestaurant(owner.token);
    const admin = await createAdmin();
    const unknownItemId = new mongoose.Types.ObjectId();

    const response = await request(server)
      .delete(`/restaurants/${restaurant._id}/menu/${unknownItemId}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Menu item not found");
  });
});
