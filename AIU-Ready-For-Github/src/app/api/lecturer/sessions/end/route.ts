import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as xlsx from "xlsx";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { sessionId, email } = await req.json();

    if (!sessionId || !email) {
      return NextResponse.json({ error: "Missing sessionId or email" }, { status: 400 });
    }

    // End active session
    const session = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { isActive: false },
      include: {
        course: true,
        records: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    // Format data for Excel
    const data = session.records.map(r => ({
      "Student Name": r.name,
      "Student ID": r.idNumber,
      "Time Marked": new Date(r.timestamp).toLocaleString(),
      "Status": r.isRegistered ? "Registered" : "Unregistered (!)"
    }));

    const ws = xlsx.utils.json_to_sheet(data.length > 0 ? data : [{"Note": "No attendance recorded."}]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Attendance");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Setup Mock Email Service (Ethereal)
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"AIU Attendance Checker" <no-reply@aiu-attendance.com>',
      to: email,
      subject: `Attendance Report: ${session.course.name} - ${new Date(session.date).toLocaleDateString()}`,
      text: "Attached is the attendance sheet for the completed session.",
      attachments: [
        {
          filename: `Attendance_${session.course.code}.xlsx`,
          content: buffer
        }
      ]
    });

    return NextResponse.json({ 
      success: true, 
      previewUrl: nodemailer.getTestMessageUrl(info) 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal error while sending excel" }, { status: 500 });
  }
}
