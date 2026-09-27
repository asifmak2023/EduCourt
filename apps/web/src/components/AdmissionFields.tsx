"use client";

import { Field, Select, TextArea, TextInput } from "@/components/Form";
import { Spinner } from "@/components/ui";
import type { AcademicOptions } from "@/lib/types";

export interface AdmissionProfile {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  class_room_id: string;
  academic_year_id: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_relation: string;
  previous_school: string;
  address: string;
  city: string;
  applied_on: string;
  notes: string;
}

export function emptyAdmissionProfile(): AdmissionProfile {
  return {
    first_name: "",
    last_name: "",
    gender: "",
    date_of_birth: "",
    class_room_id: "",
    academic_year_id: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    guardian_relation: "",
    previous_school: "",
    address: "",
    city: "",
    applied_on: "",
    notes: "",
  };
}

export function AdmissionFields({
  profile,
  set,
  errors,
  options,
  optionsLoading,
}: {
  profile: AdmissionProfile;
  set: (key: keyof AdmissionProfile, value: string) => void;
  errors: (name: string) => string | null;
  options: AcademicOptions;
  optionsLoading: boolean;
}) {
  return (
    <div className="space-y-8 px-6 py-5">
      <div>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Applicant
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
          <Field label="Gender" htmlFor="gender" error={errors("gender")}>
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
          <Field
            label="Applied on"
            htmlFor="applied_on"
            hint="Defaults to today."
            error={errors("applied_on")}
          >
            <TextInput
              id="applied_on"
              type="date"
              value={profile.applied_on}
              onChange={(event) => set("applied_on", event.target.value)}
            />
          </Field>
          <Field
            label="Previous school"
            htmlFor="previous_school"
            error={errors("previous_school")}
          >
            <TextInput
              id="previous_school"
              value={profile.previous_school}
              onChange={(event) => set("previous_school", event.target.value)}
            />
          </Field>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Requested placement
        </h2>
        {optionsLoading ? (
          <Spinner />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Academic year"
              htmlFor="academic_year_id"
              error={errors("academic_year_id")}
            >
              <Select
                id="academic_year_id"
                value={profile.academic_year_id}
                onChange={(event) =>
                  set("academic_year_id", event.target.value)
                }
              >
                <option value="">Not decided</option>
                {options.academic_years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Class"
              htmlFor="class_room_id"
              error={errors("class_room_id")}
            >
              <Select
                id="class_room_id"
                value={profile.class_room_id}
                onChange={(event) => set("class_room_id", event.target.value)}
              >
                <option value="">Not decided</option>
                {options.class_rooms.map((classRoom) => (
                  <option key={classRoom.id} value={classRoom.id}>
                    {classRoom.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Guardian</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Name" htmlFor="guardian_name">
            <TextInput
              id="guardian_name"
              value={profile.guardian_name}
              onChange={(event) => set("guardian_name", event.target.value)}
            />
          </Field>
          <Field
            label="Phone"
            htmlFor="guardian_phone"
            error={errors("guardian_phone")}
          >
            <TextInput
              id="guardian_phone"
              value={profile.guardian_phone}
              onChange={(event) => set("guardian_phone", event.target.value)}
            />
          </Field>
          <Field
            label="Email"
            htmlFor="guardian_email"
            error={errors("guardian_email")}
          >
            <TextInput
              id="guardian_email"
              type="email"
              value={profile.guardian_email}
              onChange={(event) => set("guardian_email", event.target.value)}
            />
          </Field>
          <Field label="Relation" htmlFor="guardian_relation">
            <Select
              id="guardian_relation"
              value={profile.guardian_relation}
              onChange={(event) => set("guardian_relation", event.target.value)}
            >
              <option value="">Not set</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="guardian">Guardian</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Address and notes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="City" htmlFor="city">
            <TextInput
              id="city"
              value={profile.city}
              onChange={(event) => set("city", event.target.value)}
            />
          </Field>
          <Field
            label="Address"
            htmlFor="address"
            className="sm:col-span-2"
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
    </div>
  );
}
