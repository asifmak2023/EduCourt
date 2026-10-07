"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { Card, PageHeader } from "@/components/ui";

interface HubLink {
  title: string;
  description: string;
  href: string;
  permission: string | string[];
}

const LINKS: HubLink[] = [
  {
    title: "Accounts receivable",
    description: "Fee structures, voucher generation, collections and ageing reports.",
    href: "/dashboard/finance/accounts-receivable",
    permission: AR_VIEW,
  },
  {
    title: "Accounts payable",
    description: "Payment vouchers, staff salaries, utilities and outstanding payables.",
    href: "/dashboard/finance/accounts-payable",
    permission: "finance.view",
  },
  {
    title: "Chart of accounts",
    description: "Ledger accounts used for double-entry postings.",
    href: "/dashboard/finance/accounts",
    permission: "finance.view",
  },
  {
    title: "Journal entries",
    description: "Manual and system-generated accounting entries.",
    href: "/dashboard/finance/journal",
    permission: "finance.view",
  },
  {
    title: "Trial balance",
    description: "Debit and credit balances per account.",
    href: "/dashboard/finance/trial-balance",
    permission: "finance.view",
  },
  {
    title: "Expenses",
    description: "Operating expenses and payment records.",
    href: "/dashboard/finance/expenses",
    permission: "finance.view",
  },
  {
    title: "Vendors",
    description: "Supplier directory for purchases and payables.",
    href: "/dashboard/finance/vendors",
    permission: "finance.view",
  },
  {
    title: "Budgets",
    description: "Planned income and expenditure by period.",
    href: "/dashboard/finance/budgets",
    permission: "finance.view",
  },
  {
    title: "Reports",
    description: "Finance and management reports.",
    href: "/dashboard/reports",
    permission: "report.view",
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
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Fees, accounting, expenses and financial reporting."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <Card className="h-full p-5 transition-colors hover:border-accent">
              <h2 className="text-sm font-semibold text-foreground">
                {link.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{link.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
