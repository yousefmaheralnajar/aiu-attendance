import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const courses = await prisma.course.findMany({
      include: {
        _count: { select: { students: true, sessions: true } }
      }
    });
    return NextResponse.json({ success: true, courses });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, code } = await req.json();
    if (!name || !code) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const course = await prisma.course.create({
      data: { name, code }
    });
    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Course code must be unique" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
