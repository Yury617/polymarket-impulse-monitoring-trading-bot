import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Polymarket Impulse Monitoring Bot",
  description:
    "Monitor Polymarket Up/Down markets, detect price impulses, and manage the trading bot from a live dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <div className="layout">
          <header className="layoutHeader">
            <div className="layoutHeaderInner">
              <Link href="/" className="appTitle">
                Polymarket Impulse Monitoring Bot
              </Link>
              <nav className="nav">
                <Link href="/" className="navLink">
                  Dashboard
                </Link>
                <Link href="/settings" className="navLink">
                  Settings
                </Link>
              </nav>
            </div>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
