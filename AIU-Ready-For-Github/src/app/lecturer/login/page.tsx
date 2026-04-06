"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import Link from "next/link";

export default function LecturerLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // use simple local storage for pseudo-auth to keep implementation lightweight
        localStorage.setItem("lecturerId", data.lecturerId);
        localStorage.setItem("username", data.username);
        router.push("/lecturer");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="auth-container">
      <div className="card glass">
        <div style={{ display: "flex", justifySelf: "center", marginBottom: "1rem", color: "var(--primary)" }}>
          <LogIn size={40} />
        </div>
        <h1>Lecturer Access</h1>
        <p>Login to manage your sessions.</p>

        {error && <div style={{ color: "var(--destructive)", marginBottom: "1rem", fontSize: "0.875rem" }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              className="form-control" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary mt-4">Login</button>
        </form>
        <div style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
          <span style={{ color: "#94a3b8" }}>Don't have an account? </span>
          <Link href="/lecturer/signup" style={{ color: "var(--primary)", fontWeight: "500" }}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
