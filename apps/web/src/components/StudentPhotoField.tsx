"use client";

import { useRef, useState } from "react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Form";
import { ErrorNotice, SuccessNotice } from "@/components/ui";
import type { StudentDetail } from "@/lib/types";

export function StudentPhotoField({
  studentId,
  name,
  photoUrl,
  onChanged,
}: {
  studentId: number;
  name: string;
  photoUrl: string | null;
  onChanged: (photoUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    setDone(null);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const response = await apiUpload<{ data: StudentDetail }>(
        `/v1/students/${studentId}/photo`,
        formData
      );
      onChanged(response.data.photo_url ?? null);
      setDone("Profile photo updated.");
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to upload the photo."
      );
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    setDone(null);

    try {
      await apiFetch(`/v1/students/${studentId}/photo`, { method: "DELETE" });
      onChanged(null);
      setDone("Profile photo removed.");
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to remove the photo."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 py-5">
      <h2 className="text-sm font-semibold text-foreground">Profile photo</h2>
      <p className="mt-0.5 text-xs text-muted">
        JPG, PNG or WebP, up to 5 MB. Shown on the student record and as the
        student&apos;s avatar when they sign in.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <Avatar name={name} photoUrl={photoUrl} size="lg" />

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void upload(file);
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            loading={busy}
            onClick={() => inputRef.current?.click()}
          >
            {photoUrl ? "Replace photo" : "Upload photo"}
          </Button>
          {photoUrl ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void remove()}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      {done ? (
        <div className="mt-4">
          <SuccessNotice message={done} />
        </div>
      ) : null}
    </div>
  );
}
