import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";
import "./globals.css";
export const metadata: Metadata = {
  title: "Familienwichteln",
  description: "Eure Wichtelrunde mit Wunschlisten.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-icon">
              <Gift size={23} />
            </span>
            Familien<span>wichteln</span>
          </Link>
        </header>
        <main>{children}</main>
        <footer>
          <Link href="/hinweise">Zugang & Datenschutz</Link>
        </footer>
      </body>
    </html>
  );
}
