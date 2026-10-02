import { useCallback, useState } from "react";
import { useTranslation, type MessageKey } from "@eis/i18n";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card, EmptyState, ErrorText, PrimaryButton, SectionLabel, StatusPill } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { formatMoney } from "../../lib/format";
import { useTheme } from "../../theme/ThemeProvider";
import { DateField } from "../fields/DateField";
import { LookupField } from "../fields/LookupField";

type Tab = "trialBalance" | "budgetVsActual" | "expense";

const TABS: { key: Tab; label: MessageKey }[] = [
  { key: "trialBalance", label: "admin.financeReports.tabTrialBalance" },
  { key: "budgetVsActual", label: "admin.financeReports.tabBudgetVsActual" },
  { key: "expense", label: "admin.financeReports.tabExpense" },
];

export function FinanceReportsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const campusId = useCampusId();

  const [tab, setTab] = useState<Tab>("trialBalance");
  const [fiscalYearId, setFiscalYearId] = useState<unknown>("");
  const [budgetId, setBudgetId] = useState<unknown>("");
  const [from, setFrom] = useState<unknown>("");
  const [to, setTo] = useState<unknown>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ label: MessageKey; value: string }[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoaded(false);
    try {
      if (tab === "trialBalance") {
        const params = new URLSearchParams();
        if (fiscalYearId) params.set("fiscal_year_id", String(fiscalYearId));
        if (from) params.set("from", String(from));
        if (to) params.set("to", String(to));
        const response = await apiFetch<{
          data: Record<string, unknown>[];
          totals: { total_debit: string; total_credit: string };
        }>(`/v1/finance/reports/trial-balance?${params.toString()}`, { campusId });
        setSummary([
          { label: "admin.financeReports.debit", value: formatMoney(response.totals.total_debit) },
          { label: "admin.financeReports.credit", value: formatMoney(response.totals.total_credit) },
        ]);
        setRows(response.data);
      } else if (tab === "budgetVsActual") {
        if (!budgetId) {
          setError(t("admin.financeReports.selectBudget"));
          setLoading(false);
          return;
        }
        const response = await apiFetch<{
          data: Record<string, unknown>[];
          totals: { budget: string; actual: string; variance: string };
        }>(`/v1/finance/reports/budget-vs-actual?budget_id=${budgetId}`, { campusId });
        setSummary([
          { label: "admin.financeReports.budget", value: formatMoney(response.totals.budget) },
          { label: "admin.financeReports.actual", value: formatMoney(response.totals.actual) },
          { label: "admin.financeReports.variance", value: formatMoney(response.totals.variance) },
        ]);
        setRows(response.data);
      } else {
        const params = new URLSearchParams();
        if (from) params.set("from", String(from));
        if (to) params.set("to", String(to));
        const response = await apiFetch<{
          by_category: Record<string, unknown>[];
          totals: { expenses: number; amount: string };
        }>(`/v1/finance/reports/expenses?${params.toString()}`, { campusId });
        setSummary([
          { label: "admin.financeReports.expenses", value: String(response.totals.expenses) },
          { label: "admin.financeReports.amount", value: formatMoney(response.totals.amount) },
        ]);
        setRows(response.by_category);
      }
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("admin.report.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [tab, fiscalYearId, budgetId, from, to, campusId, t]);

  const money = (value: unknown) => formatMoney(value as string | number);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                setTab(item.key);
                setRows([]);
                setSummary([]);
                setLoaded(false);
                setError(null);
              }}
              style={[
                styles.tab,
                {
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <Text style={{ color: active ? colors.accent : colors.muted, fontSize: 13, fontWeight: "600" }}>
                {t(item.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <ErrorText message={error} /> : null}

      <Card>
        {tab === "trialBalance" ? (
          <>
            <LookupField label="Fiscal year" lookup="fiscalYears" value={fiscalYearId} onChange={setFiscalYearId} />
            <DateField label="From" mode="date" value={from} onChange={setFrom} />
            <DateField label="To" mode="date" value={to} onChange={setTo} />
          </>
        ) : null}
        {tab === "budgetVsActual" ? (
          <LookupField label="Budget" lookup="budgets" value={budgetId} onChange={setBudgetId} required />
        ) : null}
        {tab === "expense" ? (
          <>
            <DateField label="From" mode="date" value={from} onChange={setFrom} />
            <DateField label="To" mode="date" value={to} onChange={setTo} />
          </>
        ) : null}
        <PrimaryButton label={t("admin.report.run")} onPress={() => void load()} loading={loading} />
      </Card>

      {summary.length > 0 ? (
        <View style={styles.summaryRow}>
          {summary.map((item) => (
            <View
              key={item.label}
              style={[styles.metric, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase" }}>
                {t(item.label)}
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {loading && !loaded ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}

      {loaded ? (
        <View style={styles.results}>
          <SectionLabel>{t("admin.report.rows", { count: rows.length })}</SectionLabel>
          {rows.length === 0 ? <EmptyState message={t("admin.report.empty")} /> : null}
          {tab === "trialBalance"
            ? rows.map((row, index) => (
                <Card key={String(row.chart_of_account_id ?? index)}>
                  <View style={styles.resultMeta}>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
                      {String(row.code ?? "")} {String(row.name ?? "")}
                    </Text>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
                      {money(row.balance)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    {String(row.account_type ?? "")} ·{" "}
                    {t("admin.financeReports.debitCredit", {
                      debit: money(row.total_debit),
                      credit: money(row.total_credit),
                    })}
                  </Text>
                </Card>
              ))
            : null}
          {tab === "budgetVsActual"
            ? rows.map((row, index) => (
                <Card key={String(row.chart_of_account_id ?? index)}>
                  <View style={styles.resultMeta}>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
                      {String(row.code ?? "")} {String(row.name ?? "")}
                    </Text>
                    <StatusPill value={row.favorable ? "paid" : "unpaid"} label={String(row.utilization ?? "-")} />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    {t("admin.financeReports.budgetActualVariance", {
                      budget: money(row.budget),
                      actual: money(row.actual),
                      variance: money(row.variance),
                    })}
                  </Text>
                </Card>
              ))
            : null}
          {tab === "expense"
            ? rows.map((row, index) => (
                <Card key={String(row.category_id ?? index)}>
                  <View style={styles.resultMeta}>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
                      {String(row.code ?? "")} {String(row.name ?? "")}
                    </Text>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
                      {money(row.total)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    {t("admin.financeReports.expenseCount", { count: String(row.expenses ?? 0) })}
                  </Text>
                </Card>
              ))
            : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  metric: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
  },
  loader: {
    marginTop: 24,
  },
  results: {
    marginTop: 20,
    gap: 8,
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
