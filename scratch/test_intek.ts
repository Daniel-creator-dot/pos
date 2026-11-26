async function testPayload(name: string, payload: any) {
  const apiKey = process.env.INTEK_SMS_API_KEY || "INTEK_274EC1.a16baf07f5a2aee65c81eb3db7e183eb669439071eaf3b0b";
  console.log(`\nTesting payload [${name}]:`, JSON.stringify(payload));
  
  try {
    const response = await fetch("https://www.inteksms.top/api/v1/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${text}`);
  } catch (error: any) {
    console.error(`Error during [${name}]:`, error.message);
  }
}

async function main() {
  const message = "SwiftPOS Verification Code: 123456";
  const senderName = "Swiftpos";
  const testNumber = "233501602793";
  const testNumberPlus = "+233501602793";

  // Test 1: Original (recipient as string)
  await testPayload("recipient-string", {
    recipient: testNumber,
    message: message,
    sender: senderName
  });

  // Test 2: recipient as array
  await testPayload("recipient-array", {
    recipient: [testNumber],
    message: message,
    sender: senderName
  });

  // Test 3: recipients (plural) as string
  await testPayload("recipients-string", {
    recipients: testNumber,
    message: message,
    sender: senderName
  });

  // Test 4: recipients (plural) as array
  await testPayload("recipients-array", {
    recipients: [testNumber],
    message: message,
    sender: senderName
  });

  // Test 5: recipient with plus sign as string
  await testPayload("recipient-plus-string", {
    recipient: testNumberPlus,
    message: message,
    sender: senderName
  });

  // Test 6: recipients with plus sign as array
  await testPayload("recipients-plus-array", {
    recipients: [testNumberPlus],
    message: message,
    sender: senderName
  });
}

main();
