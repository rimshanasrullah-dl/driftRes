import express from "express";
import {
  getAllRestaurants,
  createRestaurant,
  UpdateRestaurant,
  DeleteRestaurant,
} from "../controllers/RestaurantController.js";
import { protectedRoutes } from "../middleware/authmiddleware.js";
import { restrictTo } from "../middleware/roleCheckmiddleware.js";
import menuRoutes from "./MenuRoutes.js";

const restaurantRoutes = express.Router();

restaurantRoutes.get("/", getAllRestaurants);
restaurantRoutes.post("/", protectedRoutes, createRestaurant);
restaurantRoutes.put("/:id", protectedRoutes, UpdateRestaurant);
restaurantRoutes.delete(
  "/:id",
  protectedRoutes,
  restrictTo("admin"),
  DeleteRestaurant,
);
restaurantRoutes.use("/:id/menu", menuRoutes);

export default restaurantRoutes;
