"use client";

import { SectionCard } from "@/components/ui";

export function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: (string | number)[][];
}) {
  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No data for this selection.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={
                      cellIndex === 0
                        ? "py-2 capitalize text-slate-900"
                        : "py-2 text-right text-slate-600"
                    }
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
}
