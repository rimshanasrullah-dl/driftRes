import * as RestaurantService from "../services/RestaurantServices.js";
import * as MenuService from "../services/MenuServices.js";

function canManageMenu(restaurant, user) {
  return restaurant.createdBy?.toString() === user.id || user.role === "admin";
}

export async function getMenu(req, res, next) {
  try {
    const restaurant = await RestaurantService.getById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    res.status(200).json(restaurant.menu);
  } catch (error) {
    next(error);
  }
}

export async function addMenuItem(req, res, next) {
  try {
    const restaurant = await RestaurantService.getById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    if (!canManageMenu(restaurant, req.user)) {
      return res
        .status(403)
        .json({ error: "You can only edit your own restaurant's menu" });
    }
    const updated = await MenuService.addMenuItem(
      req.params.id,
      req.body || {},
    );
    res.status(201).json({ message: "Menu item added!", restaurant: updated });
  } catch (error) {
    next(error);
  }
}

export async function updateMenuItem(req, res, next) {
  try {
    const restaurant = await RestaurantService.getById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    if (!canManageMenu(restaurant, req.user)) {
      return res
        .status(403)
        .json({ error: "You can only edit your own restaurant's menu" });
    }
    const updated = await MenuService.updateMenuItem(
      req.params.id,
      req.params.itemId,
      req.body || {},
    );
    if (!updated) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    res
      .status(200)
      .json({ message: "Menu item updated!", restaurant: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteMenuItem(req, res, next) {
  try {
    const restaurant = await RestaurantService.getById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }
    const deleted = await MenuService.deleteMenuItem(
      req.params.id,
      req.params.itemId,
    );
    if (!deleted) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
