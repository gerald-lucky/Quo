export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

async function getLeads(adId?: string) {
  const where = adId ? { adId } : {};
  const [leads, ads] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { ad: { select: { id: true, name: true, campaignName: true } } },
    }),
    prisma.ad.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { leads, ads };
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const adId = typeof resolvedParams.adId === "string" ? resolvedParams.adId : undefined;
  const { leads, ads } = await getLeads(adId);

  const sentCount = leads.filter((l) => l.messageSent).length;
  const failedCount = leads.filter((l) => !l.messageSent && l.messageError).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-500 mt-1">All leads captured from your Facebook ads.</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <a
          href="/leads"
          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
            !adId
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All Ads
        </a>
        {ads.map((ad) => (
          <a
            key={ad.id}
            href={`/leads?adId=${ad.id}`}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
              adId === ad.id
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {ad.name}
          </a>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
        <span>
          <strong className="text-gray-900">{leads.length}</strong> leads
        </span>
        <span className="text-green-600">
          <strong>{sentCount}</strong> SMS sent
        </span>
        <span className="text-red-500">
          <strong>{failedCount}</strong> failed
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {leads.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No leads yet. Once someone fills out your Facebook ad form, they will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Phone
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Ad / Campaign
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    SMS
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {lead.name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                      {lead.phone ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {lead.email ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-800">{lead.ad.name}</span>
                      {lead.ad.campaignName && (
                        <span className="text-gray-400 text-xs ml-1">
                          / {lead.ad.campaignName}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {lead.messageSent ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Sent
                        </span>
                      ) : lead.messageError ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium cursor-help"
                          title={lead.messageError}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Failed
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(lead.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
