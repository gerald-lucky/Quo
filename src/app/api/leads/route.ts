import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adId = searchParams.get("adId");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const skip = (page - 1) * limit;

  const where = adId ? { adId } : {};

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        ad: { select: { id: true, name: true, campaignName: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, limit });
}
