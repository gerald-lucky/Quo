"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteAdButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this ad? Leads already captured will remain.")) return;
    setLoading(true);
    await fetch(`/api/ads/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete ad"
      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}
