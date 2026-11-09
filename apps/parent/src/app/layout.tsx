import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
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

export const metadata: Metadata = {
  applicationName: "EduCourt Family",
  title: {
    default: "EduCourt Family",
    template: "%s | EduCourt Family",
  },
  description:
    "The family portal for parents and students: attendance, results, fees and timetable, all in one clean place.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EduCourt Family",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#080a13" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const bootScript = `(function(){try{var d=document.documentElement;var m=localStorage.getItem("family.theme")||"system";var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.dataset.theme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${exo2.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full">
        <div className="portal-ambient" aria-hidden />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
