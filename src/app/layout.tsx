import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-voice",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Reflection",
  description: "An identity exploration platform for meaningful decisions and emerging patterns.",
};

// Applies the stored theme before first paint so a dark-theme user never
// sees a light flash. Reads the same "theme" localStorage key ThemeProvider
// writes — keep the two in sync.
//
// Delivery matters as much as content: the script reaches the page as raw
// HTML inside a hidden wrapper div (dangerouslySetInnerHTML below), NOT as
// a React <script> element. React 19.2 warns on every script element it
// creates client-side — it deliberately renders them inert — and that
// covers next-themes' approach and next/script alike (in the App Router,
// `beforeInteractive` still emits an inline script element AND defers
// execution past first paint). Raw HTML sidesteps all of it: the browser
// executes the script while parsing the SSR stream, and React only ever
// reconciles the div.
const THEME_INIT_SCRIPT = `<script>(function(){var d=document.documentElement;var r="light";try{var t=localStorage.getItem("theme");r=t==="dark"?"dark":t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){}d.classList.add(r);d.style.colorScheme=r})()</script>`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      style={
        {
          "--font-ui": "var(--font-geist-sans)",
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col">
        {/* hidden keeps the wrapper out of the body's flex layout. */}
        <div
          hidden
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
