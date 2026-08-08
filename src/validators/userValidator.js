import { appError } from "../utils/appError.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateRegister(req, res, next) {
  const { name, email, password } = req.body || {};
  const errors = [];

  if (typeof name !== "string" || !name.trim()) {
    errors.push("Name is required");
  }

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    errors.push("A valid email address is required");
  }

  if (typeof password !== "string") {
    errors.push("Password is required");
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  // role is not accepted from the register request at all — public
  // registration always gets the schema default ("user").

  if (errors.length) {
    return next(appError(400, errors));
  }

  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const errors = [];

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    errors.push("A valid email address is required");
  }
  if (typeof password !== "string") {
    errors.push("Password is required");
  }
  if (errors.length) {
    return next(appError(400, errors));
  }

  next();
}
