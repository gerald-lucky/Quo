"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TEMPLATE_VARS = ["{{name}}", "{{ad}}", "{{campaign}}"];

const EXAMPLE_TEMPLATES = [
  "Hi {{name}}, thanks for your interest! We received your request from our {{ad}} campaign. We'll be in touch shortly.",
  "Hey {{name}}! Thanks for filling out our form. A member of our team will contact you within 24 hours.",
  "Hello {{name}}! We got your info from {{ad}}. Expect a call from us soon!",
];

export default function NewAdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    facebookFormId: "",
    facebookAdId: "",
    facebookPageId: "",
    campaignName: "",
    messageTemplate: EXAMPLE_TEMPLATES[0],
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          facebookFormId: form.facebookFormId,
          facebookAdId: form.facebookAdId || undefined,
          facebookPageId: form.facebookPageId || undefined,
          campaignName: form.campaignName || undefined,
          messageTemplate: form.messageTemplate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Something went wrong.");
      } else {
        router.push("/ads");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/ads"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register Ad</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Connect a Facebook Lead Ad form to automatically send SMS via Quo.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ad Identity */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Ad Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Summer Sale 2024"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">A friendly name to identify this ad in your dashboard.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              placeholder="e.g. Q1 Lead Gen"
              value={form.campaignName}
              onChange={(e) => set("campaignName", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </section>

        {/* Facebook IDs */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Facebook IDs</h2>
            <p className="text-xs text-gray-400 mt-1">
              Find these in Meta Business Suite &rarr; Ads Manager or your Lead Form settings.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lead Form ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 1234567890123456"
              value={form.facebookFormId}
              onChange={(e) => set("facebookFormId", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              The ID of the Lead Ad form. This is how the webhook links incoming leads to this ad.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad ID <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 1234567890"
                value={form.facebookAdId}
                onChange={(e) => set("facebookAdId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page ID <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={form.facebookPageId}
                onChange={(e) => set("facebookPageId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Message Template */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">SMS Message Template</h2>
            <p className="text-xs text-gray-400 mt-1">
              This message will be sent to every lead via Quo. Use variables to personalize it.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              {TEMPLATE_VARS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("messageTemplate", form.messageTemplate + v)}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono hover:bg-blue-100 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
            <textarea
              required
              rows={4}
              value={form.messageTemplate}
              onChange={(e) => set("messageTemplate", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Type your message..."
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.messageTemplate.length} characters &middot; Click a variable above to insert it.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Quick templates:</p>
            <div className="space-y-2">
              {EXAMPLE_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => set("messageTemplate", t)}
                  className="w-full text-left text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-lg transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {loading ? "Saving..." : "Register Ad"}
          </button>
          <Link
            href="/ads"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
