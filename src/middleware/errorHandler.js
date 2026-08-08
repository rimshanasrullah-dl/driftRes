export const errorHandler = (err, req, res, next) => {
  console.log("Error=> ", err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate value already exists" });
  }

  if (err.statusCode) {
    return res
      .status(err.statusCode)
      .json({ error: err.details || err.message });
  }

  res.status(500).json({ error: "Internal server error" });
};
