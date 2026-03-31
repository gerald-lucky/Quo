export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      ad: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!lead) notFound();

  const allMessages = [
    ...(lead.sentMessage
      ? [{ role: "assistant", content: lead.sentMessage, createdAt: lead.messageSentAt ?? lead.createdAt }]
      : []),
    ...lead.messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const statusColor = {
    qualified: "bg-green-50 text-green-700",
    not_qualified: "bg-red-50 text-red-600",
    pending: "bg-yellow-50 text-yellow-700",
    awaiting_callback: "bg-blue-50 text-blue-700",
  }[lead.qualificationStatus ?? "pending"] ?? "bg-gray-100 text-gray-500";

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{lead.name ?? "Unknown"}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor}`}>
              {lead.qualificationStatus === "awaiting_callback" ? "awaiting callback" : (lead.qualificationStatus ?? "pending")}
            </span>
          </div>
          <p className="text-sm text-gray-400">
            {lead.phone} · {lead.ad.name}
            {lead.email && ` · ${lead.email}`}
          </p>
          {lead.callbackTime && (
            <p className="text-sm text-blue-600 mt-1">
              Callback: {lead.callbackTime}
              {lead.asanaTaskId && (
                <a
                  href={`https://app.asana.com/search?q=${encodeURIComponent(lead.name ?? "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-purple-600 hover:underline"
                >
                  View in Asana
                </a>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Conversation</h2>
          <p className="text-xs text-gray-400 mt-0.5">{allMessages.length} messages</p>
        </div>

        <div className="p-5 space-y-4">
          {allMessages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No messages yet.</p>
          ) : (
            allMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "assistant" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === "assistant"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.role === "assistant" ? "text-blue-200" : "text-gray-400"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
