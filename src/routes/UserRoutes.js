import express from "express";
import { loginUser, RegisterUser } from "../controllers/UserController.js";
import {
  validateLogin,
  validateRegister,
} from "../validators/userValidator.js";

const userRoutes = express.Router();

userRoutes.post("/register", validateRegister, RegisterUser);
userRoutes.post("/login", validateLogin, loginUser);

export default userRoutes;
