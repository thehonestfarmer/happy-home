import { NextResponse } from "next/server";
import fs from "fs";

export async function GET() {
  return NextResponse.json({ data: 123 });
}
