/**
 * WhatsApp Business API client
 * Handles all WhatsApp API interactions
 */

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const BASE_URL = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}`;

export interface WhatsAppMessage {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  to: string;
  type: "text" | "template" | "location" | "interactive";
  text?: {
    preview_url?: boolean;
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
  location?: {
    latitude: string | number;
    longitude: string | number;
    name?: string;
    address?: string;
  };
  interactive?: any;
}

export async function sendWhatsAppMessage(message: WhatsAppMessage) {
  try {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("WhatsApp API error:", error);
      throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
}

export async function sendTextMessage(to: string, text: string) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: true,
      body: text,
    },
  });
}

export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string = "ar",
  components?: any[]
) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  });
}

export async function sendLocation(
  to: string,
  latitude: number | string,
  longitude: number | string,
  name?: string,
  address?: string
) {
  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    to,
    type: "location",
    location: {
      latitude,
      longitude,
      name,
      address,
    },
  });
}

export async function sendTypingIndicator(to: string) {
  try {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "typing",
      }),
    });

    if (!response.ok) {
      console.error("Failed to send typing indicator");
    }
  } catch (error) {
    console.error("Error sending typing indicator:", error);
  }
}

export async function markMessageAsRead(messageId: string) {
  try {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to mark message as read");
    }
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
}
