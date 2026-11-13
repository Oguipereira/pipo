import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "pipo", template: "%s · pipo" },
  description: "Hábitos, código e projetos. Um quadradinho por dia.",
  applicationName: "pipo",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0d1014",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
