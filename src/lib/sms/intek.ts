interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an SMS immediately using the Intek SMS Gateway.
 * @param to Recipient phone number (international format e.g., +233XXXXXXXXX or 233XXXXXXXXX)
 * @param message The SMS text content
 * @param senderName The approved sender name registered with Intek (defaults to "Swiftpos")
 */
function formatRecipient(to: string) {
  let formattedRecipient = to.replace(/[\s\-\(\)]/g, "");
  if (formattedRecipient.startsWith("0") && formattedRecipient.length === 10) {
    formattedRecipient = "233" + formattedRecipient.substring(1);
  } else if (formattedRecipient.startsWith("+")) {
    formattedRecipient = formattedRecipient.substring(1);
  }
  return formattedRecipient;
}

async function postIntek(
  apiKey: string,
  recipients: string[],
  message: string,
  senderName: string
): Promise<SendSmsResponse> {
  const response = await fetch("https://www.inteksms.top/api/v1/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipients,
      message,
      sender: senderName,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[IntekSMS] HTTP Error ${response.status}:`, errorText);
    return { success: false, error: `Intek API status ${response.status}: ${errorText}` };
  }

  const data = await response.json();
  console.log("[IntekSMS] API Response:", data);
  if (data.ok === true || data.status === "success" || data.id || data.success || data.code === 200) {
    return { success: true, messageId: String(data.data?.campaign_id || data.id || data.message_id || data.code || "") };
  }
  return { success: false, error: data.message || "Failed to deliver SMS via Intek" };
}

export async function sendIntekSms(
  to: string | string[],
  message: string,
  senderName: string = "Swiftpos",
  apiKeyOverride?: string | null
): Promise<SendSmsResponse> {
  const apiKey = apiKeyOverride || process.env.INTEK_SMS_API_KEY || "INTEK_274EC1.a16baf07f5a2aee65c81eb3db7e183eb669439071eaf3b0b";
  const recipients = Array.from(new Set((Array.isArray(to) ? to : [to]).map(formatRecipient).filter(Boolean)));
  if (recipients.length === 0) {
    return { success: false, error: "No phone numbers to text" };
  }

  try {
    return await postIntek(apiKey, recipients, message, senderName);
  } catch (error: any) {
    console.error("[IntekSMS] Connection Error:", error);
    return { success: false, error: error.message || "SMS connection timeout or network failure" };
  }
}
