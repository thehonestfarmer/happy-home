import { NextResponse } from "next/server";
import fs from "fs";

export async function GET() {
  await init();

  return NextResponse.json({ data: 123 });
}

async function init() {
  console.log("... running init");
  const json = {};

  try {
    // Write the JSON data to a file
    await fs.promises.writeFile(
      "output.json",
      JSON.stringify(json, null, 2),
      "utf-8",
    );
    console.log("Data successfully written to output.json");
  } catch (error) {
    console.error("Error writing to file:", error);
  }
}
