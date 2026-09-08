import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const isValid = verifyAdminSession(request);
  return NextResponse.json({
    authenticated: isValid,
  });
}

export async function POST(request: Request) {
  const isValid = verifyAdminSession(request);
  return NextResponse.json({
    authenticated: isValid,
  });
}
