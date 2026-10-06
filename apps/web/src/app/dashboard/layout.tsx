import { AppShell } from "@/components/AppShell";
import { FeeVoucherProvider } from "@/components/fee-counter/FeeVoucherProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeeVoucherProvider>
      <AppShell>{children}</AppShell>
    </FeeVoucherProvider>
  );
}
