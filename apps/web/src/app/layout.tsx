import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

// Display font - Elegant serif for names and headlines
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// Body font - Clean, geometric sans
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Mono font - For data and technical info
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Social Recall",
    template: "%s | Social Recall",
  },
  description:
    "Founders Network Intelligence. Turn your professional network into a queryable, opportunity-aware knowledge graph.",
  keywords: [
    "founders",
    "network intelligence",
    "LinkedIn",
    "contacts",
    "networking",
    "investors",
    "angel investors",
    "serial entrepreneurs",
  ],
  authors: [{ name: "Social Recall" }],
  openGraph: {
    title: "Social Recall — Founders Network Intelligence",
    description:
      "Your network is your edge. Make it queryable.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-body min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
