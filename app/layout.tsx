import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import InstallPrompt from "@/components/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FitTrack",
  description: "Personal fitness tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitTrack",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        <main className="min-h-screen pb-24">{children}</main>
        <InstallPrompt />
        <BottomNav />
      </body>
    </html>
  );
}
