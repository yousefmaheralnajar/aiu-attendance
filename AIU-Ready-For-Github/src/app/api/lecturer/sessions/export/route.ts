import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as xlsx from "xlsx";

export async function POST(req: Request) {
  try {
    const { sessionId, format } = await req.json();

    if (!sessionId || !["xlsx", "csv"].includes(format)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        course: true,
        records: { orderBy: { timestamp: 'asc' } }
      }
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Sheet 1 Data
    const attendanceData = session.records.map((r: any, i: number) => ({
      "#": i + 1,
      "Student ID": r.idNumber,
      "Name": r.name,
      "Time Joined": new Date(r.timestamp).toLocaleTimeString(),
      "Status": r.isRegistered ? "Registered" : "Unregistered"
    }));

    if (attendanceData.length === 0) attendanceData.push({ "#": 1, "Student ID": "N/A", "Name": "No attendance recorded", "Time Joined": "N/A", "Status": "N/A" });

    // Sheet 2 Data (Summary)
    const registeredCount = session.records.filter((r: any) => r.isRegistered).length;
    const unregisteredCount = session.records.filter((r: any) => !r.isRegistered).length;
    const summaryData = [
      { Attribute: "Course Code", Value: session.course.code },
      { Attribute: "Course Name", Value: session.course.name },
      { Attribute: "Session Date", Value: new Date(session.date).toLocaleDateString() },
      { Attribute: "Total Attendees", Value: session.records.length },
      { Attribute: "Registered Attendees", Value: registeredCount },
      { Attribute: "Unregistered Walk-ins", Value: unregisteredCount }
    ];

    const wb = xlsx.utils.book_new();
    const wsAttendance = xlsx.utils.json_to_sheet(attendanceData);
    const wsSummary = xlsx.utils.json_to_sheet(summaryData);
    
    xlsx.utils.book_append_sheet(wb, wsAttendance, "Attendance List");
    xlsx.utils.book_append_sheet(wb, wsSummary, "Summary");

    if (format === "xlsx") {
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new Response(buffer, {
        headers: {
          "Content-Disposition": `attachment; filename=Attendance_${session.course.code}_${new Date(session.date).toISOString().slice(0,10)}.xlsx`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      });
    }

    if (format === "csv") {
      // In CSV we usually just output the raw attendance data by dumping the first sheet.
      const csvStr = xlsx.utils.sheet_to_csv(wsAttendance);
      return new Response(csvStr, {
        headers: {
          "Content-Disposition": `attachment; filename=Attendance_${session.course.code}_${new Date(session.date).toISOString().slice(0,10)}.csv`,
          "Content-Type": "text/csv",
        }
      });
    }

    return NextResponse.json({ error: "Format not supported" }, { status: 400 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
