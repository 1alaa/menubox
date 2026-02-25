import { RestaurantDoc } from "../types";
import { isAfter } from "date-fns";

export function isActivePlan(restaurant: RestaurantDoc): boolean {
  if (!restaurant.isActive) return false;
  if (restaurant.planStatus === "disabled") return false;

  const now = new Date();

  if (restaurant.planStatus === "trial") {
    return isAfter(restaurant.trialEndsAt.toDate(), now);
  }

  if (restaurant.planStatus === "active") {
    if (!restaurant.subscriptionEndsAt) return false;
    return isAfter(restaurant.subscriptionEndsAt.toDate(), now);
  }

  return false; // past_due or other
}

export function getPlanStatusLabel(restaurant: RestaurantDoc) {
  const active = isActivePlan(restaurant);
  if (!active) {
    if (restaurant.planStatus === "disabled") return "Disabled";
    return "Expired / Past Due";
  }
  return restaurant.planStatus.charAt(0).toUpperCase() + restaurant.planStatus.slice(1);
}

export function getDaysRemaining(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
