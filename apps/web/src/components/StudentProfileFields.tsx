"use client";

import { Field, Select, TextArea, TextInput } from "@/components/Form";

export interface StudentProfile {
  first_name: string;
  last_name: string;
  admission_no: string;
  gender: string;
  date_of_birth: string;
  blood_group: string;
  nationality: string;
  religion: string;
  category: string;
  national_id: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  previous_school: string;
  admission_date: string;
  status: string;
  notes: string;
}

export function emptyStudentProfile(): StudentProfile {
  return {
    first_name: "",
    last_name: "",
    admission_no: "",
    gender: "",
    date_of_birth: "",
    blood_group: "",
    nationality: "",
    religion: "",
    category: "",
    national_id: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    previous_school: "",
    admission_date: "",
    status: "active",
    notes: "",
  };
}

export function StudentProfileFields({
  profile,
  set,
  errors,
  admissionHint = false,
}: {
  profile: StudentProfile;
  set: (key: keyof StudentProfile, value: string) => void;
  errors: (name: string) => string | null;
  admissionHint?: boolean;
}) {
  return (
    <div className="border-b border-slate-100 px-6 py-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">
        Student profile
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label="First name"
          htmlFor="first_name"
          required
          error={errors("first_name")}
        >
          <TextInput
            id="first_name"
            value={profile.first_name}
            onChange={(event) => set("first_name", event.target.value)}
          />
        </Field>
        <Field
          label="Last name"
          htmlFor="last_name"
          required
          error={errors("last_name")}
        >
          <TextInput
            id="last_name"
            value={profile.last_name}
            onChange={(event) => set("last_name", event.target.value)}
          />
        </Field>
        <Field
          label="Gender"
          htmlFor="gender"
          required
          error={errors("gender")}
        >
          <Select
            id="gender"
            value={profile.gender}
            onChange={(event) => set("gender", event.target.value)}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field
          label="Admission no"
          htmlFor="admission_no"
          hint={admissionHint ? "Leave blank to auto-generate." : undefined}
          error={errors("admission_no")}
        >
          <TextInput
            id="admission_no"
            value={profile.admission_no}
            onChange={(event) => set("admission_no", event.target.value)}
          />
        </Field>
        <Field
          label="Date of birth"
          htmlFor="date_of_birth"
          error={errors("date_of_birth")}
        >
          <TextInput
            id="date_of_birth"
            type="date"
            value={profile.date_of_birth}
            onChange={(event) => set("date_of_birth", event.target.value)}
          />
        </Field>
        <Field label="Blood group" htmlFor="blood_group">
          <TextInput
            id="blood_group"
            value={profile.blood_group}
            onChange={(event) => set("blood_group", event.target.value)}
          />
        </Field>
        <Field label="Nationality" htmlFor="nationality">
          <TextInput
            id="nationality"
            value={profile.nationality}
            onChange={(event) => set("nationality", event.target.value)}
          />
        </Field>
        <Field label="Religion" htmlFor="religion">
          <TextInput
            id="religion"
            value={profile.religion}
            onChange={(event) => set("religion", event.target.value)}
          />
        </Field>
        <Field label="Category" htmlFor="category">
          <TextInput
            id="category"
            value={profile.category}
            onChange={(event) => set("category", event.target.value)}
          />
        </Field>
        <Field label="National ID" htmlFor="national_id">
          <TextInput
            id="national_id"
            value={profile.national_id}
            onChange={(event) => set("national_id", event.target.value)}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={errors("email")}>
          <TextInput
            id="email"
            type="email"
            value={profile.email}
            onChange={(event) => set("email", event.target.value)}
          />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <TextInput
            id="phone"
            value={profile.phone}
            onChange={(event) => set("phone", event.target.value)}
          />
        </Field>
        <Field label="City" htmlFor="city">
          <TextInput
            id="city"
            value={profile.city}
            onChange={(event) => set("city", event.target.value)}
          />
        </Field>
        <Field
          label="Previous school"
          htmlFor="previous_school"
          className="sm:col-span-2"
        >
          <TextInput
            id="previous_school"
            value={profile.previous_school}
            onChange={(event) => set("previous_school", event.target.value)}
          />
        </Field>
        <Field
          label="Admission date"
          htmlFor="admission_date"
          error={errors("admission_date")}
        >
          <TextInput
            id="admission_date"
            type="date"
            value={profile.admission_date}
            onChange={(event) => set("admission_date", event.target.value)}
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={profile.status}
            onChange={(event) => set("status", event.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
            <option value="transferred">Transferred</option>
            <option value="withdrawn">Withdrawn</option>
          </Select>
        </Field>
        <Field
          label="Address"
          htmlFor="address"
          className="sm:col-span-2 lg:col-span-3"
        >
          <TextArea
            id="address"
            value={profile.address}
            onChange={(event) => set("address", event.target.value)}
          />
        </Field>
        <Field
          label="Notes"
          htmlFor="notes"
          className="sm:col-span-2 lg:col-span-3"
        >
          <TextArea
            id="notes"
            value={profile.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}
