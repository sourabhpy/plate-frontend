import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fustat = localFont({
  src: "../public/fonts/Fustat-VariableFont_wght.ttf",
  variable: "--font-fustat",
  display: "swap",
  declarations: [
    { prop: "ascent-override", value: "85%" },
    { prop: "descent-override", value: "15%" },
    { prop: "line-gap-override", value: "0%" },
  ],
});

export const metadata: Metadata = {
  title: "plate • AI-Native Team Productivity",
  description: "Unified task management, Slack-inspired API communications, voice task extraction, document analysis, and persistent team memory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fustat.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-neutral-900 font-fustat selection:bg-blue-100 selection:text-blue-900 flex flex-col">
        {children}
      </body>
    </html>
  );
}
