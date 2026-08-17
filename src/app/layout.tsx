import type { Metadata } from "next";
import { JetBrains_Mono, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const shareTechMono = Share_Tech_Mono({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "OP DAY // CTF PROTOCOL",
  description: "Hybrid scavenger hunt & capture-the-flag terminal for OP Day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${shareTechMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-void text-neon-100 font-mono antialiased relative overflow-x-hidden">
        <div className="scanlines" aria-hidden="true" />
        <div className="grid-bg" aria-hidden="true" />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
