import { AppShell } from "@/components/AppShell";
import { CampusProvider } from "@/lib/campus";
import { FeeVoucherProvider } from "@/components/fee-counter/FeeVoucherProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CampusProvider>
      <FeeVoucherProvider>
        <AppShell>{children}</AppShell>
      </FeeVoucherProvider>
    </CampusProvider>
  );
}
