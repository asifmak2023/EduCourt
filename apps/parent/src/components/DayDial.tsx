"use client";

import type { TimetableSlot } from "@/lib/types";

const SCHOOL_START = toMinutes("07:45");
const SCHOOL_END = toMinutes("13:30");
const SWEEP = 330;
const START_ANGLE = 15;

function toMinutes(value?: string | null): number {
  if (!value) {
    return 0;
  }
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return 0;
  }
  return h * 60 + m;
}

function angleFor(minutes: number, start: number, end: number): number {
  const clamped = Math.min(Math.max(minutes, start), end);
  const span = end - start || 1;
  return START_ANGLE + ((clamped - start) / span) * SWEEP;
}

function polar(cx: number, cy: number, radius: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

function arc(cx: number, cy: number, radius: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, radius, startDeg);
  const [x2, y2] = polar(cx, cy, radius, endDeg);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

interface RingPeriod {
  key: string;
  name: string;
  starts: number;
  ends: number;
  isBreak: boolean;
}

function buildRing(slots: TimetableSlot[]): RingPeriod[] {
  const byId = new Map<number, RingPeriod>();
  slots.forEach((slot) => {
    const period = slot.period;
    if (!period) {
      return;
    }
    if (byId.has(period.id)) {
      return;
    }
    byId.set(period.id, {
      key: String(period.id),
      name: period.name ?? "P",
      starts: toMinutes(period.starts_at),
      ends: toMinutes(period.ends_at),
      isBreak: Boolean(period.is_break),
    });
  });
  return [...byId.values()].sort((a, b) => a.starts - b.starts);
}

export function DayDial({
  slots,
  now = new Date(),
}: {
  slots: TimetableSlot[];
  now?: Date;
}) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const ring = buildRing(slots);

  const windowStart = ring.length ? Math.min(...ring.map((p) => p.starts)) : SCHOOL_START;
  const windowEnd = ring.length ? Math.max(...ring.map((p) => p.ends)) : SCHOOL_END;

  const currentPeriod =
    ring.find((p) => nowMinutes >= p.starts && nowMinutes < p.ends) ?? null;
  const currentSlot =
    currentPeriod && !currentPeriod.isBreak
      ? slots.find(
          (s) => s.day_of_week === now.getDay() && s.period?.id === Number(currentPeriod.key)
        ) ?? null
      : null;
  const currentSubject = currentPeriod
    ? (currentSlot?.subject?.name ?? null)
    : null;

  const inSession = nowMinutes >= windowStart && nowMinutes <= windowEnd;
  const handAngle = angleFor(nowMinutes, windowStart, windowEnd);
  const [tipX, tipY] = polar(150, 150, 126, handAngle);
  const [baseX, baseY] = polar(150, 150, 92, handAngle);

  const centerTitle = currentPeriod
    ? currentPeriod.isBreak
      ? "Break"
      : (currentPeriod.name.match(/\d+/)?.[0]
          ? `P${currentPeriod.name.match(/\d+/)?.[0]}`
          : currentPeriod.name)
    : nowMinutes > windowEnd
      ? "Home"
      : "Soon";
  const centerSubtitle = currentPeriod
    ? currentPeriod.isBreak
      ? "Lunch & play"
      : (currentSubject ?? "")
    : nowMinutes > windowEnd
      ? "School day is over"
      : "Gates open 7:30";

  const ariaLabel = currentPeriod
    ? `Now: ${currentPeriod.isBreak ? "break" : `${currentPeriod.name}, ${currentSubject ?? "class"}`}, until ${formatMinutes(currentPeriod.ends)}`
    : "School day is over";

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[300px]"
      role="img"
      aria-label={ariaLabel}
    >
      <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible">
        {/* outer boundary */}
        <circle
          cx={150}
          cy={150}
          r={144}
          fill="none"
          stroke="var(--board-dim)"
          strokeOpacity={0.25}
          strokeWidth={1}
        />

        {/* period ring */}
        {ring.map((period) => {
          const start = angleFor(period.starts, windowStart, windowEnd) + 1.2;
          const end = angleFor(period.ends, windowStart, windowEnd) - 1.2;
          const isPast = nowMinutes >= period.ends;
          const isActive = currentPeriod?.key === period.key;
          const [labelX, labelY] = polar(150, 150, 156, (start + end) / 2);
          const label = period.isBreak
            ? "\u2615"
            : period.name.match(/\d+/)?.[0] ?? period.name.slice(0, 2);

          return (
            <g key={period.key}>
              <path
                d={arc(150, 150, 126, start, end)}
                fill="none"
                stroke={isActive ? "var(--marigold)" : "var(--board-ink)"}
                strokeOpacity={isActive ? 1 : isPast ? 0.85 : 0.18}
                strokeWidth={period.isBreak ? 4 : isActive ? 16 : 12}
                strokeLinecap="butt"
                className={isActive ? "dial-now" : undefined}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="central"
                className="font-[family-name:var(--font-display)]"
                fontSize={14}
                fontWeight={600}
                fill="var(--board-ink)"
                fillOpacity={isActive ? 1 : 0.55}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* school-day label */}
        <text
          x={150}
          y={22}
          textAnchor="middle"
          fontSize={12}
          fill="var(--board-dim)"
        >
          {compactTime(windowStart)} &middot; {compactTime(windowEnd)}
        </text>

        {/* live hand */}
        {inSession ? (
          <g style={{ transition: "all 1s linear" }}>
            <line
              x1={baseX}
              y1={baseY}
              x2={tipX}
              y2={tipY}
              stroke="var(--marigold)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle
              cx={tipX}
              cy={tipY}
              r={7}
              fill="var(--marigold)"
              stroke="var(--board)"
              strokeWidth={3}
            />
          </g>
        ) : null}
      </svg>

      {/* centre readout */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div className="px-6">
          {currentPeriod ? (
            <>
              <p className="font-[family-name:var(--font-display)] text-[56px] font-bold leading-none text-marigold">
                {centerTitle}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold uppercase tracking-wide text-board-ink">
                {centerSubtitle}
              </p>
              <p className="text-sm text-board-dim">
                until {formatMinutes(currentPeriod.ends)}
              </p>
            </>
          ) : (
            <>
              <p className="font-[family-name:var(--font-display)] text-5xl font-bold leading-none text-board-ink">
                {centerTitle}
              </p>
              <p className="mt-1 text-sm text-board-dim">{centerSubtitle}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function compactTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
