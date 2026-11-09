export const ANDROID_URL = process.env.NEXT_PUBLIC_APP_ANDROID_URL ?? "";
export const IOS_URL = process.env.NEXT_PUBLIC_APP_IOS_URL ?? "";
export const FALLBACK_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL ?? "";

// Audience-specific builds. Staff and family apps are distributed separately,
// so each has its own optional platform links with a shared fallback.
export const STAFF_ANDROID_URL = process.env.NEXT_PUBLIC_APP_STAFF_ANDROID_URL ?? "";
export const STAFF_IOS_URL = process.env.NEXT_PUBLIC_APP_STAFF_IOS_URL ?? "";
export const FAMILY_ANDROID_URL = process.env.NEXT_PUBLIC_APP_FAMILY_ANDROID_URL ?? "";
export const FAMILY_IOS_URL = process.env.NEXT_PUBLIC_APP_FAMILY_IOS_URL ?? "";

export type DownloadAudience = "staff" | "family";

export function androidDownloadUrl(): string {
  return ANDROID_URL || FALLBACK_URL;
}

export function iosDownloadUrl(): string {
  return IOS_URL || FALLBACK_URL;
}

function firstNonEmpty(...values: string[]): string {
  return values.find((value) => value.length > 0) ?? "";
}

export function audienceDownloadUrls(audience: DownloadAudience): {
  android: string;
  ios: string;
} {
  if (audience === "staff") {
    return {
      android: firstNonEmpty(STAFF_ANDROID_URL, ANDROID_URL, FALLBACK_URL),
      ios: firstNonEmpty(STAFF_IOS_URL, IOS_URL, FALLBACK_URL),
    };
  }

  return {
    android: firstNonEmpty(FAMILY_ANDROID_URL, ANDROID_URL, FALLBACK_URL),
    ios: firstNonEmpty(FAMILY_IOS_URL, IOS_URL, FALLBACK_URL),
  };
}

export function isAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

export function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}
