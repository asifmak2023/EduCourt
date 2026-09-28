"use client";

import { useState } from "react";
import { SportsTabs } from "@/components/SportsTabs";
import { Select, TextInput } from "@/components/Form";
import {
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
  StatCard,
} from "@/components/ui";
import { useResource } from "@/lib/useResource";
import { useSports } from "@/lib/useLookups";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { SportSummary } from "@/lib/types";

export default function SportReportsPage() {
  const { items: sports } = useSports();
  const [sportId, setSportId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = new URLSearchParams();
  if (sportId) query.set("sport_id", sportId);
  if (from) query.set("from", from);
  if (to) query.set("to", to);

  const { data, loading, error } = useResource<SportSummary>(
    `/v1/sports/reports/summary?${query.toString()}`
  );

  return (
    <div className="space-y-6">
      <SportsTabs active="reports" />

      <PageHeader
        title="Sports reports"
        description="Season overview of teams, fixtures, achievements and stock."
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-52">
          <Select
            value={sportId}
            onChange={(event) => setSportId(event.target.value)}
          >
            <option value="">All sports</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <TextInput
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="w-44">
          <TextInput
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}
      {loading ? <Spinner /> : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Teams" value={formatNumber(data.teams)} />
            <StatCard
              label="Active players"
              value={formatNumber(data.active_members)}
            />
            <StatCard
              label="Achievements"
              value={formatNumber(data.achievements)}
            />
            <StatCard
              label="Equipment value"
              value={formatCurrency(data.equipment.value)}
            />
          </div>

          <SectionCard title="Fixtures">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <StatCard label="Total" value={formatNumber(data.fixtures.total)} />
              <StatCard
                label="Scheduled"
                value={formatNumber(data.fixtures.scheduled)}
              />
              <StatCard
                label="Completed"
                value={formatNumber(data.fixtures.completed)}
              />
              <StatCard
                label="Cancelled"
                value={formatNumber(data.fixtures.cancelled)}
              />
              <StatCard
                label="Wins"
                value={formatNumber(data.fixtures.wins)}
                tone="positive"
              />
              <StatCard
                label="Losses"
                value={formatNumber(data.fixtures.losses)}
                tone="danger"
              />
              <StatCard
                label="Draws"
                value={formatNumber(data.fixtures.draws)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Equipment">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Items"
                value={formatNumber(data.equipment.items)}
              />
              <StatCard
                label="Total quantity"
                value={formatNumber(data.equipment.total_quantity)}
              />
              <StatCard
                label="Out of stock"
                value={formatNumber(data.equipment.out_of_stock)}
                tone={data.equipment.out_of_stock > 0 ? "danger" : "positive"}
              />
              <StatCard
                label="Value"
                value={formatCurrency(data.equipment.value)}
              />
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
