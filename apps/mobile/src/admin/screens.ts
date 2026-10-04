import type { ComponentType } from "react";
import { PromotionsScreen } from "./screens/PromotionsScreen";
import { FeeReportsScreen } from "./screens/FeeReportsScreen";
import { FinanceReportsScreen } from "./screens/FinanceReportsScreen";
import { OperationsReportsScreen } from "./screens/OperationsReportsScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";

export interface CustomScreenProps {
  permissions: string[];
}

export const CUSTOM_SCREENS: Record<string, ComponentType<CustomScreenProps>> = {
  promotions: PromotionsScreen,
  feeReports: FeeReportsScreen,
  financeReports: FinanceReportsScreen,
  operationsReports: OperationsReportsScreen,
  notifications: NotificationsScreen,
};

export function findCustomScreen(name: string): ComponentType<CustomScreenProps> | null {
  return CUSTOM_SCREENS[name] ?? null;
}
