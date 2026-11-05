import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ACCENTS } from "@eis/appearance";
import { AuthProvider } from "@/lib/auth";
import { AppearanceProvider } from "@/lib/appearance";
import { WebI18nProvider } from "@/lib/i18n";
import { AppBackground } from "@/components/AppBackground";
import { TableCardizer } from "@/components/TableCardizer";
import "./globals.css";

/*
 * Fonts are self-hosted instead of fetched from Google Fonts at build time.
 * Google intermittently serves extensionless `/l/font?kit=` URLs, which makes
 * `next build` fail randomly on both Turbopack and webpack:
 * https://github.com/vercel/next.js/issues/99114
 * The woff2 files in ./fonts were downloaded once from Google Fonts; the
 * variable faces keep their full weight axes, Exo 2 ships one file per weight.
 */
const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

const exo2 = localFont({
  src: [
    { path: "./fonts/exo-2-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/exo-2-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/exo-2-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-exo-2",
  display: "swap",
});

const urdu = localFont({
  src: "./fonts/noto-naskh-arabic.woff2",
  variable: "--font-urdu",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "EduCourt",
  title: {
    default: "EduCourt",
    template: "%s | EduCourt",
  },
  description:
    "Multi-campus school, college and university information system.",
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const accentMap = Object.fromEntries(
  ACCENTS.map((accent) => [accent.id, [accent.accent, accent.accentForeground]])
);

const bootScript = `(function(){try{var d=document.documentElement;var a=JSON.parse(localStorage.getItem("eis.appearance")||"{}");var m=a.mode||"system";var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.dataset.theme=dark?"dark":"light";var accents=${JSON.stringify(
  accentMap
)};var id=a.accentId||"indigo";var acc=accents[id]||accents.indigo;d.dataset.accent=id;d.style.setProperty("--accent",acc[0]);d.style.setProperty("--accent-foreground",acc[1]);d.dataset.vibrantPalette=String(a.vibrant!==false);d.dataset.animations=String(a.animations!==false);d.dataset.background=a.backgroundId||"default";}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${jakarta.variable} ${geistMono.variable} ${exo2.variable} ${urdu.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full flex flex-col text-foreground">
        <WebI18nProvider>
          <AppearanceProvider>
            <AppBackground />
            <TableCardizer />
            <AuthProvider>{children}</AuthProvider>
          </AppearanceProvider>
        </WebI18nProvider>
      </body>
    </html>
  );
}
