/**
 * Quo SMS API Integration
 *
 * Configure these environment variables:
 *   QUO_API_URL   - Base URL of the Quo API (e.g. https://api.quo.com/v1)
 *   QUO_API_KEY   - Your Quo API key
 *
 * Adjust the request shape below once you have Quo's API documentation.
 */

export interface QuoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(to: string, message: string): Promise<QuoSendResult> {
  const apiUrl = process.env.QUO_API_URL;
  const apiKey = process.env.QUO_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("[Quo] QUO_API_URL or QUO_API_KEY is not configured.");
    return { success: false, error: "Quo API not configured" };
  }

  // Normalize phone: ensure it starts with + for E.164 format
  const normalizedPhone = to.startsWith("+") ? to : `+${to}`;

  try {
    const response = await fetch(`${apiUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: normalizedPhone,
        message,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = (data as { error?: string; message?: string }).error
        ?? (data as { message?: string }).message
        ?? `HTTP ${response.status}`;
      console.error("[Quo] SMS send failed:", errorMsg);
      return { success: false, error: errorMsg };
    }

    const result = data as { id?: string; messageId?: string };
    return { success: true, messageId: result.id ?? result.messageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[Quo] SMS send exception:", error);
    return { success: false, error };
  }
}
