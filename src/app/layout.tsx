import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MTT | Transaction Dashboard",
  description: "Dashboard transaksi yang terhubung ke Google Sheets"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
