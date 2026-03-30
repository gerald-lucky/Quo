"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ToggleAdButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await fetch(`/api/ads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={isActive ? "Pause ad" : "Activate ad"}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        isActive
          ? "text-green-600 hover:bg-green-50"
          : "text-gray-400 hover:bg-gray-100"
      }`}
    >
      {isActive ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </button>
  );
}
