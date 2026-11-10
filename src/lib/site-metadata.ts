import type { Metadata } from "next";

export const siteDescription =
  "«Neue Runde. Neue Chance auf etwas Brauchbares.»";
const deploymentHost =
  process.env.VERCEL_ENV === "production"
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
    : process.env.VERCEL_URL;
const siteUrl = new URL(
  process.env.SITE_URL ||
    (deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000"),
);
const image = {
  url: "/social-preview.png",
  width: 1200,
  height: 630,
  alt: "Familienwichteln – grünes Geschenk mit goldener Schleife. Manche Geschenke wünscht man sich. Andere bekommt man einfach so.",
};

// Keep shared previews generic, including on invitation and private group routes.
export const siteMetadata: Metadata = {
  metadataBase: siteUrl,
  title: "Familienwichteln",
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Familienwichteln",
    title: "Familienwichteln",
    description: siteDescription,
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: "Familienwichteln",
    description: siteDescription,
    images: [image],
  },
  robots: { index: false, follow: false },
};
