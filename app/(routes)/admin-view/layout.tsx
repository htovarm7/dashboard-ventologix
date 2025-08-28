// import { Outfit } from "next/font/google";
import type { Metadata } from "next";

// const outfit = Outfit({
//   subsets: ["latin"],
//   display: "swap",
//   variable: "--font-outfit",
// });

export const metadata: Metadata = {
  title: "Admin Dashboard",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
