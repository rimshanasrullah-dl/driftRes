import express from "express";
import {
  getRestaurantOrders,
  getStatus,
  getUserOrders,
  placeOrder,
  updateStatus,
} from "../controllers/OrderController.js";
import { protectedRoutes } from "../middleware/authmiddleware.js";

const orderRoutes = express.Router();

orderRoutes.post("/", protectedRoutes, placeOrder);
orderRoutes.get("/my-orders", protectedRoutes, getUserOrders);
orderRoutes.get("/:restaurantId/orders", protectedRoutes, getRestaurantOrders);
orderRoutes.post("/:id/status", protectedRoutes, updateStatus);
orderRoutes.get("/:id/status", protectedRoutes, getStatus);

export default orderRoutes;
