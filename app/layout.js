import { Geist, Geist_Mono, Caveat } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Handwriting font for /cards heritage features — the dated cook log
// entries on each Recipe Card. Pulled in app-wide (not just on the
// cards route) because recipes flow between Vault and Cards and we
// want the option to use it elsewhere later (e.g. Origin rendering
// on the detail view). Exposed as a CSS variable so we can
// apply it via Tailwind's `font-[var(--font-caveat)]` arbitrary value.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  verification: { other: { "p:domain_verify": "1849040e58f1fd56cee76fc2e7b37f08" } },
  metadataBase: new URL("https://recipe.mycompanionapps.com"),
  title: "MyRecipe Companion",
  description:
    "A cozy cooking companion — save recipes, plan meals, learn new skills, and cook alongside an AI chef.",
  applicationName: "MyRecipe Companion",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MyRecipe",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // Open Graph + Twitter Card metadata. Drives the preview image,
  // title, and description that appear when the URL is shared on
  // iMessage, WhatsApp, Twitter/X, LinkedIn, Slack, Facebook, etc.
  // The banner image is the brand banner (icon + name + tagline,
  // pre-composed) — every shared link instantly markets the app.
  openGraph: {
    type: "website",
    siteName: "MyRecipe Companion",
    title: "MyRecipe Companion",
    description: "Where your cooking life and your learning journey meet.",
    images: [
      {
        url: "/banner.jpg",
        width: 1200,
        height: 630,
        alt: "MyRecipe Companion — where your cooking life and your learning journey meet.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyRecipe Companion",
    description: "Where your cooking life and your learning journey meet.",
    images: ["/banner.jpg"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} antialiased`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="p:domain_verify" content="1849040e58f1fd56cee76fc2e7b37f08" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('resize', function() {
            document.body.style.minHeight = window.innerHeight + 'px';
          });
        `}} />
      </head>
      <body style={{overflowX: 'hidden', width: '100%'}}>{children}
        <script dangerouslySetInnerHTML={{__html: `if(window.location.search.includes('openExternal=1')){var c=window.location.href.replace('?openExternal=1','').replace('&openExternal=1','');window.open(c,'_blank');}`}} /></body>
    </html>
  );
}
