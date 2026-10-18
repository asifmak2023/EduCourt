import Image from "next/image";

export function BrandMark({
  className = "h-8 w-8",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/educourt-mark.svg"
      alt=""
      width={128}
      height={128}
      priority={priority}
      unoptimized
      className={`shrink-0 select-none ${className}`}
    />
  );
}
