import {
  ColorSchemeScript,
  MantineProvider,
  createTheme,
  mantineHtmlProps,
} from "@mantine/core";
import { Montserrat } from "next/font/google";
import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";
import { Notifications } from "@mantine/notifications";

// Carrega a fonte Montserrat via next/font
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

// Define a fonte Montserrat como base no tema
const theme = createTheme({
  fontFamily: "Montserrat, sans-serif",
  headings: { fontFamily: "Montserrat, sans-serif" },
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, monospace",
  primaryColor: "indigo",
});

export const metadata: Metadata = {
  title: {
    template: "%s | HORAISE",
    default: "HORAISE"
  },
  description: "Editor de horários da equipe AISE - PUC-Rio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html {...mantineHtmlProps} lang="en" className={montserrat.variable}>
      <body className={`${montserrat.variable}`}>
        <MantineProvider theme={theme}>
          <Notifications position="top-right" />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
