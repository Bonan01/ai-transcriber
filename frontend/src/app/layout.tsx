import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Transcriber",
  description: "A beautifully crafted local AI transcription tool using Whisper.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark antialiased">
      <body className="min-h-screen flex flex-col font-sans">{children}</body>
    </html>
  );
}
