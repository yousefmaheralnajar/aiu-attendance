import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const active = searchParams.get("active");

    if (!courseId) return NextResponse.json({ error: "Missing courseId" }, { status: 400 });

    const sessions = await prisma.attendanceSession.findMany({
      where: { 
        courseId,
        ...(active === 'true' ? { isActive: true } : {})
      },
      include: {
        records: true
      },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { courseId, durationSeconds, latitude, longitude, geofenceEnabled } = await req.json();
    if (!courseId) return NextResponse.json({ error: "Missing courseId" }, { status: 400 });

    // Ensure no overlapping active sessions for the same course to prevent confusion
    await prisma.attendanceSession.updateMany({
      where: { courseId, isActive: true },
      data: { isActive: false }
    });

    // Generate random 6 character code
    const oneTimeCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    let expiresAt = null;
    if (durationSeconds && typeof durationSeconds === "number" && durationSeconds > 0) {
      expiresAt = new Date(Date.now() + durationSeconds * 1000);
    }

    const session = await prisma.attendanceSession.create({
      data: { courseId, oneTimeCode, isActive: true, expiresAt, latitude, longitude, geofenceEnabled: !!geofenceEnabled }
    });
    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
