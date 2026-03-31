/**
 * OpenPhone SMS Integration
 *
 * Configure these environment variables:
 *   QUO_API_URL        - https://api.openphone.com/v1
 *   QUO_API_KEY        - Your OpenPhone API key
 *   OPENPHONE_FROM     - Your OpenPhone phone number (e.g. +12345678901)
 */

export interface QuoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(to: string, message: string): Promise<QuoSendResult> {
  const apiUrl = process.env.QUO_API_URL;
  const apiKey = process.env.QUO_API_KEY;
  const fromNumber = process.env.OPENPHONE_FROM;

  if (!apiUrl || !apiKey) {
    console.error("[OpenPhone] QUO_API_URL or QUO_API_KEY is not configured.");
    return { success: false, error: "Quo API not configured" };
  }

  if (!fromNumber) {
    console.error("[OpenPhone] OPENPHONE_FROM is not configured.");
    return { success: false, error: "OpenPhone sender number not configured" };
  }

  // Normalize phone to E.164 format
  const normalizedPhone = to.startsWith("+") ? to : `+${to}`;

  try {
    const response = await fetch(`${apiUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        content: message,
        from: fromNumber,
        to: [normalizedPhone],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = data as { message?: string; error?: string };
      const errorMsg = err.message ?? err.error ?? `HTTP ${response.status}`;
      console.error("[OpenPhone] SMS send failed:", errorMsg);
      return { success: false, error: errorMsg };
    }

    const result = data as { data?: { id?: string } };
    return { success: true, messageId: result.data?.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[OpenPhone] SMS send exception:", error);
    return { success: false, error };
  }
}
