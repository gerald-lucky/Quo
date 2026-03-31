/**
 * Normalize a phone number to E.164 format with +1 country code (US).
 * Handles Facebook exports which may include "p:" prefix, spaces, dashes, etc.
 */
export function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  // Strip Facebook's "p:" prefix and any whitespace
  let digits = raw.replace(/^p:/i, "").replace(/\s/g, "");

  // Remove all non-numeric characters except leading +
  const hasPlus = digits.startsWith("+");
  digits = digits.replace(/\D/g, "");

  if (!digits) return undefined;

  // Already has country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // 10-digit US number — add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Has + prefix and reasonable length — trust it
  if (hasPlus && digits.length >= 10) {
    return `+${digits}`;
  }

  // Fallback: prepend +1 and hope for the best
  return `+1${digits}`;
}

/**
 * Facebook Graph API helpers for Lead Ads
 *
 * Configure these environment variables:
 *   FACEBOOK_PAGE_ACCESS_TOKEN  - Long-lived Page Access Token from Meta Business Suite
 *   FACEBOOK_APP_SECRET         - App Secret (used for webhook signature verification)
 *   FACEBOOK_WEBHOOK_VERIFY_TOKEN - A random string you set in the Meta webhook config
 */

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

export interface FacebookLeadField {
  name: string;
  values: string[];
}

export interface FacebookLeadData {
  id: string;
  created_time: string;
  field_data: FacebookLeadField[];
  ad_id?: string;
  form_id?: string;
}

/**
 * Fetch lead data from Facebook Graph API using the lead ID.
 */
export async function fetchLeadData(leadId: string): Promise<FacebookLeadData | null> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error("[Facebook] FACEBOOK_PAGE_ACCESS_TOKEN is not set.");
    return null;
  }

  try {
    const url = new URL(`${GRAPH_API_BASE}/${leadId}`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("fields", "id,created_time,field_data,ad_id,form_id");

    const response = await fetch(url.toString());
    if (!response.ok) {
      const err = await response.text();
      console.error("[Facebook] Failed to fetch lead:", err);
      return null;
    }

    return (await response.json()) as FacebookLeadData;
  } catch (err) {
    console.error("[Facebook] fetchLeadData exception:", err);
    return null;
  }
}

/**
 * Extract a named field value from lead field_data array.
 */
export function extractField(fieldData: FacebookLeadField[], fieldName: string): string | undefined {
  const field = fieldData.find(
    (f) => f.name.toLowerCase() === fieldName.toLowerCase()
  );
  return field?.values?.[0];
}

/**
 * Parse full name from lead data. Facebook may use "full_name" or "first_name"+"last_name".
 */
export function extractName(fieldData: FacebookLeadField[]): string | undefined {
  const fullName = extractField(fieldData, "full_name");
  if (fullName) return fullName;
  const joined = [extractField(fieldData, "first_name"), extractField(fieldData, "last_name")]
    .filter(Boolean)
    .join(" ");
  return joined || undefined;
}

/**
 * Verify Facebook webhook signature (X-Hub-Signature-256 header).
 * Returns true if the signature is valid.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    console.warn("[Facebook] FACEBOOK_APP_SECRET not set — skipping signature verification.");
    return true;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const hexHash = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expected = `sha256=${hexHash}`;
    return expected === signature;
  } catch {
    return false;
  }
}
