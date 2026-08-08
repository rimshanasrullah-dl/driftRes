import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Menu item name is required"] },
  price: { type: Number, required: [true, "Enter price of the menu item"] },
  // category: {
  //   type: String,
  //   enum:['Drinks','Dessert','Pizza',"Desi"],
  //   required: [true, "Enter Category of the menu item"],
  // },
});
const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Restaurant name is required"] },
    city: { type: String, required: [true, "City is required"] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    menu: [menuSchema],
  },
  { timestamps: true },
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

export default Restaurant;
