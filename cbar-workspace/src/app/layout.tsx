import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/layout/toaster";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/register";

export const metadata: Metadata = {
  title: {
    default: "CBAR Workspace",
    template: "%s | CBAR Workspace",
  },
  description:
    "A private workspace for the Classroom-Based Action Research team — research modules, tasks, meetings, files and chat.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CBAR Workspace",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <PwaRegister />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

