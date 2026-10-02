"use client";

import { PhotoField } from "@/components/PhotoField";

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
  return (
    <PhotoField
      endpoint={`/v1/students/${studentId}/photo`}
      name={name}
      photoUrl={photoUrl}
      onChanged={onChanged}
      hint="JPG, PNG or WebP, up to 5 MB. Shown on the student record and as the student's avatar when they sign in."
    />
  );
}
