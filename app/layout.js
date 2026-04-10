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
  description: "Your personal AI-powered cooking companion",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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