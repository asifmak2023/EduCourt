import { useEffect, useState } from "react";
import { useTranslation } from "@eis/i18n";
import { apiFetch } from "../lib/api";
import { useCampusId } from "../lib/campus";
import { buildQuery } from "./query";
import type { SelectOption } from "./types";

interface LookupDef {
  endpoint: string;
  labelKey?: string;
  depParam?: string;
}

const LOOKUPS: Record<string, LookupDef> = {
  academicYears: { endpoint: "/v1/academic-years", labelKey: "name" },
  terms: { endpoint: "/v1/terms", labelKey: "name" },
  stages: { endpoint: "/v1/stages", labelKey: "name" },
  classRooms: { endpoint: "/v1/classes", labelKey: "name" },
  sections: {
    endpoint: "/v1/sections",
    labelKey: "name",
    depParam: "class_room_id",
  },
  subjects: { endpoint: "/v1/subjects", labelKey: "name" },
  staffUsers: { endpoint: "/v1/users", labelKey: "name" },
  students: { endpoint: "/v1/students", labelKey: "full_name" },
  guardians: { endpoint: "/v1/guardians", labelKey: "name" },
  scholarships: { endpoint: "/v1/scholarships", labelKey: "name" },
  feeHeads: { endpoint: "/v1/fee-heads", labelKey: "name" },
  feePlans: { endpoint: "/v1/fee-plans", labelKey: "name" },
  feeVouchers: {
    endpoint: "/v1/fee-vouchers",
    labelKey: "voucher_no",
    depParam: "student_id",
  },
  feePayments: {
    endpoint: "/v1/fee-payments",
    labelKey: "receipt_no",
    depParam: "student_id",
  },
  concessionPolicies: { endpoint: "/v1/concession-policies", labelKey: "name" },
  fineRules: { endpoint: "/v1/fine-rules", labelKey: "name" },
  fiscalYears: { endpoint: "/v1/fiscal-years", labelKey: "name" },
  chartOfAccounts: { endpoint: "/v1/chart-of-accounts", labelKey: "name" },
  expenseCategories: { endpoint: "/v1/expense-categories", labelKey: "name" },
  vendors: { endpoint: "/v1/vendors", labelKey: "name" },
  budgets: { endpoint: "/v1/budgets", labelKey: "name" },
  departments: { endpoint: "/v1/departments", labelKey: "name" },
  designations: { endpoint: "/v1/designations", labelKey: "name" },
  staffMembers: { endpoint: "/v1/staff", labelKey: "full_name" },
  salaryComponents: { endpoint: "/v1/salary-components", labelKey: "name" },
};

const cache = new Map<string, SelectOption[]>();

export function lookupDependsOn(name: string): string | null {
  return LOOKUPS[name]?.depParam ?? null;
}

export function useLookup(
  name: string,
  depends?: string | number | null
): { options: SelectOption[]; loading: boolean; error: string | null } {
  const { t } = useTranslation();
  const campusId = useCampusId();
  const def = LOOKUPS[name];
  const depParam = def?.depParam;
  const needsDep = Boolean(depParam);
  const hasDep = depends !== null && depends !== undefined && depends !== "";

  const key = `${name}:${campusId ?? "all"}:${
    depParam && hasDep ? String(depends) : ""
  }`;

  const [fetched, setFetched] = useState<{
    key: string;
    options: SelectOption[];
  }>(() => ({ key, options: cache.get(key) ?? [] }));
  const [errorState, setErrorState] = useState<{
    key: string;
    message: string;
  } | null>(null);

  const ready = Boolean(def) && (!needsDep || hasDep);
  const cached = ready ? cache.get(key) : undefined;
  const pending = ready && !cached && fetched.key !== key;
  const options: SelectOption[] = !ready
    ? []
    : cached ?? (fetched.key === key ? fetched.options : []);
  const error = errorState?.key === key ? errorState.message : null;

  useEffect(() => {
    if (!def || !ready) {
      return;
    }
    if (cache.get(key)) {
      return;
    }

    let active = true;

    const params: Record<string, string | number> = { per_page: 200 };
    if (depParam && hasDep) {
      params[depParam] = depends as string | number;
    }

    apiFetch<{ data: Record<string, unknown>[] }>(
      `${def.endpoint}${buildQuery(params)}`,
      { campusId }
    )
      .then((response) => {
        if (!active) {
          return;
        }
        const mapped: SelectOption[] = response.data.map((item) => ({
          value: item.id as number,
          label: String(
            item[def.labelKey ?? "name"] ?? item.name ?? item.id ?? ""
          ),
        }));
        cache.set(key, mapped);
        setFetched({ key, options: mapped });
        setErrorState(null);
      })
      .catch(() => {
        if (active) {
          setFetched({ key, options: [] });
          setErrorState({ key, message: t("admin.errors.loadOptions") });
        }
      });

    return () => {
      active = false;
    };
  }, [name, key, campusId, ready, def, depParam, hasDep, depends, t]);

  return { options, loading: pending, error };
}
