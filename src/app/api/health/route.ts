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
    await prisma.ad.count();
    results.ads_table = "ok";
  } catch (e) {
    results.ads_table = String(e);
  }

  try {
    await prisma.lead.count();
    results.leads_table = "ok";
  } catch (e) {
    results.leads_table = String(e);
  }

  try {
    await prisma.lead.findFirst({ select: { sentMessage: true } });
    results.sentMessage_column = "ok";
  } catch (e) {
    results.sentMessage_column = String(e);
  }

  return NextResponse.json(results);
}
