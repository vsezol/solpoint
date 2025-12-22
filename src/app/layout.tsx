import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { WalletContextProvider } from "@/components/providers/wallet-provider";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SolPoint - The Global Solana Community Map",
  description:
    "Connect with Solana enthusiasts, find local hubs, and discover events worldwide. The fastest way to forge productive connections in the Solana ecosystem.",
  keywords: [
    "Solana",
    "crypto",
    "community",
    "networking",
    "events",
    "hubs",
    "Web3",
    "blockchain",
  ],
  authors: [{ name: "SolPoint Team" }],
  openGraph: {
    title: "SolPoint - The Global Solana Community Map",
    description:
      "Connect with Solana enthusiasts, find local hubs, and discover events worldwide.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolPoint - The Global Solana Community Map",
    description:
      "Connect with Solana enthusiasts, find local hubs, and discover events worldwide.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${inter.variable} antialiased`}
      >
        <GoogleAnalytics />
        <QueryProvider>
          <WalletContextProvider>
            <AuthProvider>{children}</AuthProvider>
          </WalletContextProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
