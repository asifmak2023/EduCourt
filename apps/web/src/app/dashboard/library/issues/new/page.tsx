"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useBooks, useStudents, useUsers } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import {
  Card,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";

export default function NewBookIssuePage() {
  return (
    <PermissionGate permission="library.create">
      <IssueForm />
    </PermissionGate>
  );
}

function IssueForm() {
  const router = useRouter();
  const { items: books, loading: loadingBooks } = useBooks();
  const { items: students } = useStudents();
  const { items: users } = useUsers();

  const [bookId, setBookId] = useState("");
  const [memberType, setMemberType] = useState("student");
  const [studentId, setStudentId] = useState("");
  const [userId, setUserId] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [loanDays, setLoanDays] = useState("14");
  const [dueOn, setDueOn] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loadingBooks) return <Spinner />;

  const available = books.filter((book) => book.available_copies > 0);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: { id: number } }>(
        "/v1/library/issues",
        {
          method: "POST",
          body: {
            book_id: Number(bookId),
            member_type: memberType,
            ...(memberType === "student" && studentId
              ? { student_id: Number(studentId) }
              : {}),
            ...(memberType === "staff" && userId
              ? { user_id: Number(userId) }
              : {}),
            ...(issuedOn ? { issued_on: issuedOn } : {}),
            ...(dueOn
              ? { due_on: dueOn }
              : loanDays
                ? { loan_days: Number(loanDays) }
                : {}),
            ...(notes ? { notes } : {}),
          },
        }
      );
      router.push(`/dashboard/library/issues/${response.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to issue book.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue a book"
        description="Lend a copy and set the return date."
        actions={
          <Link
            href="/dashboard/library/issues"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Book" htmlFor="issue_book" required>
            <Select
              id="issue_book"
              value={bookId}
              onChange={(event) => setBookId(event.target.value)}
            >
              <option value="">Select book</option>
              {available.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} ({book.available_copies} available)
                </option>
              ))}
            </Select>
            {available.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                No copies are currently available.
              </p>
            ) : null}
          </Field>

          <Field label="Member type" htmlFor="issue_member_type" required>
            <Select
              id="issue_member_type"
              value={memberType}
              onChange={(event) => {
                setMemberType(event.target.value);
                setStudentId("");
                setUserId("");
              }}
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </Select>
          </Field>

          {memberType === "student" ? (
            <Field label="Student" htmlFor="issue_student" required>
              <Select
                id="issue_student"
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
          ) : (
            <Field label="Staff member" htmlFor="issue_user" required>
              <Select
                id="issue_user"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              >
                <option value="">Select staff</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Issued on" htmlFor="issue_issued_on">
            <TextInput
              id="issue_issued_on"
              type="date"
              value={issuedOn}
              onChange={(event) => setIssuedOn(event.target.value)}
            />
          </Field>

          <Field label="Loan days" htmlFor="issue_loan_days">
            <TextInput
              id="issue_loan_days"
              type="number"
              min="1"
              max="365"
              value={loanDays}
              onChange={(event) => setLoanDays(event.target.value)}
            />
          </Field>

          <Field
            label="Due on"
            htmlFor="issue_due_on"
            hint="Overrides the loan period when set."
          >
            <TextInput
              id="issue_due_on"
              type="date"
              value={dueOn}
              onChange={(event) => setDueOn(event.target.value)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="issue_notes">
              <TextArea
                id="issue_notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            loading={busy}
            disabled={
              !bookId ||
              (memberType === "student" ? !studentId : !userId)
            }
            onClick={submit}
          >
            Issue book
          </Button>
        </div>
      </Card>
    </div>
  );
}
