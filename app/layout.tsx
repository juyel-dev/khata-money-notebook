import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { InstallPromptProvider } from "@/lib/useInstallPrompt";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { AuthProvider } from "@/lib/firebase/AuthProvider";
import { SyncProvider } from "@/components/sync/SyncProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Khata — Simple Money Notebook",
  description: "A simple offline money notebook for daily gave/took cash tracking.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/khata-logo.svg", type: "image/svg+xml" },
      { url: "/icons/khata-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Khata",
  },
};

export const viewport: Viewport = {
  themeColor: "#2F6B4F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

// Runs before hydration so the correct theme class is on <html> at first
// paint — without this, a dark-mode user would see a flash of the light
// theme every load, since the real ThemeProvider can only read
// localStorage after mount.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("khata:theme");
    var isDark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${notoBengali.variable} antialiased`}>
        <ThemeProvider>
          <I18nProvider>
            <InstallPromptProvider>
              <AuthProvider>
                <SyncProvider>{children}</SyncProvider>
              </AuthProvider>
            </InstallPromptProvider>
          </I18nProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
