import express from "express";
import {
  getMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/MenuController.js";
import { protectedRoutes } from "../middleware/authmiddleware.js";
import { restrictTo } from "../middleware/roleCheckmiddleware.js";

const menuRoutes = express.Router({ mergeParams: true });

menuRoutes.get("/", getMenu);
menuRoutes.post("/", protectedRoutes, addMenuItem);
menuRoutes.put("/:itemId", protectedRoutes, updateMenuItem);
menuRoutes.delete(
  "/:itemId",
  protectedRoutes,
  restrictTo("admin"),
  deleteMenuItem,
);

export default menuRoutes;
