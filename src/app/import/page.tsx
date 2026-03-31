"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface ParsedLead {
  name?: string;
  phone: string;
  email?: string;
}

interface ImportResult {
  name?: string;
  phone: string;
  messageSent: boolean;
  message: string;
  error?: string;
}

function normalizePhone(raw: string): string {
  let digits = raw.replace(/^p:/i, "").replace(/\s/g, "");
  const hasPlus = digits.startsWith("+");
  digits = digits.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (hasPlus && digits.length >= 10) return `+${digits}`;
  return `+1${digits}`;
}

function parseCSV(text: string): ParsedLead[] {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Support both quoted and unquoted CSV headers
  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));

  // Accept Facebook export column names (FULL_NAME, EMAIL, PHONE) and generic names
  const nameIdx = headers.findIndex((h) => h === "fullname" || h.includes("name"));
  const phoneIdx = headers.findIndex((h) => h === "phone" || h.includes("phone") || h.includes("mobile"));
  const emailIdx = headers.findIndex((h) => h === "email" || h.includes("email"));

  if (phoneIdx === -1) return [];

  return lines.slice(1).map((line) => {
    // Handle quoted fields that may contain commas
    const cols = line.match(/("([^"]*)"|[^,]*)/g)?.map((c) =>
      c.trim().replace(/^"|"$/g, "")
    ) ?? line.split(",").map((c) => c.trim());

    const rawPhone = cols[phoneIdx] ?? "";
    return {
      name: nameIdx >= 0 ? (cols[nameIdx] || undefined) : undefined,
      phone: rawPhone ? normalizePhone(rawPhone) : rawPhone,
      email: emailIdx >= 0 ? (cols[emailIdx] || undefined) : undefined,
    };
  }).filter((r) => r.phone);
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ads, setAds] = useState<{ id: string; name: string }[]>([]);
  const [adId, setAdId] = useState("");
  const [leads, setLeads] = useState<ParsedLead[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState("");
  const [adsLoaded, setAdsLoaded] = useState(false);

  async function loadAds() {
    if (adsLoaded) return;
    const res = await fetch("/api/ads");
    const data = await res.json() as { id: string; name: string }[];
    setAds(data);
    if (data.length > 0) setAdId(data[0].id);
    setAdsLoaded(true);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setLeads(parsed);
      setResults([]);
      setError("");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!adId || leads.length === 0) return;
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId, leads }),
      });
      const data = await res.json() as { results?: ImportResult[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setResults(data.results ?? []);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const sentCount = results.filter((r) => r.messageSent).length;
  const failedCount = results.filter((r) => !r.messageSent).length;

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Leads from CSV</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Upload a CSV from Google Sheets to test the full SMS flow.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">CSV format:</p>
          <p>Accepts Facebook Lead Ads exports directly (<code className="bg-blue-100 px-1 rounded">FULL_NAME</code>, <code className="bg-blue-100 px-1 rounded">PHONE</code>, <code className="bg-blue-100 px-1 rounded">EMAIL</code>) or generic columns (<code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">phone</code>). Phone numbers are automatically formatted to +1.</p>
        </div>

        {/* Select Ad */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Select Ad</h2>
          <select
            value={adId}
            onFocus={loadAds}
            onChange={(e) => setAdId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ads.length === 0 && <option value="">Click to load ads...</option>}
            {ads.map((ad) => (
              <option key={ad.id} value={ad.id}>{ad.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400">
            Claude will use this ad&apos;s qualifying parameters to generate each message.
          </p>
        </div>

        {/* Upload CSV */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Upload CSV</h2>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {fileName ? (
              <p className="text-sm font-medium text-blue-700">{fileName}</p>
            ) : (
              <p className="text-sm text-gray-500">Click to upload CSV file</p>
            )}
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>

          {leads.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">{leads.length} leads detected:</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {leads.slice(0, 20).map((lead, i) => (
                  <div key={i} className="text-xs text-gray-600 flex gap-3">
                    <span className="font-medium w-32 truncate">{lead.name ?? "—"}</span>
                    <span className="font-mono">{lead.phone}</span>
                    {lead.email && <span className="text-gray-400 truncate">{lead.email}</span>}
                  </div>
                ))}
                {leads.length > 20 && (
                  <p className="text-xs text-gray-400">...and {leads.length - 20} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || leads.length === 0 || !adId}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading
            ? `Sending messages... (this may take a moment)`
            : `Send SMS to ${leads.length} lead${leads.length !== 1 ? "s" : ""}`}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
              <h2 className="font-semibold text-gray-900">Results</h2>
              <span className="text-sm text-green-600 font-medium">{sentCount} sent</span>
              {failedCount > 0 && (
                <span className="text-sm text-red-500 font-medium">{failedCount} failed</span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {results.map((r, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{r.name ?? "—"}</span>
                      <span className="text-xs text-gray-400 font-mono">{r.phone}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.messageSent ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    }`}>
                      {r.messageSent ? "Sent" : "Failed"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 italic">&ldquo;{r.message}&rdquo;</p>
                  {r.error && <p className="text-xs text-red-500 mt-0.5">{r.error}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
