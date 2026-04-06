import Link from "next/link";
import { User, Users, GraduationCap } from "lucide-react";

export default function Home() {
  return (
    <div className="container">
      <div className="card glass mx-auto" style={{ margin: "4rem auto" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <div style={{ background: "rgba(59, 130, 246, 0.2)", padding: "1rem", borderRadius: "50%", color: "var(--primary)" }}>
            <GraduationCap size={48} />
          </div>
        </div>
        <h1>AIU Attendance Checker</h1>
        <p>Select your portal to continue</p>

        <div className="choice-grid">
          <Link href="/student" className="choice-card glass">
            <div className="choice-icon">
              <Users size={32} />
            </div>
            <div>
              <h2>Student Portal</h2>
              <p>Enter your session code to mark attendance</p>
            </div>
          </Link>

          <Link href="/lecturer/login" className="choice-card glass">
            <div className="choice-icon">
              <User size={32} />
            </div>
            <div>
              <h2>Lecturer Portal</h2>
              <p>Manage your courses, view history, and generate reports</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
