"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import Link from "next/link";

export default function LecturerSignup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
       setError("Password must be at least 6 characters.");
       return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Auto-login after signup
        localStorage.setItem("lecturerId", data.lecturerId);
        localStorage.setItem("username", data.username);
        router.push("/lecturer");
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="auth-container">
      <div className="card glass">
        <div style={{ display: "flex", justifySelf: "center", marginBottom: "1rem", color: "var(--primary)" }}>
          <UserPlus size={40} />
        </div>
        <h1>Create Account</h1>
        <p>Register as a new lecturer to create courses.</p>

        {error && <div style={{ color: "var(--destructive)", marginBottom: "1rem", fontSize: "0.875rem" }}>{error}</div>}

        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              className="form-control" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. prof_smith"
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
          <button type="submit" className="btn btn-primary mt-4">Sign Up</button>
        </form>
        <div style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
          <span style={{ color: "#94a3b8" }}>Already have an account? </span>
          <Link href="/lecturer/login" style={{ color: "var(--primary)", fontWeight: "500" }}>Login Instead</Link>
        </div>
      </div>
    </div>
  );
}
