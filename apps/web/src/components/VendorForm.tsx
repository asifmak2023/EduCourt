"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useChartOfAccounts } from "@/lib/useLookups";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { Vendor } from "@/lib/types";

export function VendorForm({ vendor }: { vendor?: Vendor }) {
  const router = useRouter();
  const isEdit = Boolean(vendor);
  const { items: accounts, loading } = useChartOfAccounts();

  const [code, setCode] = useState(vendor?.code ?? "");
  const [name, setName] = useState(vendor?.name ?? "");
  const [contactName, setContactName] = useState(vendor?.contact_name ?? "");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [email, setEmail] = useState(vendor?.email ?? "");
  const [taxNumber, setTaxNumber] = useState(vendor?.tax_number ?? "");
  const [payableAccountId, setPayableAccountId] = useState(
    vendor?.payable_account_id ? String(vendor.payable_account_id) : ""
  );
  const [address, setAddress] = useState(vendor?.address ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [isActive, setIsActive] = useState(vendor?.is_active ?? true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const payableAccounts = accounts.filter(
    (account) =>
      account.account_type === "liability" && !account.is_group && account.is_active
  );

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        code,
        name,
        is_active: isActive,
      };

      if (contactName) body.contact_name = contactName;
      if (phone) body.phone = phone;
      if (email) body.email = email;
      if (taxNumber) body.tax_number = taxNumber;
      if (address) body.address = address;
      if (notes) body.notes = notes;
      if (payableAccountId) body.payable_account_id = Number(payableAccountId);

      if (isEdit && vendor) {
        await apiFetch(`/v1/vendors/${vendor.id}`, { method: "PUT", body });
        router.push("/dashboard/finance/vendors");
        return;
      }

      await apiFetch("/v1/vendors", { method: "POST", body });
      router.push("/dashboard/finance/vendors");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save vendor.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${vendor?.name}` : "New vendor"}
        description="Suppliers and service providers used by expenses."
        actions={
          <Link
            href="/dashboard/finance/vendors"
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
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Code" htmlFor="vendor_code" required error={errText("code")}>
              <TextInput
                id="vendor_code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </Field>
            <Field
              label="Name"
              htmlFor="vendor_name"
              required
              className="sm:col-span-1 lg:col-span-2"
              error={errText("name")}
            >
              <TextInput
                id="vendor_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field
              label="Contact name"
              htmlFor="vendor_contact"
              error={errText("contact_name")}
            >
              <TextInput
                id="vendor_contact"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
              />
            </Field>
            <Field label="Phone" htmlFor="vendor_phone" error={errText("phone")}>
              <TextInput
                id="vendor_phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="vendor_email" error={errText("email")}>
              <TextInput
                id="vendor_email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field
              label="Tax number"
              htmlFor="vendor_tax"
              error={errText("tax_number")}
            >
              <TextInput
                id="vendor_tax"
                value={taxNumber}
                onChange={(event) => setTaxNumber(event.target.value)}
              />
            </Field>
            <Field
              label="Payable account"
              htmlFor="vendor_payable"
              hint="Defaults to the campus vendor payable account."
              error={errText("payable_account_id")}
            >
              <Select
                id="vendor_payable"
                value={payableAccountId}
                onChange={(event) => setPayableAccountId(event.target.value)}
              >
                <option value="">Default</option>
                {payableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Address"
              htmlFor="vendor_address"
              className="sm:col-span-2"
              error={errText("address")}
            >
              <TextArea
                id="vendor_address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </Field>
            <Field
              label="Notes"
              htmlFor="vendor_notes"
              className="sm:col-span-2 lg:col-span-3"
              error={errText("notes")}
            >
              <TextArea
                id="vendor_notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Checkbox
                label="Active"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
            <Link
              href="/dashboard/finance/vendors"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              {isEdit ? "Save changes" : "Create vendor"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
