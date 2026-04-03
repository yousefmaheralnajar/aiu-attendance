import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIU Attendance Checker",
  description: "Mark attendance seamlessly via one-time codes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="nav-bar">
          <div className="nav-container">
            <a href="/" className="nav-logo">AIU Attendance Checker</a>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
