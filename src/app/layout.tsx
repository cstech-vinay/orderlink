import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://orderlink.in"),
  title: {
    default: "OrderLink — Curated finds, straight to the best price",
    template: "%s · OrderLink",
  },
  description:
    "Hand-tested picks across tech, beauty, home, fashion, kitchen, kids, gifts and study. We test, we sort, we send you to the best price.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "OrderLink",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#FFFDFA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="bg-ol-bg text-ol-ink font-sans antialiased">
        <Suspense fallback={null}>
          <Header />
        </Suspense>
        <div className="max-w-[1280px] mx-auto px-6">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
