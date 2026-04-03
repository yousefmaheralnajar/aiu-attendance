import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { oneTimeCode, name, idNumber } = await req.json();

    if (!oneTimeCode || !name || !idNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Validate session
    const session = await prisma.attendanceSession.findUnique({
      where: { oneTimeCode },
      include: { course: true }
    });

    if (!session || !session.isActive) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
      return NextResponse.json({ error: "Session time has expired" }, { status: 400 });
    }

    // 2. Prevent duplicate marks for same session
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: { sessionId: session.id, idNumber }
    });

    if (existingRecord) {
      return NextResponse.json({ error: "Attendance already marked" }, { status: 400 });
    }

    // 3. Check if student is on roster
    const registeredStudent = await prisma.student.findFirst({
      where: { studentId: idNumber, courseId: session.courseId }
    });

    const isRegistered = !!registeredStudent;

    // 4. Create the record
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        name,
        idNumber,
        isRegistered,
        studentId: registeredStudent?.id || null,
      }
    });

    return NextResponse.json({ success: true, isRegistered });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
