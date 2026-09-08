import { NextResponse } from "next/server";
import { getAdminStudentPreview, verifyAdminSession } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const isValid = verifyAdminSession(request);
  return NextResponse.json({
    authenticated: isValid,
    studentPreview: isValid ? getAdminStudentPreview(request) : null,
  });
}

export async function POST(request: Request) {
  const isValid = verifyAdminSession(request);
  return NextResponse.json({
    authenticated: isValid,
    studentPreview: isValid ? getAdminStudentPreview(request) : null,
  });
}
