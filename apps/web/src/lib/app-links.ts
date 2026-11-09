// Cross-app links surfaced on the public landing page and footers.

// The staff workspace lives in this same app.
export const MAIN_APP_HREF = "/dashboard";

// The standalone family (parent/student) portal is a separate deployment.
export const PARENT_PORTAL_URL =
  process.env.NEXT_PUBLIC_PARENT_PORTAL_URL ??
  "https://educourt-parent.asifent.com/portal/results";

// Audience-specific app download pages within this app.
export const STAFF_DOWNLOAD_HREF = "/download/staff";
export const FAMILY_DOWNLOAD_HREF = "/download/family";
