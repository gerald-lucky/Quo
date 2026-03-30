import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as Partial<{
      name: string;
      facebookAdId: string;
      facebookPageId: string;
      campaignName: string;
      messageTemplate: string;
      isActive: boolean;
    }>;

    const ad = await prisma.ad.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(ad);
  } catch {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.ad.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }
}
