"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "@eis/i18n";
import { Card } from "@/components/ui";
import { useTr } from "@/lib/i18n";

/**
 * Chart palette resolved from the HeroUI theme tokens so every chart follows
 * the active color mode and accent colour. Presentation attributes cannot
 * carry var(), so the tokens are measured once and re-measured whenever the
 * appearance attributes on <html> change.
 */
const TOKENS = [
  "--accent",
  "--success",
  "--warning",
  "--danger",
  "--muted",
  "--border",
  "--foreground",
] as const;

type TokenName = (typeof TOKENS)[number];

const FALLBACKS: Record<TokenName, string> = {
  "--accent": "#6366f1",
  "--success": "#10b981",
  "--warning": "#f59e0b",
  "--danger": "#f43f5e",
  "--muted": "#6b7280",
  "--border": "#e5e7eb",
  "--foreground": "#111827",
};

export type ChartColors = Record<TokenName, string>;

export function useChartColors(): ChartColors {
  const read = (): ChartColors => {
    const colors = { ...FALLBACKS };

    if (typeof window === "undefined") {
      return colors;
    }

    const style = getComputedStyle(document.documentElement);

    for (const token of TOKENS) {
      const value = style.getPropertyValue(token).trim();

      if (value) {
        colors[token] = value;
      }
    }

    return colors;
  };

  const [colors, setColors] = useState<ChartColors>(read);

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(read()));

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-accent", "data-mode", "data-background"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tr = useTr();

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-secondary px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{tr(title)}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted">{tr(description)}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="px-4 pb-4 pt-5 sm:px-5">{children}</div>
    </Card>
  );
}

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  formatValue = (value) => String(value),
}: {
  data: DonutSlice[];
  centerValue?: string;
  centerLabel?: string;
  formatValue?: (value: number) => string;
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return <ChartPlaceholder />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-56">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="95%"
              paddingAngle={3}
              cornerRadius={6}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    rows={[
                      {
                        label: payload[0].name as string,
                        value: formatValue(Number(payload[0].value)),
                        color: payload[0].payload.color as string,
                      },
                    ]}
                  />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-foreground">
            {centerValue ?? formatValue(total)}
          </span>
          {centerLabel ? (
            <span className="mt-0.5 text-xs text-muted">{centerLabel}</span>
          ) : null}
        </div>
      </div>

      <ul className="flex w-full flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-muted">{slice.label}</span>
            <span className="font-medium text-foreground">
              {formatValue(slice.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type BarPoint = {
  label: string;
  value: number;
};

export function BarStatChart({
  data,
  color,
  formatValue = (value) => String(value),
  height = 230,
}: {
  data: BarPoint[];
  color?: string;
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const colors = useChartColors();

  if (data.every((point) => point.value === 0)) {
    return <ChartPlaceholder />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke={colors["--border"]}
          strokeDasharray="4 4"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: colors["--muted"] }}
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: colors["--muted"] }}
          tickFormatter={(value: number) => formatValue(value)}
        />
        <Tooltip
          cursor={{ fill: colors["--border"], opacity: 0.4 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <ChartTooltip
                rows={[
                  {
                    label: String(label),
                    value: formatValue(Number(payload[0].value)),
                    color,
                  },
                ]}
              />
            ) : null
          }
        />
        <Bar
          dataKey="value"
          fill={color ?? colors["--accent"]}
          radius={[6, 6, 0, 0]}
          maxBarSize={44}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({
  data,
  color,
  formatValue = (value) => String(value),
  height = 230,
}: {
  data: BarPoint[];
  color?: string;
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const colors = useChartColors();
  const stroke = color ?? colors["--accent"];

  if (data.every((point) => point.value === 0)) {
    return <ChartPlaceholder />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke={colors["--border"]}
          strokeDasharray="4 4"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: colors["--muted"] }}
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: colors["--muted"] }}
          tickFormatter={(value: number) => formatValue(value)}
        />
        <Tooltip
          cursor={{ stroke: colors["--muted"], strokeDasharray: "4 4" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <ChartTooltip
                rows={[
                  {
                    label: String(label),
                    value: formatValue(Number(payload[0].value)),
                    color: stroke,
                  },
                ]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2.5}
          fill="url(#trendFill)"
          dot={{ r: 3, fill: stroke, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export type SeriesKey = {
  key: string;
  label: string;
  color: string;
};

export function GroupedBarsChart({
  data,
  series,
  formatValue = (value) => String(value),
  height = 260,
}: {
  data: Record<string, string | number>[];
  series: SeriesKey[];
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const colors = useChartColors();

  if (data.every((row) => series.every((item) => !Number(row[item.key])))) {
    return <ChartPlaceholder />;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke={colors["--border"]}
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: colors["--muted"] }}
            interval={0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: colors["--muted"] }}
            tickFormatter={(value: number) => formatValue(value)}
          />
          <Tooltip
            cursor={{ fill: colors["--border"], opacity: 0.4 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltip
                  rows={payload.map((entry) => {
                    const item = series.find(
                      (candidate) => candidate.key === entry.dataKey
                    );

                    return {
                      label: item?.label ?? String(entry.dataKey),
                      value: formatValue(Number(entry.value)),
                      color: item?.color,
                    };
                  })}
                  title={String(label)}
                />
              ) : null
            }
          />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              fill={item.color}
              radius={[5, 5, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {series.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartTooltip({
  rows,
  title,
}: {
  rows: { label: string; value: string; color?: string }[];
  title?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
      {title ? (
        <p className="mb-1 text-xs font-semibold text-foreground">{title}</p>
      ) : null}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-xs">
            {row.color ? (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            <span className="text-muted">{row.label}</span>
            <span className="font-semibold text-foreground">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartPlaceholder() {
  const { t } = useTranslation();

  return (
    <div
      className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted"
      style={{ borderColor: "var(--border)" }}
    >
      {t("dashboard.noChartData")}
    </div>
  );
}
