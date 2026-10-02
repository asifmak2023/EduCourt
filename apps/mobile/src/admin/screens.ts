import type { ComponentType } from "react";
import { PromotionsScreen } from "./screens/PromotionsScreen";
import { FeeReportsScreen } from "./screens/FeeReportsScreen";

export const CUSTOM_SCREENS: Record<string, ComponentType> = {
  promotions: PromotionsScreen,
  feeReports: FeeReportsScreen,
};

export function findCustomScreen(name: string): ComponentType | null {
  return CUSTOM_SCREENS[name] ?? null;
}
