import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { config } from "@/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", axes: ["wdth"] });

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: `${config.siteName}: car raffles & prize competitions`, template: `%s | ${config.siteName}` },
  description: config.tagline,
  openGraph: { siteName: config.siteName, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
