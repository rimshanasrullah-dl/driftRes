import { jest } from "@jest/globals";

// Mock the email side-effect before anything imports OrderServices.js
// (which imports emailService.js), so placeOrder never hits the real
// Resend API / needs a real API_KEY. Must happen before the dynamic
// imports below, per Jest's ESM mocking requirements.
const sendOrderConfirmation = jest.fn().mockResolvedValue(undefined);
jest.unstable_mockModule("../services/emailService.js", () => ({
  sendOrderConfirmation,
}));

// These hit a real Atlas cluster over the network; retry a test a couple of
// times before failing it, to absorb occasional transient network hiccups
// rather than deterministic bugs.
jest.retryTimes(2, { logErrorsBeforeRetry: true });

const request = (await import("supertest")).default;
const mongoose = (await import("mongoose")).default;
const { connectDB } = await import("../config/db.js");
const {
  registerAndLogin,
  createAdmin,
  createRestaurant,
  addMenuItem,
  clearTestDatabase,
  server,
} = await import("./helpers/testHelpers.js");

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

beforeEach(() => {
  sendOrderConfirmation.mockClear();
  sendOrderConfirmation.mockResolvedValue(undefined);
});

async function setupRestaurantWithMenuItem(price = 10) {
  const owner = await registerAndLogin();
  const restaurant = await createRestaurant(owner.token);
  const updated = await addMenuItem(owner.token, restaurant._id, { price });
  const menuItemId = updated.menu[0]._id;
  return { owner, restaurantId: restaurant._id, menuItemId };
}

function placeOrder(token, restaurantId, items) {
  return request(server)
    .post("/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ restaurantId, items });
}

describe("POST /orders", () => {
  it("should place an order and return 201 with the computed totalPrice", async () => {
    const { restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();

    const response = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 3 },
    ]);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Order placed successfully");
    expect(response.body.order.totalPrice).toBe(30);
    expect(response.body.order.status).toBe("pending");
    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it("should still return 201 when sending the confirmation email fails", async () => {
    sendOrderConfirmation.mockRejectedValueOnce(new Error("email boom"));
    const { restaurantId, menuItemId } = await setupRestaurantWithMenuItem(5);
    const customer = await registerAndLogin();

    const response = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);

    expect(response.status).toBe(201);
  });

  it("should return 404 for an unknown restaurant id", async () => {
    const customer = await registerAndLogin();
    const unknownId = new mongoose.Types.ObjectId();

    const response = await placeOrder(customer.token, unknownId, [
      { menuItemId: new mongoose.Types.ObjectId().toString(), quantity: 1 },
    ]);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("restaurant not found");
  });

  it("should return 404 when a menuItemId is not on the restaurant's menu", async () => {
    const { restaurantId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();

    const response = await placeOrder(customer.token, restaurantId, [
      { menuItemId: new mongoose.Types.ObjectId().toString(), quantity: 1 },
    ]);

    expect(response.status).toBe(404);
  });

  it("should reject with 401 when no token is provided", async () => {
    const { restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);

    const response = await request(server)
      .post("/orders")
      .send({ restaurantId, items: [{ menuItemId, quantity: 1 }] });

    expect(response.status).toBe(401);
  });
});

describe("GET /orders/my-orders", () => {
  it("should only return the caller's own orders", async () => {
    const { restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    await placeOrder(customerA.token, restaurantId, [{ menuItemId, quantity: 1 }]);
    await placeOrder(customerB.token, restaurantId, [{ menuItemId, quantity: 1 }]);

    const response = await request(server)
      .get("/orders/my-orders")
      .set("Authorization", `Bearer ${customerA.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].user._id).toBe(customerA.user.id);
  });

  it("should paginate with the default limit of 2", async () => {
    const { restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    for (let i = 0; i < 3; i += 1) {
      await placeOrder(customer.token, restaurantId, [{ menuItemId, quantity: 1 }]);
    }

    const page1 = await request(server)
      .get("/orders/my-orders")
      .set("Authorization", `Bearer ${customer.token}`);
    const page2 = await request(server)
      .get("/orders/my-orders?page=2")
      .set("Authorization", `Bearer ${customer.token}`);

    expect(page1.body.data.length).toBe(2);
    expect(page1.body.total).toBe(3);
    expect(page1.body.totalPages).toBe(2);
    expect(page2.body.data.length).toBe(1);
  });

  it("should filter by status", async () => {
    const { owner, restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const order1 = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(order1.status).toBe(201);
    await placeOrder(customer.token, restaurantId, [{ menuItemId, quantity: 1 }]);
    await request(server)
      .post(`/orders/${order1.body.order._id}/status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "preparing" });

    const response = await request(server)
      .get("/orders/my-orders?status=preparing")
      .set("Authorization", `Bearer ${customer.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].status).toBe("preparing");
  });
});

describe("GET /orders/:restaurantId/orders", () => {
  it("should return 200 for the restaurant's owner", async () => {
    const { owner, restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    await placeOrder(customer.token, restaurantId, [{ menuItemId, quantity: 1 }]);

    const response = await request(server)
      .get(`/orders/${restaurantId}/orders`)
      .set("Authorization", `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
  });

  it("should return 200 for an admin", async () => {
    const { restaurantId } = await setupRestaurantWithMenuItem(10);
    const admin = await createAdmin();

    const response = await request(server)
      .get(`/orders/${restaurantId}/orders`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
  });

  it("should reject with 403 for an unrelated authenticated user", async () => {
    const { restaurantId } = await setupRestaurantWithMenuItem(10);
    const stranger = await registerAndLogin();

    const response = await request(server)
      .get(`/orders/${restaurantId}/orders`)
      .set("Authorization", `Bearer ${stranger.token}`);

    expect(response.status).toBe(403);
  });
});

describe("POST /orders/:id/status", () => {
  it("should walk pending -> preparing -> ready -> completed as the restaurant owner", async () => {
    const { owner, restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const placed = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);
    const orderId = placed.body.order._id;

    for (const status of ["preparing", "ready", "completed"]) {
      const response = await request(server)
        .post(`/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ status });

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe(status);
    }
  });

  it("should allow pending -> cancelled and preparing -> cancelled", async () => {
    const { owner, restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();

    const placedPending = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placedPending.status).toBe(201);
    const cancelPending = await request(server)
      .post(`/orders/${placedPending.body.order._id}/status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "cancelled" });
    expect(cancelPending.status).toBe(200);

    const placedPreparing = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placedPreparing.status).toBe(201);
    await request(server)
      .post(`/orders/${placedPreparing.body.order._id}/status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "preparing" });
    const cancelPreparing = await request(server)
      .post(`/orders/${placedPreparing.body.order._id}/status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "cancelled" });
    expect(cancelPreparing.status).toBe(200);
  });

  it("should reject an invalid transition with 400 and the exact message", async () => {
    const { owner, restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const placed = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);
    const orderId = placed.body.order._id;

    const response = await request(server)
      .post(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "completed" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'Cannot change status from "pending" to "completed"',
    );
  });

  it("should reject any transition out of a terminal state (completed)", async () => {
    const { owner, restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const placed = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);
    const orderId = placed.body.order._id;
    for (const status of ["preparing", "ready", "completed"]) {
      await request(server)
        .post(`/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ status });
    }

    const response = await request(server)
      .post(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "pending" });

    expect(response.status).toBe(400);
  });

  it("should return 404 for an unknown order id", async () => {
    const { owner } = await setupRestaurantWithMenuItem(10);
    const unknownId = new mongoose.Types.ObjectId();

    const response = await request(server)
      .post(`/orders/${unknownId}/status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "preparing" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("order not found");
  });

  it("should return a clean single 400 when status is missing (regression: no double response)", async () => {
    const { owner, restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const placed = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);

    const response = await request(server)
      .post(`/orders/${placed.body.order._id}/status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("status is required");
  });

  it("should reject with 403 for an unrelated authenticated user (regression: ownership fix)", async () => {
    const { restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const placed = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);
    const stranger = await registerAndLogin();

    const response = await request(server)
      .post(`/orders/${placed.body.order._id}/status`)
      .set("Authorization", `Bearer ${stranger.token}`)
      .send({ status: "preparing" });

    expect(response.status).toBe(403);
  });
});

describe("GET /orders/:id/status", () => {
  it("should return 200 for the order's own customer with the exact message shape", async () => {
    const { restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const placed = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);
    const orderId = placed.body.order._id;

    const response = await request(server)
      .get(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${customer.token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(`order ${orderId} is pending `);
  });

  it("should return 200 for the restaurant owner", async () => {
    const { owner, restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const placed = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);

    const response = await request(server)
      .get(`/orders/${placed.body.order._id}/status`)
      .set("Authorization", `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
  });

  it("should return 200 for an admin", async () => {
    const { restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const placed = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);
    const admin = await createAdmin();

    const response = await request(server)
      .get(`/orders/${placed.body.order._id}/status`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
  });

  it("should reject with 403 for an unrelated authenticated user (regression: ownership fix)", async () => {
    const { restaurantId, menuItemId } = await setupRestaurantWithMenuItem(10);
    const customer = await registerAndLogin();
    const placed = await placeOrder(customer.token, restaurantId, [
      { menuItemId, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);
    const stranger = await registerAndLogin();

    const response = await request(server)
      .get(`/orders/${placed.body.order._id}/status`)
      .set("Authorization", `Bearer ${stranger.token}`);

    expect(response.status).toBe(403);
  });

  it("should return 404 for an unknown order id", async () => {
    const customer = await registerAndLogin();
    const unknownId = new mongoose.Types.ObjectId();

    const response = await request(server)
      .get(`/orders/${unknownId}/status`)
      .set("Authorization", `Bearer ${customer.token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("order not found");
  });

  it("should return 400 for a malformed order id", async () => {
    const customer = await registerAndLogin();

    const response = await request(server)
      .get("/orders/not-a-valid-id/status")
      .set("Authorization", `Bearer ${customer.token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid ID format");
  });
});
