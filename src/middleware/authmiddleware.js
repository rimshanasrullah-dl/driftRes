import jwt from "jsonwebtoken";

export async function protectedRoutes(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];

    const veirfiedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (!veirfiedToken) {
      return res.status(401).json({ error: "Not authorized, no token" });
    }

    req.user = { id: veirfiedToken.id, role: veirfiedToken.role };
    next();
  } catch (error) {
    return res.status(401).json({ error: " unauthorized, no token" });
  }
}
