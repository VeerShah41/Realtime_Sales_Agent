import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Agent Demo",
  description: "Minimal demo focused on the AI sales assistant experience.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
