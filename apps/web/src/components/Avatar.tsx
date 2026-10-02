function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-24 w-24 text-2xl",
} as const;

export function Avatar({
  name,
  photoUrl,
  size = "sm",
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  if (photoUrl) {
    return (
      <div
        role="img"
        aria-label={name}
        className={`${SIZES[size]} shrink-0 rounded-full bg-cover bg-center ring-1 ring-border`}
        style={{ backgroundImage: `url("${photoUrl}")` }}
      />
    );
  }

  return (
    <div
      className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-soft-foreground`}
    >
      {initials(name)}
    </div>
  );
}
