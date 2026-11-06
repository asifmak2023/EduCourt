export const ANDROID_URL = process.env.NEXT_PUBLIC_APP_ANDROID_URL ?? "";
export const IOS_URL = process.env.NEXT_PUBLIC_APP_IOS_URL ?? "";
export const FALLBACK_URL = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL ?? "";

export function androidDownloadUrl(): string {
  return ANDROID_URL || FALLBACK_URL;
}

export function iosDownloadUrl(): string {
  return IOS_URL || FALLBACK_URL;
}

export function isAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

export function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}
