import * as userServices from "../services/UserServices.js";

export async function RegisterUser(req, res, next) {
  try {
    const user = await userServices.Register(req.body || {});
    res.status(201).json({
      message: "User registered successfully",
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginUser(req, res, next) {
  try {
    const response = await userServices.login(req.body);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}
