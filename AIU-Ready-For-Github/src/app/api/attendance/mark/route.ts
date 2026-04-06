import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Haversine distance formula in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: Request) {
  try {
    const { oneTimeCode, name, idNumber, latitude, longitude } = await req.json();

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

    // 2. Enforce Geofence if enabled
    if (session.geofenceEnabled && session.latitude && session.longitude) {
      if (!latitude || !longitude) {
        return NextResponse.json({ error: "Location permission is required for this session." }, { status: 400 });
      }
      
      const distance = getDistanceInMeters(session.latitude, session.longitude, latitude, longitude);
      if (distance > 50) {
        return NextResponse.json({ error: `You are too far from the classroom (${Math.round(distance)}m). You must be within 50m.` }, { status: 400 });
      }
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
