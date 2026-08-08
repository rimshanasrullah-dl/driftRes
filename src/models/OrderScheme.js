import mongoose from "mongoose";

const OrderItemsSchema = new mongoose.Schema({
  menuItemId: { type: String, required: true },
  // price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    items: [OrderItemsSchema],
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
  },
  { timestamps: true },
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
