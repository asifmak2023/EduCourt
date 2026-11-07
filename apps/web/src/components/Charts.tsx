"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
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
 * Chart palette resolved from the theme tokens so every chart follows the
 * active color mode and accent colour. Presentation attributes cannot carry
 * var(), so the tokens are measured once and re-measured whenever the
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
  "--panel",
  "--panel-muted",
  "--canvas",
  "--obsidian",
  "--obsidian-foreground",
  "--amber",
  "--amber-foreground",
  "--mint",
  "--coral",
  "--hairline",
] as const;

type TokenName = (typeof TOKENS)[number];

const FALLBACKS: Record<TokenName, string> = {
  "--accent": "#6366f1",
  "--success": "#10b981",
  "--warning": "#f59e0b",
  "--danger": "#f43f5e",
  "--muted": "#6b7280",
  "--border": "#e2e8f0",
  "--foreground": "#181b26",
  "--panel": "#ffffff",
  "--panel-muted": "#f3f3ff",
  "--canvas": "#f4f6fa",
  "--obsidian": "#11141f",
  "--obsidian-foreground": "#eff0ff",
  "--amber": "#f8be28",
  "--amber-foreground": "#14100a",
  "--mint": "#00e5be",
  "--coral": "#f97316",
  "--hairline": "#e2e8f0",
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
      attributeFilter: [
        "class",
        "data-theme",
        "data-accent",
        "data-vibrant-palette",
        "data-background",
        "data-glass",
      ],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}

export function ChartCard({
  title,
  description,
  action,
  footer,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tr = useTr();

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {tr(title)}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-muted">{tr(description)}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="flex flex-1 flex-col px-3 pb-5 pt-4 sm:px-5">{children}</div>
      {footer ? (
        <div className="border-t border-border-secondary px-6 py-3">{footer}</div>
      ) : null}
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
  emptyAsGraph = false,
}: {
  data: DonutSlice[];
  centerValue?: string;
  centerLabel?: string;
  formatValue?: (value: number) => string;
  emptyAsGraph?: boolean;
}) {
  const colors = useChartColors();
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0 && !emptyAsGraph) {
    return <ChartPlaceholder />;
  }

  const pieData =
    total === 0
      ? [{ label: "empty", value: 1, color: colors["--hairline"] }]
      : data;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-[200px] w-[200px] max-w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="label"
              innerRadius="70%"
              outerRadius="98%"
              paddingAngle={total === 0 ? 0 : 4}
              cornerRadius={8}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length && total > 0 ? (
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <span className="lw-kpi-value text-2xl leading-none text-foreground">
            {centerValue ?? formatValue(total)}
          </span>
          {centerLabel ? (
            <span className="mt-1.5 max-w-full text-[9px] font-semibold uppercase leading-tight tracking-normal text-muted">
              {centerLabel}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="flex w-full flex-col gap-1.5">
        {data.map((slice) => (
          <li
            key={slice.label}
            className="flex items-center justify-between gap-2 rounded-full px-2.5 py-1 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate text-muted">{slice.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-foreground">
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
  color?: string;
};

/**
 * Recharts needs an explicit Y-axis width. Estimate it from the widest tick
 * label so long currency values ("PKR 220,000") are never clipped.
 */
function axisWidth(values: number[], formatValue: (value: number) => string): number {
  const longest = values.reduce((max, value) => {
    const text = formatValue(value);
    return text.length > max ? text.length : max;
  }, 0);

  return Math.min(110, Math.max(40, longest * 6.4 + 16));
}

export function BarStatChart({
  data,
  color,
  formatValue = (value) => String(value),
  height = 230,
  glow = false,
}: {
  data: BarPoint[];
  color?: string;
  formatValue?: (value: number) => string;
  height?: number;
  glow?: boolean;
}) {
  const colors = useChartColors();
  const gradientId = `bar-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fill = color ?? colors["--accent"];
  const yWidth = axisWidth(
    data.map((point) => point.value),
    formatValue
  );

  if (data.every((point) => point.value === 0)) {
    return <ChartPlaceholder />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 6, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={1} />
            <stop offset="100%" stopColor={fill} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke={colors["--hairline"]}
          strokeDasharray="3 6"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: colors["--muted"] }}
          interval={0}
            dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={yWidth}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: colors["--muted"] }}
          tickFormatter={(value: number) => formatValue(value)}
        />
        <Tooltip
          cursor={{ fill: colors["--hairline"], opacity: 0.35 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <ChartTooltip
                rows={[
                  {
                    label: String(label),
                    value: formatValue(Number(payload[0].value)),
                    color: fill,
                  },
                ]}
              />
            ) : null
          }
        />
        <Bar
          dataKey="value"
          fill={`url(#${gradientId})`}
          radius={[12, 12, 4, 4]}
          maxBarSize={64}
          style={
            glow
              ? { filter: "drop-shadow(0 0 8px rgb(0 229 190 / 0.45))" }
              : undefined
          }
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export type SeriesKey = {
  key: string;
  label: string;
  color: string;
};

/**
 * Single-series bar chart where each bar carries its own colour, so mixed
 * income/expense line items can be compared in one place without rendering
 * the empty zero-height bars that a multi-series grouping would produce.
 */
export function CategoryBarsChart({
  data,
  formatValue = (value) => String(value),
  height = 260,
  emptyAsGraph = false,
}: {
  data: BarPoint[];
  formatValue?: (value: number) => string;
  height?: number;
  emptyAsGraph?: boolean;
}) {
  const colors = useChartColors();
  const isEmpty = data.length === 0 || data.every((point) => !point.value);
  const yWidth = axisWidth(
    data.map((point) => point.value),
    formatValue
  );

  if (isEmpty && !emptyAsGraph) {
    return <ChartPlaceholder />;
  }

  const chartData = data.length === 0 ? [{ label: "—", value: 0 }] : data;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 8, left: 6, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke={colors["--hairline"]}
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: colors["--muted"] }}
            interval={0}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={yWidth}
            allowDecimals={false}
            domain={isEmpty ? [0, 4] : [0, "auto"]}
            tick={{ fontSize: 11, fill: colors["--muted"] }}
            tickFormatter={(value: number) => formatValue(value)}
          />
          <Tooltip
            cursor={{ fill: colors["--hairline"], opacity: 0.35 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltip
                  rows={[
                    {
                      label: String(label),
                      value: formatValue(Number(payload[0].value)),
                      color: payload[0].payload.color as string,
                    },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="value" radius={[8, 8, 3, 3]} maxBarSize={56}>
            {chartData.map((point, index) => (
              <Cell
                key={`${point.label}-${index}`}
                fill={point.color ?? colors["--accent"]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Bare axis-less sparkline for KPI tiles and compact stat rows. */
export function Sparkline({
  values,
  color,
  height = 40,
  className = "",
}: {
  values: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const colors = useChartColors();
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const stroke = color ?? colors["--accent"];

  if (values.length < 2 || values.every((value) => value === 0)) {
    return (
      <div
        aria-hidden="true"
        className={`flex items-end gap-1 ${className}`}
        style={{ height }}
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className="flex-1 rounded-full"
            style={{
              height: `${18 + ((index * 7) % 26)}%`,
              backgroundColor: colors["--hairline"],
              opacity: 0.7,
            }}
          />
        ))}
      </div>
    );
  }

  const data = values.map((value, index) => ({ index, value }));

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Proportional mini bar strip for "top N" rankings inside cards. */
export function SparkBars({
  data,
  color,
  formatValue = (value) => String(value),
  className = "",
}: {
  data: BarPoint[];
  color?: string;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const colors = useChartColors();
  const fill = color ?? colors["--accent"];
  const max = Math.max(...data.map((point) => point.value), 1);

  if (data.length === 0) {
    return null;
  }

  return (
    <ul className={`space-y-2.5 ${className}`}>
      {data.map((point) => (
        <li key={point.label} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium text-muted">{point.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">
              {formatValue(point.value)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(4, (point.value / max) * 100)}%`,
                backgroundColor: fill,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Chart body shown when a series has no movement, so the card never looks broken. */
export function ChartEmpty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary text-muted">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M4 16.5 9 11l3.5 3.5L20 6.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 20h16"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint ? <p className="max-w-xs text-xs text-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

export function TrendChart({
  data,
  color,
  series,
  formatValue = (value) => String(value),
  height = 230,
}: {
  data: Record<string, string | number>[];
  color?: string;
  series?: SeriesKey[];
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const colors = useChartColors();
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const resolved: SeriesKey[] =
    series && series.length > 0
      ? series
      : [
          {
            key: "value",
            label: "",
            color: color ?? colors["--accent"],
          },
        ];

  const isEmpty =
    data.length === 0 ||
    data.every((row) =>
      resolved.every((item) => !Number(row[item.key]))
    );

  const yWidth = axisWidth(
    data.flatMap((row) => resolved.map((item) => Number(row[item.key]) || 0)),
    formatValue
  );

  if (isEmpty) {
    return <ChartPlaceholder />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: 6, bottom: 0 }}>
        <defs>
          {resolved.map((item) => (
            <linearGradient
              key={item.key}
              id={`${gradientId}-${item.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={item.color} stopOpacity={0.38} />
              <stop offset="60%" stopColor={item.color} stopOpacity={0.12} />
              <stop offset="100%" stopColor={item.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid
          vertical={false}
          stroke={colors["--hairline"]}
          strokeDasharray="3 6"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: colors["--muted"] }}
          interval="preserveStartEnd"
          minTickGap={16}
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={yWidth}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: colors["--muted"] }}
          tickFormatter={(value: number) => formatValue(value)}
        />
        <Tooltip
          cursor={{ stroke: colors["--muted"], strokeDasharray: "4 4" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <ChartTooltip
                title={String(label)}
                rows={payload.map((entry) => {
                  const item = resolved.find(
                    (candidate) => candidate.key === entry.dataKey
                  );

                  return {
                    label: item?.label || "",
                    value: formatValue(Number(entry.value)),
                    color: item?.color ?? String(entry.color ?? ""),
                  };
                })}
              />
            ) : null
          }
        />
        {resolved.map((item) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={3}
            fill={`url(#${gradientId}-${item.key})`}
            dot={
              data.length <= 8
                ? {
                    r: 3.5,
                    fill: item.color,
                    stroke: colors["--panel"],
                    strokeWidth: 2,
                  }
                : false
            }
            activeDot={{
              r: 5,
              fill: item.color,
              stroke: colors["--panel"],
              strokeWidth: 3,
            }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GroupedBarsChart({
  data,
  series,
  formatValue = (value) => String(value),
  height = 260,
  emptyAsGraph = false,
}: {
  data: Record<string, string | number>[];
  series: SeriesKey[];
  formatValue?: (value: number) => string;
  height?: number;
  emptyAsGraph?: boolean;
}) {
  const colors = useChartColors();
  const isEmpty =
    data.length === 0 ||
    data.every((row) => series.every((item) => !Number(row[item.key])));

  const yWidth = axisWidth(
    data.flatMap((row) => series.map((item) => Number(row[item.key]) || 0)),
    formatValue
  );

  if (isEmpty && !emptyAsGraph) {
    return <ChartPlaceholder />;
  }

  const chartData = data.length === 0 ? [{ label: "—" }] : data;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 8, left: 6, bottom: 0 }}
          barGap={4}
        >
          <CartesianGrid
            vertical={false}
            stroke={colors["--hairline"]}
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: colors["--muted"] }}
            interval={0}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={yWidth}
            allowDecimals={false}
            domain={isEmpty ? [0, 4] : [0, "auto"]}
            tick={{ fontSize: 11, fill: colors["--muted"] }}
            tickFormatter={(value: number) => formatValue(value)}
          />
          <Tooltip
            cursor={{ fill: colors["--hairline"], opacity: 0.35 }}
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
              radius={[8, 8, 3, 3]}
              maxBarSize={56}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend series={series} />
    </div>
  );
}

export function ChartLegend({ series }: { series: SeriesKey[] }) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-1 gap-y-1">
      {series.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-2 rounded-full bg-surface-secondary px-3 py-1 text-[11px] font-semibold text-foreground"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Stacked "equalizer" pills, tuned for the obsidian telemetry tiles.
 *
 * Two modes:
 * - "proportion" (default) draws a fixed number of segments and fills a share
 *   of them, which is right for relative magnitudes.
 * - "count" draws one lit pill per unit of data, capped at `maxDots`, so the
 *   number of pills matches the real value (e.g. admissions per status).
 */
export function EqualizerChart({
  data,
  segments = 5,
  formatValue = (value) => String(value),
  accent,
  height = 150,
  mode = "proportion",
  maxDots = 12,
}: {
  data: BarPoint[];
  segments?: number;
  formatValue?: (value: number) => string;
  accent?: string;
  height?: number;
  mode?: "proportion" | "count";
  maxDots?: number;
}) {
  const colors = useChartColors();
  const lit = accent ?? colors["--mint"];
  const max = Math.max(...data.map((point) => point.value), 1);

  if (data.length === 0) {
    return <ChartPlaceholder dark />;
  }

  const labelArea = 24;
  const columnHeight = Math.max(height - labelArea, 0);

  return (
    <div
      className="flex w-full items-end justify-between gap-2 px-1"
      style={{ height }}
    >
      {data.map((point, index) => {
        const value = Math.max(0, Math.round(point.value));

        let litCount: number;
        let pillCount: number;
        let overflow = 0;

        if (mode === "count") {
          litCount = Math.min(value, maxDots);
          overflow = Math.max(0, value - maxDots);
          pillCount = litCount;
        } else {
          litCount = Math.max(
            value > 0 ? 1 : 0,
            Math.round((value / max) * segments)
          );
          pillCount = segments;
        }

        const isPeak = mode === "proportion"
          ? litCount === segments && value === max
          : value === max && value > 0;

        const gap = pillCount > 8 ? 3 : 5;
        const pillHeight = Math.max(
          4,
          Math.min(
            18,
            Math.floor((columnHeight - (pillCount - 1) * gap) / pillCount)
          )
        );

        return (
          <div
            key={`${point.label}-${index}`}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
            title={`${point.label}: ${formatValue(value)}`}
          >
            <div
              className="relative flex w-full flex-col-reverse items-center"
              style={{ gap }}
            >
              {Array.from({ length: pillCount }).map((_, segment) => {
                const active = segment < litCount;

                return (
                  <span
                    key={segment}
                    className="w-full max-w-[18px] rounded-full transition-colors"
                    style={{
                      height: pillHeight,
                      backgroundColor: active
                        ? isPeak
                          ? colors["--mint"]
                          : lit
                        : "rgb(255 255 255 / 0.1)",
                      filter:
                        active && isPeak
                          ? "drop-shadow(0 0 10px rgb(66 253 213 / 0.7))"
                          : undefined,
                    }}
                  />
                );
              })}
              {overflow > 0 ? (
                <span className="mt-1 text-[9px] font-semibold text-white/55">
                  +{overflow}
                </span>
              ) : null}
            </div>
            <span
              className={`flex min-h-[24px] w-full items-end justify-center text-center text-[10px] font-semibold leading-[1.15] ${
                isPeak ? "text-mint" : "text-white/45"
              }`}
            >
              <span className="line-clamp-2">{point.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal proportion bar used for two-way splits (e.g. boys vs girls). */
export function ProportionBar({
  data,
  formatValue = (value) => String(value),
}: {
  data: DonutSlice[];
  formatValue?: (value: number) => string;
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return <ChartPlaceholder />;
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-secondary">
        {data.map((slice) => (
          <span
            key={slice.label}
            style={{
              width: `${(slice.value / total) * 100}%`,
              backgroundColor: slice.color,
            }}
            title={`${slice.label}: ${formatValue(slice.value)}`}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate text-muted">{slice.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatValue(slice.value)}
              <span className="ml-1 text-[11px] font-medium text-muted">
                {Math.round((slice.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ring gauge for KPI cards: value against an optional target. */export function RadialGauge({
  value,
  max = 100,
  label,
  color,
  size = 56,
}: {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  size?: number;
}) {
  const colors = useChartColors();
  const stroke = color ?? colors["--accent"];
  const safeMax = max <= 0 ? 1 : max;
  const pct = Math.min(1, Math.max(0, value / safeMax));
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors["--panel-muted"]}
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      {label ? (
        <span className="absolute text-[10px] font-bold tabular-nums text-foreground">
          {label}
        </span>
      ) : null}
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
    <div className="rounded-2xl border border-white/10 bg-obsidian px-3.5 py-2.5 shadow-[0_20px_40px_-12px_rgba(17,20,31,0.35)]">
      {title ? (
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/60">
          {title}
        </p>
      ) : null}
      <ul className="space-y-1">
        {rows.map((row, index) => (
          <li
            key={`${row.label}-${index}`}
            className="flex items-center gap-2 text-xs"
          >
            {row.color ? (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            {row.label ? (
              <span className="text-white/60">{row.label}</span>
            ) : null}
            <span className="font-semibold tabular-nums text-white">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartPlaceholder({ dark = false }: { dark?: boolean }) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex h-32 items-center justify-center rounded-2xl border border-dashed text-xs ${
        dark
          ? "border-white/15 text-white/50"
          : "border-border text-muted"
      }`}
    >
      {t("dashboard.noChartData")}
    </div>
  );
}
