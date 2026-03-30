export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getStats() {
  const [totalLeads, totalAds, sentCount, failedCount, recentLeads, leadsPerAd] =
    await Promise.all([
      prisma.lead.count(),
      prisma.ad.count({ where: { isActive: true } }),
      prisma.lead.count({ where: { messageSent: true } }),
      prisma.lead.count({
        where: { messageSent: false, messageError: { not: null } },
      }),
      prisma.lead.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { ad: { select: { name: true, campaignName: true } } },
      }),
      prisma.lead.groupBy({
        by: ["adId"],
        _count: { _all: true },
        orderBy: { _count: { adId: "desc" } },
        take: 5,
      }),
    ]);

  const adIds = leadsPerAd.map((l) => l.adId);
  const ads = await prisma.ad.findMany({
    where: { id: { in: adIds } },
    select: { id: true, name: true },
  });
  const adMap = Object.fromEntries(ads.map((a) => [a.id, a.name]));
  const topAds = leadsPerAd.map((l) => ({
    adId: l.adId,
    adName: adMap[l.adId] ?? "Unknown",
    count: l._count._all,
  }));

  return { totalLeads, totalAds, sentCount, failedCount, recentLeads, topAds };
}

export default async function DashboardPage() {
  const { totalLeads, totalAds, sentCount, failedCount, recentLeads, topAds } =
    await getStats();

  const deliveryRate =
    totalLeads > 0 ? Math.round((sentCount / totalLeads) * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of your Facebook lead campaigns and SMS delivery.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Leads" value={totalLeads} color="blue" />
        <StatCard label="Active Ads" value={totalAds} color="green" />
        <StatCard
          label="SMS Sent"
          value={`${sentCount} (${deliveryRate}%)`}
          color="purple"
        />
        <StatCard label="Failed" value={failedCount} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Leads</h2>
            <Link
              href="/leads"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLeads.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">
                No leads yet. They will appear here once your Facebook ad gets
                submissions.
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {lead.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {lead.phone ?? lead.email ?? "No contact info"} &middot;{" "}
                      {lead.ad.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        lead.messageSent
                          ? "bg-green-50 text-green-700"
                          : lead.messageError
                          ? "bg-red-50 text-red-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {lead.messageSent
                        ? "Sent"
                        : lead.messageError
                        ? "Failed"
                        : "Pending"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Ads */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Leads by Ad</h2>
          </div>
          <div className="p-5 space-y-3">
            {topAds.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No data yet.
              </p>
            ) : (
              topAds.map((item) => (
                <div key={item.adId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 truncate max-w-[160px]">
                      {item.adName}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((item.count / (topAds[0]?.count || 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "blue" | "green" | "purple" | "red";
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color].split(" ")[1]}`}>
        {value}
      </p>
    </div>
  );
}
