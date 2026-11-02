export type ReportGranularity = "day" | "week" | "month" | "year" | "all";

export const REPORT_GRANULARITIES: {
  value: ReportGranularity;
  label: string;
  short: string;
}[] = [
  { value: "day", label: "Daily", short: "Day" },
  { value: "week", label: "Weekly", short: "Week" },
  { value: "month", label: "Monthly", short: "Month" },
  { value: "year", label: "Yearly", short: "Year" },
  { value: "all", label: "Overall", short: "All" },
];

export interface ReportFilterState {
  granularity: ReportGranularity;
  from: string;
  to: string;
}

export function buildReportQuery(filters: object): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    params.set(key, String(value));
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

/**
 * A human label for the chosen window, used in the on-screen summary and on
 * the printed header before the API response arrives.
 */
export function describePeriod(
  granularity: ReportGranularity,
  from: string,
  to: string
): string {
  if (from || to) {
    const start = from ? formatShortDate(from) : "the beginning";
    const end = to ? formatShortDate(to) : "today";

    return `${start} - ${end}`;
  }

  const now = new Date();

  switch (granularity) {
    case "day":
      return formatShortDate(now.toISOString().slice(0, 10));
    case "week": {
      const start = new Date(now);
      const weekday = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - weekday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      return `${formatShortDate(start.toISOString().slice(0, 10))} - ${formatShortDate(
        end.toISOString().slice(0, 10)
      )}`;
    }
    case "month":
      return now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    case "year":
      return String(now.getFullYear());
    default:
      return "All time";
  }
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Granularities that a report actually supports. */
export function granularitiesFor(
  supported: ReportGranularity[]
): typeof REPORT_GRANULARITIES {
  return REPORT_GRANULARITIES.filter((option) =>
    supported.includes(option.value)
  );
}
