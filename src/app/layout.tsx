import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cosmin Innovation Lab - Project Tracker",
  description: "Internal Project Tracker & Dashboard for Cosmin Innovation Lab",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-900 text-slate-100 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
