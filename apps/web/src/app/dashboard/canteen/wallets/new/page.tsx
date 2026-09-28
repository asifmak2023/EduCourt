"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useStudents } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";
import { Button, buttonClasses, Field, Select } from "@/components/Form";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";
import type { StudentWallet } from "@/lib/types";

export default function OpenWalletPage() {
  return (
    <PermissionGate permission="canteen.create">
      <OpenWalletForm />
    </PermissionGate>
  );
}

function OpenWalletForm() {
  const router = useRouter();
  const { items: students } = useStudents();
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!studentId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch<{ data: StudentWallet }>(
        `/v1/canteen/students/${studentId}/wallet`
      );
      router.push(`/dashboard/canteen/wallets/${response.data.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to open wallet."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <CanteenTabs active="wallets" />

      <PageHeader
        title="Open a student wallet"
        description="Pick a student; a wallet is created if one does not exist yet."
        actions={
          <Link
            href="/dashboard/canteen/wallets"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <Field label="Student" htmlFor="wallet_student" required>
          <Select
            id="wallet_student"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name} ({student.admission_no})
              </option>
            ))}
          </Select>
        </Field>

        <div className="mt-5 flex justify-end gap-2">
          <Link
            href="/dashboard/canteen/wallets"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
          <Button
            type="button"
            loading={busy}
            disabled={!studentId}
            onClick={submit}
          >
            Open wallet
          </Button>
        </div>
      </Card>
    </div>
  );
}
