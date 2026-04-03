"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Lock } from "lucide-react";

export default function StudentPortal() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "locked">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const upperCode = code.toUpperCase();

    if (localStorage.getItem(`attendance_locked_${upperCode}`)) {
      setStatus("locked");
      return;
    }

    setStatus("loading");
    
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oneTimeCode: upperCode, name, idNumber: studentId }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem(`attendance_locked_${upperCode}`, "true");
        setStatus("success");
        setMessage(`Attendance marked successfully! ${data.isRegistered ? '' : '(Note: You were joined as Unregistered for this module)'}`);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to mark attendance. Validate code and active session.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error occurred.");
    }
  };

  if (status === "locked") {
    return (
      <div className="auth-container">
        <div className="card glass">
          <div style={{ color: "var(--destructive)", marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
            <Lock size={64} />
          </div>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "white" }}>Device Locked</h2>
          <p style={{ color: "#94a3b8" }}>You have already submitted attendance for this session from this device. Multiple submissions are not permitted.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="auth-container">
        <div className="card glass">
          <div style={{ color: "var(--pass)", marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
            <CheckCircle2 size={64} />
          </div>
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "white" }}>You're all set!</h2>
          <p style={{ color: "#94a3b8" }}>{message}</p>
          <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#64748b" }}>You may now close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="card glass">
        <h1>Student Portal</h1>
        <p>Register your attendance for a live session.</p>

        {status === "error" && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--destructive)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "0.875rem", textAlign: "left" }}>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>One-Time Code</label>
            <input 
              type="text" 
              className="form-control" 
              value={code} 
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setCode(val);
                if (localStorage.getItem(`attendance_locked_${val}`)) {
                  setStatus("locked");
                }
              }}
              placeholder="e.g. X9F21B"
              style={{ textTransform: "uppercase", letterSpacing: "2px", fontWeight: "bold" }}
              required 
            />
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required 
            />
          </div>
          <div className="form-group">
            <label>Student ID</label>
            <input 
              type="text" 
              className="form-control" 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. 10293481"
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary mt-4" disabled={status === "loading"}>
            {status === "loading" ? "Submitting..." : "Submit Attendance"}
          </button>
        </form>
      </div>
    </div>
  );
}
