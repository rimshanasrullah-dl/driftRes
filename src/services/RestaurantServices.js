import Restaurant from "../models/restaurantModel.js";

export async function getAll() {
  return await Restaurant.find();
}
export async function getById(id) {
  return await Restaurant.findById(id);
}

export async function create(data) {
  return await Restaurant.create(data);
}

// update the restaurant
export async function update(id, data) {
  return await Restaurant.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
}

//delete
export async function deleteRes(id) {
  return await Restaurant.findByIdAndDelete(id);
}
