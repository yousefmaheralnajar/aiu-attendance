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
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </main>
        <footer style={{ color: "#ffffff", zIndex: 9999, width: "100%", textAlign: "center", padding: "1.5rem", opacity: 0.8, fontSize: "1rem", letterSpacing: "1px", position: "fixed", bottom: 0, pointerEvents: "none" }}>
          Designed by YOUSEF MAHER
        </footer>
      </body>
    </html>
  );
}
