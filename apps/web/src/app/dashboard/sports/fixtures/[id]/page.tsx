"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { Button, buttonClasses, Field, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
} from "@/components/ui";
import type { SportFixture } from "@/lib/types";

export default function SportFixtureDetailPage() {
  return (
    <PermissionGate permission="sports.view">
      <FixtureDetailView />
    </PermissionGate>
  );
}

function FixtureDetailView() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<SportFixture>(
    params?.id ? `/v1/sports/fixtures/${params.id}` : null
  );

  const [ourScore, setOurScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Fixture not found." />;

  const recordResult = async () => {
    setBusy(true);
    setResultError(null);
    try {
      await apiFetch(`/v1/sports/fixtures/${data.id}/result`, {
        method: "POST",
        body: {
          our_score: Number(ourScore),
          opponent_score: Number(opponentScore),
          ...(remarks ? { remarks } : {}),
        },
      });
      setRemarks("");
      reload();
    } catch (err: unknown) {
      setResultError(
        err instanceof ApiError ? err.message : "Unable to record the result."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SportsTabs active="fixtures" />

      <PageHeader
        title={`vs ${data.opponent}`}
        description={data.sport?.name ?? undefined}
        actions={
          <>
            {can("sports.edit") ? (
              <Link
                href={`/dashboard/sports/fixtures/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/sports/fixtures"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <SectionCard title="Fixture">
        <DataList>
          <DataItem label="Sport" value={data.sport?.name ?? "-"} />
          <DataItem label="Team" value={data.team?.name ?? "-"} />
          <DataItem label="Date" value={data.fixture_date ?? "-"} />
          <DataItem
            label="Time"
            value={(data.start_time ?? "").slice(0, 5) || "-"}
          />
          <DataItem label="Home/Away" value={data.home_away ?? "-"} />
          <DataItem label="Venue" value={data.venue ?? "-"} />
          <DataItem
            label="Status"
            value={<Badge value={data.status ?? "unknown"} />}
          />
          <DataItem
            label="Score"
            value={
              data.our_score === null
                ? "-"
                : `${data.our_score} - ${data.opponent_score}`
            }
          />
          <DataItem
            label="Outcome"
            value={<Badge value={data.outcome ?? "pending"} />}
          />
          {data.remarks ? (
            <DataItem label="Remarks" value={data.remarks} />
          ) : null}
        </DataList>
      </SectionCard>

      {can("sports.edit") ? (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Record result
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Saving the score marks the fixture completed and derives the
            outcome.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Our score" htmlFor="our_score" required>
              <TextInput
                id="our_score"
                type="number"
                min="0"
                step="1"
                value={ourScore}
                onChange={(event) => setOurScore(event.target.value)}
              />
            </Field>
            <Field label="Opponent score" htmlFor="opponent_score" required>
              <TextInput
                id="opponent_score"
                type="number"
                min="0"
                step="1"
                value={opponentScore}
                onChange={(event) => setOpponentScore(event.target.value)}
              />
            </Field>
            <Field label="Remarks" htmlFor="result_remarks">
              <TextInput
                id="result_remarks"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
              />
            </Field>
          </div>
          {resultError ? (
            <div className="mt-4">
              <ErrorNotice message={resultError} />
            </div>
          ) : null}
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              loading={busy}
              disabled={ourScore === "" || opponentScore === ""}
              onClick={recordResult}
            >
              Save result
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
