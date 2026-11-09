import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const hind = localFont({
  src: [
    { path: "./fonts/hind-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/hind-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/hind-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/hind-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-hind",
  display: "swap",
});

const khand = localFont({
  src: [
    { path: "./fonts/khand-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/khand-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/khand-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/khand-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-khand",
  display: "swap",
});

const nastaliq = localFont({
  src: "./fonts/noto-nastaliq-urdu.woff2",
  variable: "--font-nastaliq",
  weight: "400",
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
    { media: "(prefers-color-scheme: light)", color: "#f7f8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1f18" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const bootScript = `(function(){try{var d=document.documentElement;var m=localStorage.getItem("family.theme")||"system";var dark=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.dataset.theme=dark?"dark":"light";d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${hind.variable} ${khand.variable} ${nastaliq.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
