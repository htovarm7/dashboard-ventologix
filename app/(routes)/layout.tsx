export const metadata = {
  title: "Dashboard de Ventologix",
  description: "Ventologix",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
