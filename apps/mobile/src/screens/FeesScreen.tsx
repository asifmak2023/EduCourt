import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fetchFees } from "../lib/portal";
import { useAsync } from "../lib/useAsync";
import type { StudentSummary } from "../lib/api";
import { ChildSelector } from "../components/ChildSelector";
import { Screen } from "../components/Screen";
import { Card, EmptyState, ErrorText, Metric, SectionLabel, StatusPill } from "../components/ui";
import { formatDate, formatMoney } from "../lib/format";
import { useTheme } from "../theme/ThemeProvider";

export function FeesScreen({
  students,
  activeStudentId,
  onSelectStudent,
  onAppearance,
}: {
  students: StudentSummary[];
  activeStudentId: number | null;
  onSelectStudent: (id: number) => void;
  onAppearance: () => void;
}) {
  const { colors } = useTheme();
  const { data, loading, error } = useAsync(
    () => fetchFees(activeStudentId),
    [activeStudentId]
  );

  const vouchers = data?.data ?? [];

  return (
    <Screen title="Fees" subtitle="Vouchers and balances" onAppearance={onAppearance}>
      <ChildSelector
        students={students}
        activeId={activeStudentId}
        onSelect={onSelectStudent}
      />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : error ? (
        <ErrorText message={error} />
      ) : data ? (
        <>
          <Card>
            <SectionLabel>Summary</SectionLabel>
            <View style={styles.metrics}>
              <Metric label="Billed" value={formatMoney(data.totals.billed)} />
              <Metric
                label="Paid"
                value={formatMoney(data.totals.paid)}
                tone={colors.success}
              />
              <Metric
                label="Outstanding"
                value={formatMoney(data.totals.outstanding)}
                tone={Number(data.totals.outstanding) > 0 ? colors.danger : colors.success}
              />
            </View>
          </Card>

          <Card>
            <SectionLabel>Vouchers</SectionLabel>
            {vouchers.length === 0 ? (
              <EmptyState message="No fee vouchers issued yet." />
            ) : (
              vouchers.map((voucher) => (
                <View key={voucher.id} style={styles.voucher}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.voucherNo, { color: colors.foreground }]}>
                      {voucher.voucher_no}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Due {formatDate(voucher.due_date)} · Amount{" "}
                      {formatMoney(voucher.amount)}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Paid {formatMoney(voucher.paid_amount)} · Balance{" "}
                      {formatMoney(voucher.balance)}
                    </Text>
                  </View>
                  <StatusPill value={voucher.status} />
                </View>
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  metrics: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  voucher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  voucherNo: {
    fontSize: 14,
    fontWeight: "700",
  },
});
