import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist", subsets: ["latin"], weight: ["400", "500", "600", "800"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "LINEUP · program your bill by taste",
  description:
    "Give it your headliners and a city. Qloo's taste graph returns the support acts, sponsors, and local partners your actual audience over-indexes on, with the reason behind every pick.",
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#0b0b0d",
};

// Applies the saved theme before first paint so there's no light/dark flash. Dark is the default.
const themeScript = `try{var t=localStorage.getItem("lineup-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${mono.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
