import * as RestaurantService from "../services/RestaurantServices.js";

export async function getAllRestaurants(req, res, next) {
  try {
    const restaurants = await RestaurantService.getAll();
    res.status(200).json(restaurants);
  } catch (error) {
    next(error);
  }
}

export async function createRestaurant(req, res, next) {
  try {
    const restaurant = await RestaurantService.create({
      ...req.body,
      createdBy: req.user.id,
    });
    res.status(201).json({ message: "Restaurant created! ", restaurant });
  } catch (error) {
    next(error);
  }
}

export async function UpdateRestaurant(req, res, next) {
  try {
    const restaurant = await RestaurantService.getById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    if (restaurant.createdBy?.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only edit your own restaurant" });
    }
    const updated = await RestaurantService.update(req.params.id, req.body);

    res
      .status(200)
      .json({ message: "Restaurant updated successfully! ", updated });
  } catch (error) {
    next(error);
  }
}

export async function DeleteRestaurant(req, res, next) {
  try {
    const restaurant = await RestaurantService.getById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const isOwner = restaurant.createdBy?.toString() === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res
        .status(403)
        .json({ error: "You can only delete your own restaurant" });
    }

    await RestaurantService.deleteRes(req.params.id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
