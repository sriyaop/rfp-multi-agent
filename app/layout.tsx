import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autonomous RFP Proposal Generator",
  description: "Hierarchical multi-agent RFP proposal generation platform"
};

/**
 * Provides the application shell for the proposal generator.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
