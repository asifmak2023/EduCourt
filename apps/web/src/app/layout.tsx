import type { Metadata } from "next";
import { Geist, Geist_Mono, Exo_2, Noto_Naskh_Arabic } from "next/font/google";
import { ACCENTS } from "@eis/appearance";
import { AuthProvider } from "@/lib/auth";
import { AppearanceProvider } from "@/lib/appearance";
import { WebI18nProvider } from "@/lib/i18n";
import { AppBackground } from "@/components/AppBackground";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const urdu = Noto_Naskh_Arabic({
  variable: "--font-urdu",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "Education Information System",
  description:
    "Multi-campus school, college and university information system.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${exo2.variable} ${urdu.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full flex flex-col text-foreground">
        <WebI18nProvider>
          <AppearanceProvider>
            <AppBackground />
            <AuthProvider>{children}</AuthProvider>
          </AppearanceProvider>
        </WebI18nProvider>
      </body>
    </html>
  );
}
