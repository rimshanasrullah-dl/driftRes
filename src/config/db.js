import mongoose from "mongoose";

export async function connectDB(uri = process.env.MONGO_URI) {
  try {
    await mongoose.connect(uri);
    console.log("MOOGO Db connected successfully");
  } catch (error) {
    console.error("failed to connect MOOGO Db ", error);
    process.exit(1);
  }
}
