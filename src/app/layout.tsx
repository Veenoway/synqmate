import { Header } from "@/layouts/header";
import { SolanaProvider } from "@/lib/solana/provider";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";

const poppins = Unbounded({
  variable: "--font-poppins",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chess Room | Play Chess On Chain",
  description: "Play Chess Online with your friends on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US">
      <body className={poppins.className}>
        <SolanaProvider>
          <Header />
          {children}
          <Analytics />
        </SolanaProvider>
      </body>
    </html>
  );
}
