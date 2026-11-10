import { siteMetadata } from "@/lib/site-metadata";
import Link from "next/link";
import { Gift } from "lucide-react";
import "./globals.css";
export const metadata = siteMetadata;
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
            Eschbach<span>wichtelt</span>
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
