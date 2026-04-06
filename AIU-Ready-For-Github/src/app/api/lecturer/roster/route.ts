import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) return NextResponse.json({ error: "Missing courseId" }, { status: 400 });

    const roster = await prisma.student.findMany({
      where: { courseId },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ success: true, roster });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { courseId, name, studentId } = await req.json();
    if (!courseId || !name || !studentId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const student = await prisma.student.create({
      data: { courseId, name, studentId }
    });
    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Student ID must be unique" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
