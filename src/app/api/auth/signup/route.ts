import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password || password.length < 6) {
      return NextResponse.json({ error: "Invalid username or password too short" }, { status: 400 });
    }

    const existingUser = await prisma.lecturer.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    
    const user = await prisma.lecturer.create({
      data: { username, passwordHash: hash }
    });

    return NextResponse.json({ success: true, lecturerId: user.id, username: user.username });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
