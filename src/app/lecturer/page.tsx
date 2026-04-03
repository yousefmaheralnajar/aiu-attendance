"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Users, Clock, PlayCircle, StopCircle, RefreshCcw, Upload, FileSpreadsheet, Download } from "lucide-react";
import * as xlsx from "xlsx";

export default function LecturerDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [activeCourse, setActiveCourse] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"session" | "roster" | "history">("session");

  // New Course state
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");

  // Roster state
  const [roster, setRoster] = useState<any[]>([]);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session State
  const [sessions, setSessions] = useState<any[]>([]);
  const [timerDuration, setTimerDuration] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [endingSession, setEndingSession] = useState(false);
  const [emailTo, setEmailTo] = useState(""); // still kept if they want to email, but we focus on downloads now

  useEffect(() => {
    if (!localStorage.getItem("lecturerId")) {
      router.push("/lecturer/login");
    } else {
      fetchCourses();
    }
  }, []);

  useEffect(() => {
    if (activeCourse) {
      if (activeTab === "roster") fetchRoster();
      if (activeTab === "session" || activeTab === "history") fetchSessions();
    }
  }, [activeCourse, activeTab]);

  const activeSession = sessions.find((s) => s.isActive);

  // Countdown Timer Logic
  useEffect(() => {
    if (!activeSession || !activeSession.expiresAt) {
      setTimeRemaining("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(activeSession.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchCourses = async () => {
    const res = await fetch("/api/lecturer/courses");
    const data = await res.json();
    if (res.ok) setCourses(data.courses);
  };

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/lecturer/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCourseName, code: newCourseCode })
    });
    setNewCourseName("");
    setNewCourseCode("");
    fetchCourses();
  };

  const fetchRoster = async () => {
    const res = await fetch(`/api/lecturer/roster?courseId=${activeCourse.id}`);
    const data = await res.json();
    if (res.ok) setRoster(data.roster);
  };

  const addToRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/lecturer/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: activeCourse.id, name: newStudentName, studentId: newStudentId })
    });
    setNewStudentName("");
    setNewStudentId("");
    fetchRoster();
  };

  // Bulk Upload logic using SheetJS
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBulk(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);

        const res = await fetch("/api/lecturer/roster/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: activeCourse.id, students: data })
        });

        const result = await res.json();
        if (res.ok) {
          alert(`Success! Added ${result.addedCount} students to the roster.`);
          fetchRoster();
        } else {
          alert("Upload failed: " + result.error);
        }
      } catch (err) {
        alert("Error parsing file. Ensure it is a valid Excel or CSV with 'Student ID' and 'Name' columns.");
      }
      setUploadingBulk(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const fetchSessions = async () => {
    const res = await fetch(`/api/lecturer/sessions?courseId=${activeCourse.id}`);
    const data = await res.json();
    if (res.ok) setSessions(data.sessions);
  };

  const startSession = async () => {
    await fetch("/api/lecturer/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: activeCourse.id, durationMinutes: timerDuration })
    });
    fetchSessions(); // Refresh
  };

  const endSession = async (sessionId: string) => {
    setEndingSession(true);
    // End session using the old route for consistency if we still want email
    // but the user only explicitly requested Download. We'll still call the endpoint to just close it.
    await fetch("/api/lecturer/sessions/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, email: "no-reply@test.com" }) // dummy
    });
    fetchSessions();
    setEndingSession(false);
  };

  const handleExport = async (sessionId: string, format: "xlsx" | "csv") => {
    try {
      const res = await fetch("/api/lecturer/sessions/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, format })
      });
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Attendance_Export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch(err) {
      alert("Error exporting session data.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("lecturerId");
    localStorage.removeItem("username");
    router.push("/");
  };

  return (
    <div className="container" style={{ maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Lecturer Dashboard</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span>Hello, {typeof window !== "undefined" ? localStorage.getItem("username") : ""}</span>
          <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {!activeCourse ? (
        <div className="choice-grid">
          <div className="card glass" style={{ margin: "0" }}>
            <h2 style={{ marginBottom: "1rem" }}>Your Courses</h2>
            {courses.length === 0 ? (
              <p>No courses created yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {courses.map(course => (
                  <button 
                    key={course.id} 
                    className="btn btn-secondary" 
                    onClick={() => setActiveCourse(course)}
                    style={{ textAlign: "left", display: "flex", justifyContent: "space-between" }}
                  >
                    <span>{course.code} - {course.name}</span>
                    <span>({course._count.students} Students)</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card glass" style={{ margin: "0" }}>
            <h2 style={{ marginBottom: "1rem" }}>Create New</h2>
            <form onSubmit={createCourse}>
              <div className="form-group">
                <input type="text" className="form-control" value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} placeholder="Course Code (e.g. CS101)" required />
              </div>
              <div className="form-group">
                <input type="text" className="form-control" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="Course Name" required />
              </div>
              <button className="btn btn-primary" type="submit">Create Course</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="card glass" style={{ maxWidth: "100%", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--surface-border)", paddingBottom: "1rem" }}>
            <h2>{activeCourse.code} - {activeCourse.name}</h2>
            <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }} onClick={() => setActiveCourse(null)}>Back to Courses</button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
            <button className={`btn ${activeTab === "session" ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1 }} onClick={() => setActiveTab("session")}>
              <PlayCircle size={18} style={{ marginRight: "0.5rem" }} /> Live Session
            </button>
            <button className={`btn ${activeTab === "roster" ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1 }} onClick={() => setActiveTab("roster")}>
              <Users size={18} style={{ marginRight: "0.5rem" }} /> Roster
            </button>
            <button className={`btn ${activeTab === "history" ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1 }} onClick={() => setActiveTab("history")}>
              <Clock size={18} style={{ marginRight: "0.5rem" }} /> History
            </button>
          </div>

          {activeTab === "session" && (
            <div>
              {activeSession ? (
                <div style={{ textAlign: "center", padding: "2rem", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                  <div style={{ fontSize: "1.25rem", color: "#10b981", marginBottom: "1rem", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <div className="pulse-dot" style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} /> 
                    Live Session Active
                  </div>
                  
                  <div style={{ fontSize: "5rem", letterSpacing: "8px", fontWeight: "800", margin: "1rem 0", background: "linear-gradient(to right, #10b981, #059669)", WebkitBackgroundClip: "text", color: "transparent" }}>
                    {activeSession.oneTimeCode}
                  </div>
                  
                  {activeSession.expiresAt && (
                    <div style={{ display: "inline-block", background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "0.5rem 1.5rem", borderRadius: "20px", fontWeight: "bold", marginBottom: "1rem" }}>
                      Closing in: {timeRemaining}
                    </div>
                  )}

                  <p style={{ fontSize: "1.2rem", marginBottom: "2rem", color: "white" }}>
                    Verified Attendees: <strong>{activeSession.records?.length || 0}</strong>
                  </p>
                  
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                    <button className="btn btn-secondary" onClick={fetchSessions} style={{ maxWidth: "200px" }}>
                      <RefreshCcw size={18} style={{ marginRight: "0.5rem" }} /> Refresh View
                    </button>
                    <button className="btn" style={{ background: "var(--destructive)", color: "white", maxWidth: "200px" }} onClick={() => endSession(activeSession.id)} disabled={endingSession}>
                      <StopCircle size={18} style={{ marginRight: "0.5rem" }} /> {endingSession ? "Ending..." : "End Session"}
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
                     <button className="btn btn-secondary" onClick={() => handleExport(activeSession.id, "xlsx")} style={{ flex: 1 }}>
                       <Download size={16} style={{marginRight: "0.5rem"}}/> Export to Excel
                     </button>
                     <button className="btn btn-secondary" onClick={() => handleExport(activeSession.id, "csv")} style={{ flex: 1 }}>
                       <Download size={16} style={{marginRight: "0.5rem"}}/> Export to CSV
                     </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "4rem 2rem", background: "rgba(15, 23, 42, 0.4)", borderRadius: "8px" }}>
                  <PlayCircle size={48} style={{ color: "var(--primary)", marginBottom: "1rem" }} />
                  <h3 style={{ marginBottom: "0.5rem" }}>No Active Session</h3>
                  <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>Ready to take class attendance?</p>
                  
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <div className="form-group" style={{ textAlign: "center" }}>
                      <label>Set Timer (Optional)</label>
                      <select 
                        className="form-control" 
                        value={timerDuration} 
                        onChange={e => setTimerDuration(Number(e.target.value))}
                        style={{ maxWidth: "250px" }}
                      >
                         <option value={0}>No Timer (Manual Close)</option>
                         <option value={1}>1 Minute</option>
                         <option value={5}>5 Minutes</option>
                         <option value={10}>10 Minutes</option>
                         <option value={15}>15 Minutes</option>
                      </select>
                    </div>
                    
                    <button className="btn btn-primary" onClick={startSession} style={{ maxWidth: "250px" }}>Start New Session</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "roster" && (
            <div>
              <div style={{ background: "rgba(59, 130, 246, 0.05)", border: "1px dashed var(--primary)", padding: "1.5rem", borderRadius: "8px", textAlign: "center", marginBottom: "2rem" }}>
                <FileSpreadsheet size={32} style={{ color: "var(--primary)", marginBottom: "0.5rem" }} />
                <h3 style={{ marginBottom: "0.5rem" }}>Bulk Upload Roster</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem" }}>
                  Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file containing columns <code style={{color: "white"}}>Student ID</code> and <code style={{color: "white"}}>Name</code>.
                </p>
                <label className="btn btn-primary" style={{ display: "inline-flex", cursor: "pointer", maxWidth: "200px" }}>
                  <Upload size={18} style={{ marginRight: "0.5rem" }} /> {uploadingBulk ? "Uploading..." : "Select File"}
                  <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" style={{ display: "none" }} ref={fileInputRef} onChange={handleFileUpload} disabled={uploadingBulk} />
                </label>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
                <input type="text" className="form-control" value={newStudentId} onChange={e => setNewStudentId(e.target.value)} placeholder="Student ID" />
                <input type="text" className="form-control" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Full Name" />
                <button className="btn btn-secondary" onClick={addToRoster} style={{ whiteSpace: "nowrap", width: "auto" }}>Add 1 Student</button>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--surface-border)", textAlign: "left" }}>
                    <th style={{ padding: "1rem 0" }}>Student ID</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map(r => (
                    <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "1rem 0", color: "#cbd5e1" }}>{r.studentId}</td>
                      <td>{r.name}</td>
                    </tr>
                  ))}
                  {roster.length === 0 && <tr><td colSpan={2} style={{ padding: "2rem 0", textAlign: "center", color: "#64748b" }}>Roster is empty. Add students manually above or bulk upload.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "history" && (
            <div>
              {sessions.filter(s => !s.isActive).length === 0 ? (
                <p style={{ color: "#64748b", textAlign: "center", padding: "3rem 0" }}>No past sessions found.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {sessions.filter(s => !s.isActive).map(s => (
                    <div key={s.id} style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--surface-border)", padding: "1.5rem", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4>Date: {new Date(s.date).toLocaleDateString()} at {new Date(s.date).toLocaleTimeString()}</h4>
                        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                          Code: {s.oneTimeCode} &bull; Attendees: {s.records?.length || 0}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                         <button className="btn btn-secondary" onClick={() => handleExport(s.id, "xlsx")} style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
                           Excel .xlsx
                         </button>
                         <button className="btn btn-secondary" onClick={() => handleExport(s.id, "csv")} style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
                           Sheets .csv
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
