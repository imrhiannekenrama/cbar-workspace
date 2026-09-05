import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/layout/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CBAR Workspace",
    template: "%s | CBAR Workspace",
  },
  description:
    "A private workspace for the Classroom-Based Action Research team — research modules, tasks, meetings, files and chat.",
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
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
