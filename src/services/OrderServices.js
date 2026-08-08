import Order from "../models/OrderScheme.js";
import Restaurant from "../models/restaurantModel.js";
import User from "../models/UserModels.js";
import { sendOrderConfirmation } from "./emailService.js";

const validTransition = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

export async function placeOrder(userId, data) {
  const { restaurantId, items } = data;

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    const error = new Error("restaurant not found");
    error.statusCode = 404;
    throw error;
  }
  const orderItems = [];
  let totalPrice = 0;

  for (const requested of items) {
    const menuItem = restaurant.menu.id(requested.menuItemId);
    if (!menuItem) {
      const error = new Error(
        `Item ${requested.menuItemId} is not on this restaurant's menu`,
      );
      error.statusCode = 404;
      throw error;
    }

    const quantity = requested.quantity || 1;

    orderItems.push({
      menuItemId: requested.menuItemId,
      quantity: quantity,
    });
    totalPrice += menuItem.price * quantity;
  }

  //  const totalPrice = orderItems.reduce(
  //    (sum, item) => sum + item.price * item.quantity,
  //    0,
  //  );
  const order = await Order.create({
    user: userId,
    restaurant: restaurantId,
    totalPrice: totalPrice,
    items: orderItems,
  });

  try {
    const user = await User.findById(userId);
    await sendOrderConfirmation(user.email, order);
  } catch (emailError) {
    console.log("Email failed to send:", emailError.message);
  }

  const populatedOrder = await Order.findById(order._id)
    .populate("restaurant", " name city")
    .populate("user", "name");

  return populatedOrder;
}

export async function getOrderById(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error("order not found");
    error.statusCode = 404;
    throw error;
  }
  return order;
}

export async function updateStatus(orderId, newStatus) {
  const order = await getOrderById(orderId);

  const allowedtransitions = validTransition[order.status];
  if (!allowedtransitions.includes(newStatus)) {
    const error = new Error(
      `Cannot change status from "${order.status}" to "${newStatus}"`,
    );
    error.statusCode = 400;
    throw error;
  }
  order.status = newStatus;
  await order.save();
  return order;
}

export async function getStatus(orderId) {
  const order = await getOrderById(orderId);
  return order.status;
}

export async function getOrders(baseFilters, query) {
  const { status, limit = 2, page = 1, sort = "desc" } = query;

  const filter = { ...baseFilters };

  if (status) filter.status = status;
  const sortOrder = sort == "asc" ? 1 : -1;

  const skip = (Number(page) - 1) * Number(limit);

  const order = await Order.find(filter)
    .populate("restaurant", "name city")
    .populate("user", "name")
    .sort({ createdAt: sort })
    .skip(skip)
    .limit(Number(limit));

  const total = await Order.countDocuments(filter);

  return {
    data: order,
    limit: limit,
    totalPages: Math.ceil(total / Number(limit)),
    total,
  };
}
