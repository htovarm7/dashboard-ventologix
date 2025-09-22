import { Outfit } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import DialogProvider from "@/components/DialogProvider";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "VTOs Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.className}>
      <body className="antialiased overflow-x-hidden">
        <AuthProvider>
          <DialogProvider>{children}</DialogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
