"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";

const LINKS: (HubSection & { permission: string | string[] })[] = [
  {
    title: "Accounts receivable",
    description: "Fee structures, voucher generation, collections and ageing reports.",
    href: "/dashboard/finance/accounts-receivable",
    permission: AR_VIEW,
    icon: "banknote",
  },
  {
    title: "Accounts payable",
    description: "Payment vouchers, staff salaries, utilities and outstanding payables.",
    href: "/dashboard/finance/accounts-payable",
    permission: "finance.view",
    icon: "wallet",
  },
  {
    title: "Chart of accounts",
    description: "Ledger accounts used for double-entry postings.",
    href: "/dashboard/finance/accounts",
    permission: "finance.view",
    icon: "list",
  },
  {
    title: "Journal entries",
    description: "Manual and system-generated accounting entries.",
    href: "/dashboard/finance/journal",
    permission: "finance.view",
    icon: "book",
  },
  {
    title: "Trial balance",
    description: "Debit and credit balances per account.",
    href: "/dashboard/finance/trial-balance",
    permission: "finance.view",
    icon: "chart",
  },
  {
    title: "Expenses",
    description: "Operating expenses and payment records.",
    href: "/dashboard/finance/expenses",
    permission: "finance.view",
    icon: "banknote",
  },
  {
    title: "Vendors",
    description: "Supplier directory for purchases and payables.",
    href: "/dashboard/finance/vendors",
    permission: "finance.view",
    icon: "receipt",
  },
  {
    title: "Budgets",
    description: "Planned income and expenditure by period.",
    href: "/dashboard/finance/budgets",
    permission: "finance.view",
    icon: "chart",
  },
  {
    title: "Reports",
    description: "Finance and management reports.",
    href: "/dashboard/reports",
    permission: "report.view",
    icon: "users",
  },
];

export default function FinanceHubPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <FinanceHub />
    </PermissionGate>
  );
}

function FinanceHub() {
  const { canAny } = useAuth();
  const visible = LINKS.filter((link) =>
    canAny(Array.isArray(link.permission) ? link.permission : [link.permission])
  );

  return (
    <ModuleHub
      title="Finance"
      description="Fees, accounting, expenses and financial reporting."
      sections={visible}
    />
  );
}
