import Image from "next/image";

const SIZES = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-24 w-24",
} as const;

const PIXELS = {
  sm: 36,
  md: 48,
  lg: 96,
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
    <Image
      src="/default-avatar.svg"
      alt={name}
      width={PIXELS[size]}
      height={PIXELS[size]}
      unoptimized
      className={`${SIZES[size]} shrink-0 rounded-full ring-1 ring-border`}
    />
  );
}
