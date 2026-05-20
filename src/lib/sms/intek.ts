interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an SMS immediately using the Intek SMS Gateway.
 * @param to Recipient phone number (international format e.g., +233XXXXXXXXX or 233XXXXXXXXX)
 * @param message The SMS text content
 */
export async function sendIntekSms(to: string, message: string): Promise<SendSmsResponse> {
  const apiKey = process.env.INTEK_SMS_API_KEY || "INTEK_7C48EA.d4a1425f4c8df82048d0bcef598e8e6965d0d73df5ce6562";
  
  // Format the recipient phone number: ensure it does not contain spaces or hyphens
  let formattedRecipient = to.replace(/[\s\-\(\)]/g, "");
  
  // Simple check: if phone number starts with '0' and is 10 digits (common for local Ghana numbers e.g. 024xxxxxxx),
  // convert it to international format with country code 233 if no country code is supplied.
  if (formattedRecipient.startsWith("0") && formattedRecipient.length === 10) {
    formattedRecipient = "233" + formattedRecipient.substring(1);
  } else if (formattedRecipient.startsWith("+")) {
    formattedRecipient = formattedRecipient.substring(1);
  }

  try {
    const response = await fetch("https://www.inteksms.top/api/v1/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        recipient: formattedRecipient,
        message: message,
        sender_id: "POS_ALERT" // Approved Sender ID or configured default
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[IntekSMS] HTTP Error ${response.status}:`, errorText);
      return { success: false, error: `Intek API status ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    console.log("[IntekSMS] API Response:", data);

    // According to Intek API, look for success response indicators
    if (data.status === "success" || data.id || data.success || data.code === 200) {
      return { success: true, messageId: data.id || data.message_id || String(data.code) };
    }

    return { success: false, error: data.message || "Failed to deliver SMS via Intek" };
  } catch (error: any) {
    console.error("[IntekSMS] Connection Error:", error);
    return { success: false, error: error.message || "SMS connection timeout or network failure" };
  }
}
