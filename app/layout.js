import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
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
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('resize', function() {
            document.body.style.minHeight = window.innerHeight + 'px';
          });
        `}} />
      </head>
      <body style={{overflowX: 'hidden', width: '100%'}}>{children}</body>
    </html>
  );
}
