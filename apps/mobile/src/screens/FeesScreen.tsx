import { useTranslation } from "@eis/i18n";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fetchFees } from "../lib/portal";
import { useAsync } from "../lib/useAsync";
import { Screen } from "../components/Screen";
import { Card, EmptyState, ErrorText, Metric, SectionLabel, StatusPill } from "../components/ui";
import { formatDate, formatMoney } from "../lib/format";
import { useTheme } from "../theme/ThemeProvider";

export function FeesScreen({ activeStudentId }: { activeStudentId: number | null }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data, loading, error, reload } = useAsync(
    () => fetchFees(activeStudentId),
    [activeStudentId]
  );

  const vouchers = data?.data ?? [];

  return (
    <Screen refreshing={loading && data !== null} onRefresh={reload}>
      {loading && data === null ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : error ? (
        <ErrorText message={error} />
      ) : data ? (
        <>
          <Card>
            <SectionLabel>{t("fees.summary")}</SectionLabel>
            <View style={styles.metrics}>
              <Metric
                label={t("fees.billed")}
                value={formatMoney(data.totals.billed)}
              />
              <Metric
                label={t("fees.paid")}
                value={formatMoney(data.totals.paid)}
                tone={colors.success}
              />
              <Metric
                label={t("fees.outstanding")}
                value={formatMoney(data.totals.outstanding)}
                tone={Number(data.totals.outstanding) > 0 ? colors.danger : colors.success}
              />
            </View>
          </Card>

          <Card>
            <SectionLabel>{t("fees.vouchers")}</SectionLabel>
            {vouchers.length === 0 ? (
              <EmptyState message={t("fees.empty")} />
            ) : (
              vouchers.map((voucher) => (
                <View key={voucher.id} style={styles.voucher}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.voucherNo, { color: colors.foreground }]}>
                      {voucher.voucher_no}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {t("fees.dueAmount", {
                        date: formatDate(voucher.due_date),
                        amount: formatMoney(voucher.amount),
                      })}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {t("fees.paidBalance", {
                        paid: formatMoney(voucher.paid_amount),
                        balance: formatMoney(voucher.balance),
                      })}
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
