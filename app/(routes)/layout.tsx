import type { Metadata } from "next";
// import { Outfit } from "next/font/google";

// const outfit = Outfit({
//   subsets: ["latin"],
//   display: "swap",
//   variable: "--font-outfit",
// });

export const metadata: Metadata = {
  title: "Dashboard de Ventologix",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
