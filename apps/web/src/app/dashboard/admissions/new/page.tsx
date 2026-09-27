"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAcademicOptions } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses } from "@/components/Form";
import {
  AdmissionFields,
  emptyAdmissionProfile,
  type AdmissionProfile,
} from "@/components/AdmissionFields";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";

function prune(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === "" || value === undefined || value === null) {
      continue;
    }

    output[key] = value;
  }

  return output;
}

export default function NewAdmissionPage() {
  return (
    <PermissionGate permission="admission.create">
      <NewAdmissionForm />
    </PermissionGate>
  );
}

function NewAdmissionForm() {
  const router = useRouter();
  const { options, loading: optionsLoading } = useAcademicOptions();

  const [profile, setProfile] = useState<AdmissionProfile>(
    emptyAdmissionProfile()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const set = (key: keyof AdmissionProfile, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const payload = prune({
        ...profile,
        class_room_id: profile.class_room_id
          ? Number(profile.class_room_id)
          : "",
        academic_year_id: profile.academic_year_id
          ? Number(profile.academic_year_id)
          : "",
      });

      const created = await apiFetch<{ data: { id: number } }>(
        "/v1/admissions",
        {
          method: "POST",
          body: payload,
        }
      );

      router.push(`/dashboard/admissions/${created.data.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to create application.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New application"
        description="Capture an enquiry or application for admission."
        actions={
          <Link
            href="/dashboard/admissions"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <AdmissionFields
            profile={profile}
            set={set}
            errors={errText}
            options={options}
            optionsLoading={optionsLoading}
          />
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              href="/dashboard/admissions"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              Create application
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
