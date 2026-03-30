import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ads = await prisma.ad.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { leads: true } },
    },
  });
  return NextResponse.json(ads);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      facebookFormId: string;
      facebookAdId?: string;
      facebookPageId?: string;
      campaignName?: string;
      businessContext?: string;
      qualifyingParams?: Record<string, unknown>;
    };

    const { name, facebookFormId, facebookAdId, facebookPageId, campaignName, businessContext, qualifyingParams } = body;

    if (!name || !facebookFormId) {
      return NextResponse.json(
        { error: "name and facebookFormId are required." },
        { status: 400 }
      );
    }

    const ad = await prisma.ad.create({
      data: {
        name,
        facebookFormId,
        facebookAdId: facebookAdId ?? null,
        facebookPageId: facebookPageId ?? null,
        campaignName: campaignName ?? null,
        businessContext: businessContext ?? null,
        qualifyingParams: qualifyingParams ? JSON.parse(JSON.stringify(qualifyingParams)) : undefined,
      },
    });

    return NextResponse.json(ad, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "An ad with this Form ID already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
