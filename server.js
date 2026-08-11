import "dotenv/config";
import { connectDB } from "./src/config/db.js";
import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

connectDB();
app.listen(PORT, () => {
  console.log("server running at port ", PORT);
});
