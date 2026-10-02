import type { ComponentType } from "react";
import { PromotionsScreen } from "./screens/PromotionsScreen";

export const CUSTOM_SCREENS: Record<string, ComponentType> = {
  promotions: PromotionsScreen,
};

export function findCustomScreen(name: string): ComponentType | null {
  return CUSTOM_SCREENS[name] ?? null;
}
