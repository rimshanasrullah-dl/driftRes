import "dotenv/config";
import { connectDB } from "./src/config/db.js";
import app from "./src/app.js";

connectDB();
app.listen(3000, () => {
  console.log("server running at port ", process.env.PORT);
});
