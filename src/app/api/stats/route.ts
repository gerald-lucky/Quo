import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [totalLeads, totalAds, sentCount, failedCount] = await Promise.all([
    prisma.lead.count(),
    prisma.ad.count({ where: { isActive: true } }),
    prisma.lead.count({ where: { messageSent: true } }),
    prisma.lead.count({ where: { messageSent: false, messageError: { not: null } } }),
  ]);

  const recentLeads = await prisma.lead.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { ad: { select: { name: true, campaignName: true } } },
  });

  // Leads per ad
  const leadsPerAd = await prisma.lead.groupBy({
    by: ["adId"],
    _count: { _all: true },
    orderBy: { _count: { adId: "desc" } },
    take: 5,
  });

  const adIds = leadsPerAd.map((l) => l.adId);
  const ads = await prisma.ad.findMany({ where: { id: { in: adIds } }, select: { id: true, name: true } });
  const adMap = Object.fromEntries(ads.map((a) => [a.id, a.name]));

  const topAds = leadsPerAd.map((l) => ({
    adId: l.adId,
    adName: adMap[l.adId] ?? "Unknown",
    count: l._count._all,
  }));

  return NextResponse.json({
    totalLeads,
    totalAds,
    sentCount,
    failedCount,
    recentLeads,
    topAds,
  });
}
