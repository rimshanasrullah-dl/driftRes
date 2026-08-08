import * as orderServices from "../services/OrderServices.js";
import * as RestaurantService from "../services/RestaurantServices.js";

function isOwnerOrAdmin(restaurant, user) {
  return restaurant?.createdBy?.toString() === user.id || user.role === "admin";
}

export async function placeOrder(req, res, next) {
  try {
    const order = await orderServices.placeOrder(req.user.id, req.body);
    res.status(201).json({ message: "Order placed successfully", order });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const order = await orderServices.getOrderById(req.params.id);
    const restaurant = await RestaurantService.getById(order.restaurant);
    if (!isOwnerOrAdmin(restaurant, req.user)) {
      return res
        .status(403)
        .json({ error: "You can only update orders for your own restaurant" });
    }

    const updated = await orderServices.updateStatus(req.params.id, status);
    res
      .status(200)
      .json({ message: "Order status updated successfully", order: updated });
  } catch (error) {
    next(error);
  }
}

export async function getStatus(req, res, next) {
  try {
    const order = await orderServices.getOrderById(req.params.id);
    const restaurant = await RestaurantService.getById(order.restaurant);
    const isCustomer = order.user.toString() === req.user.id;
    if (!isCustomer && !isOwnerOrAdmin(restaurant, req.user)) {
      return res.status(403).json({ error: "You cannot view this order's status" });
    }

    res
      .status(200)
      .json({ message: `order ${req.params.id} is ${order.status} ` });
  } catch (error) {
    next(error);
  }
}

export async function getUserOrders(req, res, next) {
  try {
    const result = await orderServices.getOrders(
      { user: req.user.id },
      req.query,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getRestaurantOrders(req, res, next) {
  try {
    const restaurant = await RestaurantService.getById(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    if (!isOwnerOrAdmin(restaurant, req.user)) {
      return res
        .status(403)
        .json({ error: "You can only view your own restaurant's orders" });
    }

    const result = await orderServices.getOrders(
      { restaurant: req.params.restaurantId },
      req.query,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
