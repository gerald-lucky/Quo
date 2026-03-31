import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    results.connection = "ok";
  } catch (e) {
    results.connection = String(e);
  }

  try {
    await prisma.ad.findFirst({ select: { businessContext: true, qualifyingParams: true } });
    results.ads_new_columns = "ok";
  } catch (e) {
    results.ads_new_columns = String(e);
  }

  try {
    await prisma.lead.findFirst({ select: { sentMessage: true } });
    results.sentMessage_column = "ok";
  } catch (e) {
    results.sentMessage_column = String(e);
  }

  try {
    await prisma.lead.findFirst({ select: { qualificationStatus: true } });
    results.qualificationStatus_column = "ok";
  } catch (e) {
    results.qualificationStatus_column = String(e);
  }

  return NextResponse.json(results);
}
