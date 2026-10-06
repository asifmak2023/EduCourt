import type { Campus, Institution } from "@/lib/types";

function readString(
  settings: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = settings?.[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export interface PrintHeaderProps {
  title: string;
  campus?: Campus | null;
  institution?: Institution | null;
}

export function PrintHeader({ title, campus, institution }: PrintHeaderProps) {
  const schoolName =
    institution?.name ?? campus?.institution?.name ?? campus?.name ?? "School";
  const logo = readString(campus?.settings, "logo");
  const address = campus?.address ?? institution?.address ?? null;
  const contact = [campus?.phone ?? institution?.phone, campus?.email ?? institution?.email]
    .filter((entry): entry is string => Boolean(entry))
    .join("  |  ");

  return (
    <div className="border-b-2 border-black/80 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={schoolName} className="h-16 w-16 object-contain" />
          ) : null}
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide text-black">
              {schoolName}
            </h1>
            {campus?.name && campus.name !== schoolName ? (
              <p className="text-sm font-medium text-black/80">{campus.name}</p>
            ) : null}
            {address ? <p className="text-xs text-black/70">{address}</p> : null}
            {contact ? <p className="text-xs text-black/70">{contact}</p> : null}
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block border border-black/80 px-4 py-1 text-sm font-bold uppercase tracking-widest text-black">
            {title}
          </span>
        </div>
      </div>
    </div>
  );
}
