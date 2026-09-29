"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useAcademicOptions } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses } from "@/components/Form";
import {
  AdmissionFields,
  type AdmissionProfile,
} from "@/components/AdmissionFields";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { AdmissionDetail } from "@/lib/types";

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

export default function EditAdmissionPage() {
  return (
    <PermissionGate permission="admission.edit">
      <EditAdmissionLoader />
    </PermissionGate>
  );
}

function EditAdmissionLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<AdmissionDetail>(
    id ? `/v1/admissions/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Application not found." />;
  }

  return <EditAdmissionForm admission={data} />;
}

function profileFromAdmission(admission: AdmissionDetail): AdmissionProfile {
  return {
    first_name: admission.first_name ?? "",
    last_name: admission.last_name ?? "",
    gender: admission.gender ?? "",
    date_of_birth: admission.date_of_birth ?? "",
    class_room_id: admission.class_room_id
      ? String(admission.class_room_id)
      : "",
    academic_year_id: admission.academic_year_id
      ? String(admission.academic_year_id)
      : "",
    guardian_name: admission.guardian_name ?? "",
    guardian_phone: admission.guardian_phone ?? "",
    guardian_email: admission.guardian_email ?? "",
    guardian_relation: admission.guardian_relation ?? "",
    previous_school: admission.previous_school ?? "",
    address: admission.address ?? "",
    city: admission.city ?? "",
    applied_on: admission.applied_on ?? "",
    notes: admission.notes ?? "",
  };
}

function EditAdmissionForm({ admission }: { admission: AdmissionDetail }) {
  const router = useRouter();
  const { options, loading: optionsLoading } = useAcademicOptions();

  const [profile, setProfile] = useState<AdmissionProfile>(
    profileFromAdmission(admission)
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

      await apiFetch(`/v1/admissions/${admission.id}`, {
        method: "PUT",
        body: payload,
      });

      router.push(`/dashboard/admissions/${admission.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save application.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${admission.full_name}`}
        description={`Application no ${admission.application_no}`}
        actions={
          <Link
            href={`/dashboard/admissions/${admission.id}`}
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
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            <Link
              href={`/dashboard/admissions/${admission.id}`}
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
