import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AttributionCapture } from "@/components/AttributionCapture";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CookieBanner } from "@/components/CookieBanner";
import { LEGAL } from "@/lib/legal";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://orderlink.in"),
  title: {
    default: "OrderLink — Curated lifestyle goods for India",
    template: "%s | OrderLink",
  },
  description:
    "A tightly-edited shop of lifestyle pieces for your home, your day, and the small moments in between.",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: "OrderLink",
    title: "OrderLink — A tight edit of everyday things, made well",
    description:
      "A curated lifestyle store from Pune. Home, kitchen, and small joys — shipped across India with free shipping, COD, and UPI.",
    url: "https://orderlink.in",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    site: "@OrderLink_in",
    creator: "@OrderLink_in",
    title: "OrderLink — A tight edit of everyday things, made well",
    description:
      "A curated lifestyle store from Pune. Home, kitchen, and small joys — shipped across India.",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f1",
  width: "device-width",
  initialScale: 1,
};

const rootGraphJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "OnlineStore",
      "@id": "https://orderlink.in/#organization",
      name: LEGAL.brandName,
      legalName: LEGAL.companyName,
      url: "https://orderlink.in",
      logo: "https://orderlink.in/assets/optimized/logo_horizontal-600.webp",
      foundingDate: `${LEGAL.incorporatedYear}-01-01`,
      founder: { "@type": "Person", name: "Vinay Vernekar" },
      taxID: LEGAL.gstin,
      identifier: [
        { "@type": "PropertyValue", propertyID: "GSTIN", value: LEGAL.gstin },
        { "@type": "PropertyValue", propertyID: "CIN", value: LEGAL.cin },
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: `${LEGAL.registeredAddress.line1}, ${LEGAL.registeredAddress.line2}`,
        addressLocality: LEGAL.registeredAddress.city,
        addressRegion: LEGAL.registeredAddress.state,
        postalCode: LEGAL.registeredAddress.pincode,
        addressCountry: "IN",
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer service",
          email: LEGAL.supportEmail,
          telephone: LEGAL.supportPhone,
          areaServed: "IN",
          availableLanguage: ["en", "hi"],
        },
      ],
      sameAs: [
        "https://www.instagram.com/orderlink.in/",
        "https://www.facebook.com/profile.php?id=61570689463930",
        "https://x.com/OrderLink_in",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://orderlink.in/#website",
      url: "https://orderlink.in",
      name: LEGAL.brandName,
      publisher: { "@id": "https://orderlink.in/#organization" },
      inLanguage: "en-IN",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans flex flex-col min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootGraphJsonLd) }}
        />
        <AttributionCapture />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <WhatsAppButton />
        <CookieBanner />
      </body>
    </html>
  );
}
