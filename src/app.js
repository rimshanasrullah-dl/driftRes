import express from "express";
import RestaurantRoutes from "./routes/RestaurantRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import Useroutes from "./routes/UserRoutes.js";
import orderRoutes from "./routes/OrderRoutes.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/restaurants", RestaurantRoutes);
app.use("/user", Useroutes);
app.use("/orders", orderRoutes);

app.use(errorHandler);

export default app;
