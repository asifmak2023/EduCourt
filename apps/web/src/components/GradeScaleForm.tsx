"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";
import type { GradeScale } from "@/lib/types";

interface ItemDraft {
  key: number;
  grade: string;
  min_percentage: string;
  max_percentage: string;
  points: string;
  remark: string;
}

function emptyItem(key: number): ItemDraft {
  return {
    key,
    grade: "",
    min_percentage: "",
    max_percentage: "",
    points: "",
    remark: "",
  };
}

export function GradeScaleForm({ scale }: { scale?: GradeScale }) {
  const router = useRouter();
  const isEdit = Boolean(scale);

  const [name, setName] = useState(scale?.name ?? "");
  const [code, setCode] = useState(scale?.code ?? "");
  const [isDefault, setIsDefault] = useState(scale?.is_default ?? false);
  const [isActive, setIsActive] = useState(scale?.is_active ?? true);
  const [items, setItems] = useState<ItemDraft[]>(
    scale && scale.items.length > 0
      ? scale.items.map((item, index) => ({
          key: index,
          grade: item.grade,
          min_percentage: String(item.min_percentage),
          max_percentage: String(item.max_percentage),
          points: item.points === null ? "" : String(item.points),
          remark: item.remark ?? "",
        }))
      : [emptyItem(0)]
  );
  const [nextKey, setNextKey] = useState(items.length);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const updateItem = (key: number, patch: Partial<ItemDraft>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  };

  const validItems = items.filter(
    (item) => item.grade && item.min_percentage !== "" && item.max_percentage !== ""
  );

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const body = {
      name,
      code,
      is_default: isDefault,
      is_active: isActive,
      items: validItems.map((item, index) => ({
        sequence: index + 1,
        grade: item.grade,
        min_percentage: Number(item.min_percentage),
        max_percentage: Number(item.max_percentage),
        ...(item.points !== "" ? { points: Number(item.points) } : {}),
        ...(item.remark ? { remark: item.remark } : {}),
      })),
    };

    try {
      if (isEdit && scale) {
        await apiFetch(`/v1/grade-scales/${scale.id}`, {
          method: "PUT",
          body,
        });
      } else {
        await apiFetch("/v1/grade-scales", { method: "POST", body });
      }
      router.push("/dashboard/exams/grade-scales");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Unable to save grade scale.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${scale?.name}` : "New grade scale"}
        description="Percentage bands mapped to letter grades and points."
        actions={
          <Link
            href="/dashboard/exams/grade-scales"
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
          <div className="grid gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-2">
            <Field
              label="Name"
              htmlFor="scale_name"
              required
              error={errText("name")}
            >
              <TextInput
                id="scale_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Standard grading"
              />
            </Field>
            <Field
              label="Code"
              htmlFor="scale_code"
              required
              error={errText("code")}
            >
              <TextInput
                id="scale_code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="STD"
              />
            </Field>
            <div className="flex items-end">
              <Checkbox
                label="Default scale"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
              />
            </div>
            <div className="flex items-end">
              <Checkbox
                label="Active"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Bands</h2>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setItems((current) => [...current, emptyItem(nextKey)]);
                  setNextKey((value) => value + 1);
                }}
              >
                Add band
              </Button>
            </div>

            {errText("items") ? (
              <p className="mb-3 text-xs text-rose-600">{errText("items")}</p>
            ) : null}

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-12"
                >
                  <div className="sm:col-span-2">
                    <TextInput
                      value={item.grade}
                      placeholder="Grade"
                      onChange={(event) =>
                        updateItem(item.key, { grade: event.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.min_percentage}
                      placeholder="Min %"
                      onChange={(event) =>
                        updateItem(item.key, {
                          min_percentage: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.max_percentage}
                      placeholder="Max %"
                      onChange={(event) =>
                        updateItem(item.key, {
                          max_percentage: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.points}
                      placeholder="Points"
                      onChange={(event) =>
                        updateItem(item.key, { points: event.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <TextInput
                      value={item.remark}
                      placeholder="Remark"
                      onChange={(event) =>
                        updateItem(item.key, { remark: event.target.value })
                      }
                    />
                  </div>
                  {items.length > 1 ? (
                    <div className="sm:col-span-12">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((row) => row.key !== item.key)
                          )
                        }
                      >
                        Remove band
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              href="/dashboard/exams/grade-scales"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy} disabled={validItems.length === 0}>
              {isEdit ? "Save changes" : "Create scale"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
