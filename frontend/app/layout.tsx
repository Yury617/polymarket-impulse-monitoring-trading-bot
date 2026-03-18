import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Polymarket Impulse Monitoring Bot",
  description: "Detect sudden price impulses, buy rising side, trail and hedge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
