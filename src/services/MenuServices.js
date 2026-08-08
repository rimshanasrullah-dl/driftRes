import Restaurant from "../models/restaurantModel.js";

export async function addMenuItem(restaurantId, itemData) {
  const restaurant = await Restaurant.findById(restaurantId);
  restaurant.menu.push(itemData);
  await restaurant.save();
  return restaurant;
}

export async function updateMenuItem(restaurantId, itemId, data) {
  const restaurant = await Restaurant.findById(restaurantId);
  const menuItem = restaurant.menu.id(itemId);
  if (!menuItem) {
    return undefined;
  }
  if (data.name !== undefined) menuItem.name = data.name;
  if (data.price !== undefined) menuItem.price = data.price;
  await restaurant.save();
  return restaurant;
}

export async function deleteMenuItem(restaurantId, itemId) {
  const restaurant = await Restaurant.findById(restaurantId);
  const menuItem = restaurant.menu.id(itemId);
  if (!menuItem) {
    return undefined;
  }
  restaurant.menu.pull(itemId);
  await restaurant.save();
  return restaurant;
}
