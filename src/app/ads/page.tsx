import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DeleteAdButton from "@/components/DeleteAdButton";
import ToggleAdButton from "@/components/ToggleAdButton";

async function getAds() {
  return prisma.ad.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { leads: true } } },
  });
}

export default async function AdsPage() {
  const ads = await getAds();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ads</h1>
          <p className="text-gray-500 mt-1">
            Register your Facebook ads to track leads and trigger SMS.
          </p>
        </div>
        <Link
          href="/ads/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Register Ad
        </Link>
      </div>

      {ads.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            />
          </svg>
          <p className="text-gray-500 font-medium">No ads registered yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            Register your first Facebook ad to start capturing leads.
          </p>
          <Link
            href="/ads/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Register Ad
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="bg-white border border-gray-200 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{ad.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        ad.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {ad.isActive ? "Active" : "Paused"}
                    </span>
                  </div>

                  {ad.campaignName && (
                    <p className="text-sm text-gray-500 mb-3">
                      Campaign: {ad.campaignName}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400 mb-3">
                    <span>
                      <span className="font-medium text-gray-500">Form ID:</span>{" "}
                      <code className="font-mono">{ad.facebookFormId}</code>
                    </span>
                    {ad.facebookAdId && (
                      <span>
                        <span className="font-medium text-gray-500">Ad ID:</span>{" "}
                        <code className="font-mono">{ad.facebookAdId}</code>
                      </span>
                    )}
                    {ad.facebookPageId && (
                      <span>
                        <span className="font-medium text-gray-500">Page ID:</span>{" "}
                        <code className="font-mono">{ad.facebookPageId}</code>
                      </span>
                    )}
                    <span>
                      <span className="font-medium text-gray-500">Leads:</span>{" "}
                      {ad._count.leads}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 italic">
                    &ldquo;{ad.messageTemplate}&rdquo;
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ToggleAdButton id={ad.id} isActive={ad.isActive} />
                  <DeleteAdButton id={ad.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
