import type { Metadata } from "next";
import { Anton, Archivo, Space_Mono } from "next/font/google";
import "./globals.css";

const display = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});
const body = Archivo({ variable: "--font-body", subsets: ["latin"] });
const mono = Space_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "LINEUP — program your bill by taste",
  description:
    "Give it your headliners and a city. Qloo's taste graph returns the support acts, sponsors, and local partners your actual audience over-indexes on — with the reason behind every pick.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
