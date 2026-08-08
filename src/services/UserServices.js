import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { appError } from "../utils/appError.js";
import User from "../models/UserModels.js";

// Input shape is validated by validateRegister middleware before this runs.
export async function Register(data) {
  const { name, email, password } = data;

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw appError(409, "Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // role is intentionally not accepted from the request body — public
  // registration always gets the schema default ("user"); admins are
  // created directly in the database.
  return await User.create({
    name,
    email,
    password: hashedPassword,
  });
}

export async function login(data) {
  const { email, password } = data;

  // check email in database
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error("Invalide email or password");
    error.statusCode = 401;
    throw error;
  }

  // comapre password with databse stored passowrd hash
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error("Invalide email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "10d",
    },
  );

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}
