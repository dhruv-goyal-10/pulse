import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pulse — Internal Analytics",
    template: "%s · Pulse",
  },
  description: "Internal analytics dashboard for the Pulse team — subscription health, cohort retention, MRR movement.",
  applicationName: "Pulse",
  authors: [{ name: "Pulse" }],
  keywords: ["SaaS analytics", "MRR", "cohort retention", "churn", "internal dashboard"],
  openGraph: {
    type: "website",
    title: "Pulse — Internal Analytics",
    description: "Internal analytics dashboard: MRR, churn, cohort retention, and MRR movement for a fictional SaaS team.",
    siteName: "Pulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulse — Internal Analytics",
    description: "Internal analytics dashboard: MRR, churn, cohort retention, and MRR movement.",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
