import type { ComponentType } from "react";
import { PromotionsScreen } from "./screens/PromotionsScreen";
import { FeeReportsScreen } from "./screens/FeeReportsScreen";
import { FinanceReportsScreen } from "./screens/FinanceReportsScreen";
import { OperationsReportsScreen } from "./screens/OperationsReportsScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { RolesScreen } from "./screens/RolesScreen";
import { AuditLogScreen } from "./screens/AuditLogScreen";

export interface CustomScreenProps {
  permissions: string[];
}

export const CUSTOM_SCREENS: Record<string, ComponentType<CustomScreenProps>> = {
  promotions: PromotionsScreen,
  feeReports: FeeReportsScreen,
  financeReports: FinanceReportsScreen,
  operationsReports: OperationsReportsScreen,
  notifications: NotificationsScreen,
  roles: RolesScreen,
  auditLog: AuditLogScreen,
};

export function findCustomScreen(name: string): ComponentType<CustomScreenProps> | null {
  return CUSTOM_SCREENS[name] ?? null;
}
