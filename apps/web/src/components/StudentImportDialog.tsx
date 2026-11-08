"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, apiDownload, apiUpload } from "@/lib/api";
import { Button } from "@/components/Form";
import { ErrorNotice, SuccessNotice } from "@/components/ui";

interface ImportRowError {
  line: number;
  message: string;
}

interface ImportPreviewRow {
  line: number;
  admission_no: string | null;
  first_name: string;
  last_name: string;
  gender: string;
  guardian: string | null;
  class: string | null;
  section: string | null;
}

interface ImportResult {
  message: string;
  rows: number;
  valid: number;
  created: number;
  skipped: number;
  dry_run?: boolean;
  errors: ImportRowError[];
  preview: ImportPreviewRow[];
}

export interface StudentImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

export function StudentImportDialog({ open, onClose, onImported }: StudentImportDialogProps) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(<ImportDialogFrame onClose={onClose} onImported={onImported} />, document.body);
}

function ImportDialogFrame({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported?: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const downloadTemplate = async () => {
    setError(null);

    try {
      const blob = await apiDownload("/v1/students/import/template");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "student-import-template.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the template.");
    }
  };

  const submit = async (dryRun: boolean) => {
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dry_run", dryRun ? "1" : "0");
      formData.append("skip_invalid", skipInvalid ? "1" : "0");

      const response = await apiUpload<ImportResult>("/v1/students/import", formData);

      if (dryRun) {
        setPreview(response);
      } else {
        setResult(response);
        setPreview(null);
        onImported?.();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const rowErrors = err.errors?.file?.join(" ");
        setError(rowErrors || err.message);
      } else {
        setError("The import failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[#EEF1F6] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">Import students</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Upload a CSV file (Excel: File &gt; Save As &gt; CSV). Preview before importing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[#6B7280] hover:bg-[#F4F6FA]"
            aria-label="Close"
          >
            &#x2715;
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={downloadTemplate} disabled={busy}>
              Download template
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setResult(null);
                setError(null);
              }}
              className="text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              checked={skipInvalid}
              onChange={(event) => setSkipInvalid(event.target.checked)}
              disabled={busy}
            />
            Skip invalid rows instead of aborting the whole import
          </label>

          {error ? <ErrorNotice message={error} /> : null}

          {preview ? (
            <div className="space-y-3 rounded-xl border border-[#EEF1F6] p-4">
              <p className="text-sm text-[#374151]">
                {preview.valid} of {preview.rows} row(s) are valid.
                {preview.errors.length > 0 ? ` ${preview.skipped} row(s) have problems.` : ""}
              </p>

              {preview.preview.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[#6B7280]">
                      <tr>
                        <th className="py-1 pr-3">Line</th>
                        <th className="py-1 pr-3">Name</th>
                        <th className="py-1 pr-3">Gender</th>
                        <th className="py-1 pr-3">Guardian</th>
                        <th className="py-1 pr-3">Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((row) => (
                        <tr key={row.line} className="border-t border-[#F1F4F9]">
                          <td className="py-1 pr-3">{row.line}</td>
                          <td className="py-1 pr-3">
                            {row.first_name} {row.last_name}
                          </td>
                          <td className="py-1 pr-3">{row.gender}</td>
                          <td className="py-1 pr-3">{row.guardian ?? "-"}</td>
                          <td className="py-1 pr-3">{row.class ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {preview.errors.length > 0 ? (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-[#B42318]">
                  {preview.errors.map((rowError, index) => (
                    <li key={`${rowError.line}-${index}`}>
                      Line {rowError.line}: {rowError.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {result ? (
            <SuccessNotice
              message={`${result.created} student(s) imported, ${result.skipped} row(s) skipped.`}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EEF1F6] px-6 py-4">
          <Button type="button" variant="ghost" onClick={reset} disabled={busy}>
            Reset
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => submit(true)}
            disabled={busy || !file}
          >
            Preview
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => submit(false)}
            disabled={busy || !file || (preview !== null && preview.valid === 0)}
          >
            {busy ? "Working..." : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}
