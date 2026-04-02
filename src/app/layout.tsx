import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Inter } from "next/font/google";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { WalletContextProvider } from "@/components/providers/wallet-provider";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { IntentChecker } from "@/components/subscription/intent-checker";
import { MobileNav } from "@/components/layout/mobile-nav";

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

const kodeMono = localFont({
  src: "../../public/KodeMono-VariableFont_wght.ttf",
  variable: "--font-kode-mono",
  display: "swap",
});

const iceland = localFont({
  src: "../../public/Iceland-Regular.ttf",
  variable: "--font-iceland",
  display: "swap",
});

const lalezar = localFont({
  src: "../../public/Lalezar-Regular.ttf",
  variable: "--font-lalezar",
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SolPoint",
  },
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
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0f14" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${inter.variable} ${kodeMono.variable} ${iceland.variable} ${lalezar.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <GoogleAnalytics nonce={nonce} />
          <QueryProvider>
            <WalletContextProvider>
              <AuthProvider>
                <IntentChecker />
                {children}
                <MobileNav />
              </AuthProvider>
            </WalletContextProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
