"use client";

import type { TimetableSlot } from "@/lib/types";

interface DialSegment {
  key: string;
  label: string;
  subject?: string;
  teacher?: string;
  start?: string;
  end?: string;
  periodName?: string;
  isBreak: boolean;
}

function toMinutes(value?: string): number | null {
  if (!value) {
    return null;
  }
  const parts = value.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }
  return h * 60 + m;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function DayDial({
  slots,
  now = new Date(),
}: {
  slots: TimetableSlot[];
  now?: Date;
}) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 26;

  const ordered = [...slots].sort(
    (a, b) =>
      (toMinutes(a.period?.starts_at) ?? 0) -
      (toMinutes(b.period?.starts_at) ?? 0)
  );

  const segments: DialSegment[] = ordered.map((slot, index) => ({
    key: String(slot.id ?? index),
    label: String(index + 1),
    subject: slot.subject?.name,
    teacher: slot.teacher?.name,
    start: slot.period?.starts_at?.slice(0, 5),
    end: slot.period?.ends_at?.slice(0, 5),
    periodName: slot.period?.name,
    isBreak: Boolean(slot.period?.is_break),
  }));

  if (segments.length === 0) {
    return (
      <div className="grid place-items-center" style={{ width: size, height: size }}>
        <div className="text-center text-board-dim">
          <p className="font-[family-name:var(--font-display)] text-lg">
            No classes today
          </p>
        </div>
      </div>
    );
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const gap = segments.length > 1 ? 2.5 : 0;
  const sweep = 360 / segments.length;

  let activeIndex = -1;
  segments.forEach((seg, i) => {
    const start = toMinutes(seg.start);
    const end = toMinutes(seg.end);
    if (start !== null && end !== null && nowMinutes >= start && nowMinutes < end) {
      activeIndex = i;
    }
  });

  const active = activeIndex >= 0 ? segments[activeIndex] : null;
  const handAngle = (nowMinutes / (24 * 60)) * 360;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const startDeg = i * sweep + gap / 2;
          const endDeg = (i + 1) * sweep - gap / 2;
          const mid = (startDeg + endDeg) / 2;
          const isActive = i === activeIndex;
          const isPast =
            activeIndex >= 0 &&
            i < activeIndex &&
            !isActive;
          const labelPos = polar(cx, cy, r + 15, mid);

          return (
            <g key={seg.key}>
              <path
                d={arcPath(cx, cy, r, startDeg, endDeg)}
                fill="none"
                stroke={
                  isActive
                    ? "var(--marigold)"
                    : isPast
                      ? "rgba(233,243,236,0.28)"
                      : "rgba(233,243,236,0.85)"
                }
                strokeWidth={isActive ? 15 : 11}
                strokeLinecap="round"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-[var(--board-dim)]"
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                {seg.label}
              </text>
            </g>
          );
        })}

        {/* clock hand */}
        <line
          x1={cx}
          y1={cy}
          x2={polar(cx, cy, r - 6, handAngle).x}
          y2={polar(cx, cy, r - 6, handAngle).y}
          stroke="var(--marigold)"
          strokeWidth={2}
          strokeLinecap="round"
          className="dial-now"
        />
        <circle cx={cx} cy={cy} r={4} fill="var(--marigold)" />
      </svg>

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="max-w-[62%] text-center">
          {active ? (
            <>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-[var(--marigold)]">
                {active.periodName?.match(/\d+/)?.[0]
                  ? `P${active.periodName.match(/\d+/)?.[0]}`
                  : active.label}
              </p>
              <p className="mt-1 truncate font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wide text-board-ink">
                {active.subject ?? active.periodName ?? "Class"}
              </p>
              {active.end ? (
                <p className="mt-0.5 text-xs text-board-dim">until {active.end}</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-board-ink/80">
                {now.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-1 text-xs text-board-dim">No class right now</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
