import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { courseId, students } = await req.json();
    
    if (!courseId || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "Missing or empty student data" }, { status: 400 });
    }

    const formattedStudents = students.map((s: any) => ({
      courseId,
      // Map both expected explicit names or fallback to matching keys
      studentId: String(s["Student ID"] || s.studentId || s.ID || "").trim(),
      name: String(s["Name"] || s.name || s.FullName || "").trim(),
    })).filter((s: any) => s.studentId && s.name);

    if (formattedStudents.length === 0) {
       return NextResponse.json({ error: "No valid students found. Ensure columns 'Student ID' and 'Name' exist." }, { status: 400 });
    }

    // Insert ignoring duplicates to allow additive uploads
    const result = await prisma.student.createMany({
      data: formattedStudents,
      skipDuplicates: true
    });

    return NextResponse.json({ success: true, addedCount: result.count });
  } catch (error: any) {
    console.error("Bulk upload error: ", error);
    return NextResponse.json({ error: "Internal error while importing roster" }, { status: 500 });
  }
}
