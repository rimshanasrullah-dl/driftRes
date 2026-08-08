export function appError(statusCode, message) {
  const isList = Array.isArray(message);

  const error = new Error(isList ? message.join(", ") : message);
  error.statusCode = statusCode;
  if (isList) {
    error.details = message;
  }

  return error;
}
