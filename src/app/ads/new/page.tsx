"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewAdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");

  const [form, setForm] = useState({
    name: "",
    facebookFormId: "",
    facebookAdId: "",
    facebookPageId: "",
    campaignName: "",
    businessContext: "",
    // qualifying params
    monthlyBudget: false,
    moveInDate: false,
    rentOrBuy: false,
    customQuestions: [] as string[],
  });

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addCustomQuestion() {
    const q = customQuestion.trim();
    if (!q) return;
    setForm((f) => ({ ...f, customQuestions: [...f.customQuestions, q] }));
    setCustomQuestion("");
  }

  function removeCustomQuestion(i: number) {
    setForm((f) => ({
      ...f,
      customQuestions: f.customQuestions.filter((_, idx) => idx !== i),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const hasQualifier =
      form.monthlyBudget ||
      form.moveInDate ||
      form.rentOrBuy ||
      form.customQuestions.length > 0;

    if (!hasQualifier) {
      setError("Add at least one qualifying parameter so the AI knows what to ask.");
      setLoading(false);
      return;
    }

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
          businessContext: form.businessContext || undefined,
          qualifyingParams: {
            monthlyBudget: form.monthlyBudget,
            moveInDate: form.moveInDate,
            rentOrBuy: form.rentOrBuy,
            customQuestions: form.customQuestions,
          },
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
        <Link href="/ads" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register Ad</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Claude AI will generate a personalized qualifying message for each lead.
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
              placeholder="e.g. Miami Apartments Q2"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              placeholder="e.g. Q2 Lead Gen"
              value={form.campaignName}
              onChange={(e) => set("campaignName", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Facebook IDs */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Facebook IDs</h2>
            <p className="text-xs text-gray-400 mt-1">Found in Meta Business Suite → Ads Manager → your Lead Form.</p>
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad ID <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. 1234567890"
                value={form.facebookAdId}
                onChange={(e) => set("facebookAdId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page ID <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={form.facebookPageId}
                onChange={(e) => set("facebookPageId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Business Context */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Business Context</h2>
            <p className="text-xs text-gray-400 mt-1">
              Tell the AI what your business does so it can craft a relevant message.
            </p>
          </div>
          <textarea
            rows={3}
            placeholder="e.g. We help people find rental apartments in Miami. We offer furnished and unfurnished units from $1,500/month."
            value={form.businessContext}
            onChange={(e) => set("businessContext", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </section>

        {/* Qualifying Parameters */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Qualifying Parameters</h2>
            <p className="text-xs text-gray-400 mt-1">
              The AI will pick one of these to ask the lead. Select all that apply to this ad.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.monthlyBudget}
                onChange={(e) => set("monthlyBudget", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Monthly Budget</p>
                <p className="text-xs text-gray-400">Ask the lead what their monthly budget is</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.moveInDate}
                onChange={(e) => set("moveInDate", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Expected Move-in Date</p>
                <p className="text-xs text-gray-400">Ask when they are expecting to move</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.rentOrBuy}
                onChange={(e) => set("rentOrBuy", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Rent or Buy</p>
                <p className="text-xs text-gray-400">Ask whether they want to rent or buy</p>
              </div>
            </label>
          </div>

          {/* Custom questions */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Custom Qualifying Questions</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="e.g. How many bedrooms do you need?"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomQuestion())}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addCustomQuestion}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            {form.customQuestions.length > 0 && (
              <div className="space-y-2">
                {form.customQuestions.map((q, i) => (
                  <div key={i} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                    <span className="text-sm text-blue-800">{q}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomQuestion(i)}
                      className="text-blue-400 hover:text-red-500 transition-colors ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <Link href="/ads" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
